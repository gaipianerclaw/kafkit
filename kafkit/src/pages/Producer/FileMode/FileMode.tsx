import { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { FileUploadZone } from './FileUploadZone';
import { FilePreview } from './FilePreview';
import { ColumnMapping } from './ColumnMapping';
import { StrategyConfig } from './StrategyConfig';
import { ProgressPanel } from './ProgressPanel';
import { FileFormat, ParsedMessage, ColumnMapping as ColumnMappingType, SendingStrategy } from './types';
import { detectFormat } from './fileParser';
import {
  getFileInfo,
  readFilePreview,
  createFileMessageGenerator,
  parseCsvHeaders,
  estimateLineCount,
} from './streamFileParser';

// 检测是否在 Tauri 环境中
const isTauri = () => {
  return typeof window !== 'undefined' && !!(window as any).__TAURI__;
};

// 动态导入服务
const getService = async () => {
  if (isTauri()) {
    return import('../../../services/tauriService');
  } else {
    return import('../../../services/mockTauriService');
  }
};

interface FileModeProps {
  connection: string;
  topic: string;
}

export function FileMode({ connection, topic }: FileModeProps) {
  const { t } = useTranslation();
  
  // File state
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<FileFormat>('auto');
  const [detectedFormat, setDetectedFormat] = useState<FileFormat | null>(null);
  const [messages, setMessages] = useState<ParsedMessage[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [fileInfo, setFileInfo] = useState<{ sizeFormatted: string; isLarge: boolean } | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  
  // Column mapping state (for CSV)
  const [columnMapping, setColumnMapping] = useState<ColumnMappingType>({
    keyColumn: '',
    valueColumn: '',
    headerColumn: '',
    partitionColumn: '',
    useFilePartition: false, // 默认不按照文件中的 partition 发送
  });
  const [headers, setHeaders] = useState<string[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]); // Store CSV headers for row parsing
  
  // Strategy state
  const [strategy, setStrategy] = useState<SendingStrategy>({
    type: 'immediate',
    config: {},
  });
  
  // Compression state
  const [compression, setCompression] = useState<'none' | 'gzip' | 'snappy' | 'lz4' | 'zstd'>('none');
  
  // Progress state
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState({
    total: 0,
    sent: 0,
    failed: 0,
    current: 0,
  });
  const [sendError, setSendError] = useState<string | null>(null);
  
  const abortRef = useRef(false);

  const handleFileSelect = useCallback(async (selectedFile: File, selectedFormat: FileFormat) => {
    setFile(selectedFile);
    setFormat(selectedFormat);
    setMessages([]);
    setValidationErrors([]);
    setHeaders([]);
    setCsvHeaders([]);
    setColumnMapping({ keyColumn: '', valueColumn: '', headerColumn: '', partitionColumn: '', useFilePartition: false });
    setIsParsing(true);
    
    try {
      // Get file info
      const info = getFileInfo(selectedFile);
      setFileInfo(info);
      
      // Detect format if auto - read first 1KB for detection
      const detectionChunk = selectedFile.slice(0, 1024);
      const detectionText = await readChunkAsText(detectionChunk);
      const fmt = selectedFormat === 'auto' 
        ? detectFormat(selectedFile.name, detectionText)
        : selectedFormat;
      setDetectedFormat(fmt);
      
      // Read preview (first 100 lines only)
      const preview = await readFilePreview(selectedFile, fmt);
      
      setMessages(preview.messages.slice(0, 10)); // Show first 10 in UI
      setValidationErrors(preview.errors);
      
      // Estimate total lines
      const estimatedTotal = await estimateLineCount(selectedFile);
      setTotalCount(estimatedTotal);
      
      // Handle CSV headers
      if (fmt === 'csv') {
        const firstChunk = selectedFile.slice(0, 4096); // Read first 4KB for headers
        const firstText = await readChunkAsText(firstChunk);
        const firstLine = firstText.split('\n')[0];
        if (firstLine) {
          const csvHeaders = parseCsvHeaders(firstLine);
          setCsvHeaders(csvHeaders);
          setHeaders(csvHeaders);
          // Auto-detect key/value columns
          const keyCol = csvHeaders.find(h => h.toLowerCase().includes('key')) || csvHeaders[0];
          const valueCol = csvHeaders.find(h => h.toLowerCase().includes('value')) || csvHeaders[1] || csvHeaders[0];
          setColumnMapping(prev => ({
            ...prev,
            keyColumn: keyCol,
            valueColumn: valueCol,
          }));
        }
      }
    } catch (error) {
      setValidationErrors([t('producer.fileMode.errors.parseFailed', { error: String(error) })]);
    } finally {
      setIsParsing(false);
    }
  }, [t]);

  const handleClear = useCallback(() => {
    setFile(null);
    setFormat('auto');
    setDetectedFormat(null);
    setMessages([]);
    setValidationErrors([]);
    setTotalCount(0);
    setFileInfo(null);
    setHeaders([]);
    setCsvHeaders([]);
    setColumnMapping({ keyColumn: '', valueColumn: '', headerColumn: '', partitionColumn: '', useFilePartition: false });
    setProgress({ total: 0, sent: 0, failed: 0, current: 0 });
    setSendError(null);
    abortRef.current = false;
  }, []);

  const handleSend = useCallback(async (startFrom: number = 0) => {
    if (!file) return;
    
    setIsSending(true);
    setSendError(null);
    abortRef.current = false;
    
    try {
      const tauriService = await getService();
      const fmt = detectedFormat || format;
      
      // 如果是从头开始，重置进度并估算总数
      if (startFrom === 0) {
        const estimatedTotal = await estimateLineCount(file);
        setProgress({ total: estimatedTotal, sent: 0, failed: 0, current: 0 });
      }
      
      let processedCount = 0;
      let sentCount = 0;
      let failedCount = 0;
      
      // Create message generator for streaming processing
      const generator = createFileMessageGenerator(file, fmt === 'auto' ? 'jsonl' : fmt, (current) => {
        // Update progress periodically
        if (current % 100 === 0) {
          setProgress(p => ({ ...p, current: startFrom + current }));
        }
      });
      
      // Skip to start position
      for (let i = 0; i < startFrom; i++) {
        await generator.next();
        processedCount++;
      }
      
      // Apply strategy
      if (strategy.type === 'immediate') {
        // Send all immediately
        for await (const msg of generator) {
          if (abortRef.current) break;
          
          const record = buildRecord(msg, columnMapping, compression);
          
          try {
            await tauriService.produceMessage(connection, topic, record);
            sentCount++;
          } catch (error) {
            failedCount++;
          }
          
          processedCount++;
          if (processedCount % 100 === 0) {
            const currentPos = startFrom + processedCount;
            setProgress(p => ({ 
              ...p, 
              total: Math.max(p.total, currentPos), // Update total if exceeded
              sent: startFrom + sentCount, 
              failed: failedCount,
              current: currentPos 
            }));
          }
        }
      } else if (strategy.type === 'tps') {
        // TPS-controlled sending
        const tps = strategy.config.tps || 10;
        const intervalMs = 1000 / tps;
        
        for await (const msg of generator) {
          if (abortRef.current) break;
          
          const record = buildRecord(msg, columnMapping, compression);
          
          const startTime = Date.now();
          try {
            await tauriService.produceMessage(connection, topic, record);
            sentCount++;
          } catch (error) {
            failedCount++;
          }
          
          processedCount++;
          
          const elapsed = Date.now() - startTime;
          const waitTime = Math.max(0, intervalMs - elapsed);
          if (waitTime > 0) {
            await sleep(waitTime);
          }
          
          if (processedCount % 100 === 0) {
            const currentPos = startFrom + processedCount;
            setProgress(p => ({ 
              ...p, 
              total: Math.max(p.total, currentPos),
              sent: startFrom + sentCount, 
              failed: failedCount,
              current: currentPos 
            }));
          }
        }
      } else if (strategy.type === 'interval') {
        // Fixed interval
        const intervalMs = (strategy.config.intervalSeconds || 1) * 1000;
        let isFirst = true;
        
        for await (const msg of generator) {
          if (abortRef.current) break;
          if (!isFirst) await sleep(intervalMs);
          isFirst = false;
          
          const record = buildRecord(msg, columnMapping, compression);
          
          try {
            await tauriService.produceMessage(connection, topic, record);
            sentCount++;
          } catch (error) {
            failedCount++;
          }
          
          processedCount++;
          if (processedCount % 100 === 0) {
            const currentPos = startFrom + processedCount;
            setProgress(p => ({ 
              ...p, 
              total: Math.max(p.total, currentPos),
              sent: startFrom + sentCount, 
              failed: failedCount,
              current: currentPos 
            }));
          }
        }
      }
      
      // Final progress update - ensure total reflects actual count
      const finalTotal = startFrom + processedCount;
      setProgress({ 
        total: finalTotal, // Update total to actual count
        sent: startFrom + sentCount, 
        failed: failedCount,
        current: finalTotal 
      });
      
    } catch (error) {
      setSendError(String(error));
    } finally {
      setIsSending(false);
    }
  }, [file, detectedFormat, format, columnMapping, compression, strategy, connection, topic, csvHeaders]);

  const handleCancel = useCallback(() => {
    abortRef.current = true;
  }, []);

  const showMapping = detectedFormat === 'csv' && headers.length > 0;
  const canSend = file && messages.length > 0 && !isSending && !isParsing && validationErrors.length === 0;

  return (
    <div className="space-y-6 bg-background relative">
      {/* File Upload */}
      <section className="bg-background border border-border rounded-lg p-6 relative z-10">
        <h3 className="text-lg font-medium mb-4">{t('producer.fileMode.upload.title')}</h3>
        <FileUploadZone
          file={file}
          format={format}
          detectedFormat={detectedFormat}
          onFileSelect={handleFileSelect}
          onClear={handleClear}
          disabled={isSending}
        />
        {fileInfo && (
          <div className="mt-4 text-sm text-muted-foreground">
            <span>{t('producer.fileMode.fileSize')}: {fileInfo.sizeFormatted}</span>
            {fileInfo.isLarge && (
              <span className="ml-2 text-warning">
                ({t('producer.fileMode.largeFileWarning')})
              </span>
            )}
          </div>
        )}
        {isParsing && (
          <div className="mt-4 text-sm text-muted-foreground">
            {t('producer.fileMode.parsing')}...
          </div>
        )}
        {!isParsing && validationErrors.length > 0 && (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-md">
            <p className="text-sm text-destructive font-medium">{t('producer.fileMode.errors.parseFailedTitle')}</p>
            <ul className="text-sm text-destructive/80 mt-1">
              {validationErrors.slice(0, 3).map((err, i) => (
                <li key={i}>• {err}</li>
              ))}
              {validationErrors.length > 3 && (
                <li>... {t('producer.fileMode.errors.moreErrors', { count: validationErrors.length - 3 })}</li>
              )}
            </ul>
          </div>
        )}
      </section>

      {/* Column Mapping (CSV only) */}
      {showMapping && (
        <section className="bg-background border border-border rounded-lg p-6 relative z-10">
          <h3 className="text-lg font-medium mb-4">{t('producer.fileMode.mapping.title')}</h3>
          <ColumnMapping
            headers={headers}
            mapping={columnMapping}
            onChange={setColumnMapping}
            disabled={isSending}
          />
        </section>
      )}

      {/* Preview */}
      {messages.length > 0 && (
        <section className="bg-background border border-border rounded-lg p-6 relative z-10">
          <h3 className="text-lg font-medium mb-4">{t('producer.fileMode.preview.title')}</h3>
          <FilePreview
            messages={messages}
            totalCount={totalCount || '?'}
            errors={validationErrors}
            format={detectedFormat || format}
          />
          {totalCount > 10 && (
            <p className="text-xs text-muted-foreground mt-2">
              {t('producer.fileMode.preview.showing', { count: 10, total: totalCount })}
            </p>
          )}
        </section>
      )}

      {/* Partition Config - 对所有格式显示 */}
      {messages.length > 0 && (
        <section className="bg-background border border-border rounded-lg p-6 relative z-10">
          <h3 className="text-lg font-medium mb-4">{t('producer.fileMode.partition.title')}</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={columnMapping.useFilePartition}
                onChange={(e) => setColumnMapping({ ...columnMapping, useFilePartition: e.target.checked })}
                disabled={isSending}
                className="w-4 h-4 rounded border-input text-primary focus:ring-ring"
              />
              <span className="text-sm font-medium">
                {t('producer.fileMode.partition.useFilePartition')}
              </span>
            </label>
            <p className="text-xs text-muted-foreground ml-7">
              {t('producer.fileMode.partition.useFilePartitionHint')}
            </p>
            
            {/* CSV 格式时显示列选择 */}
            {showMapping && (
              <div className="mt-4 pt-4 border-t border-border">
                <label className="text-sm font-medium block mb-2">
                  {t('producer.fileMode.partition.column')}
                </label>
                <select
                  value={columnMapping.partitionColumn}
                  onChange={(e) => setColumnMapping({ ...columnMapping, partitionColumn: e.target.value })}
                  disabled={isSending}
                  className="w-full max-w-xs px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">{t('producer.fileMode.mapping.auto')}</option>
                  {headers.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Strategy Config */}
      {messages.length > 0 && (
        <section className="bg-background border border-border rounded-lg p-6 relative z-10">
          <h3 className="text-lg font-medium mb-4">{t('producer.fileMode.strategy.title')}</h3>
          <StrategyConfig
            strategy={strategy}
            onChange={setStrategy}
            disabled={isSending}
          />
        </section>
      )}

      {/* Compression Config */}
      {messages.length > 0 && (
        <section className="bg-background border border-border rounded-lg p-6 relative z-10">
          <h3 className="text-lg font-medium mb-4">{t('producer.fileMode.compression.title')}</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-5 gap-2">
              {(['none', 'gzip', 'snappy', 'lz4', 'zstd'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setCompression(type)}
                  disabled={isSending}
                  className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                    compression === type
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-muted border-border'
                  } ${isSending ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {t(`producer.fileMode.compression.${type}`)}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('producer.fileMode.compression.hint')}
            </p>
          </div>
        </section>
      )}

      {/* Progress */}
      {progress.total > 0 && (
        <section className="bg-background border border-border rounded-lg p-6 relative z-10">
          <h3 className="text-lg font-medium mb-4">{t('producer.fileMode.progress.title')}</h3>
          <ProgressPanel
            progress={progress}
            error={sendError}
            isActive={isSending}
            onCancel={handleCancel}
          />
        </section>
      )}

      {/* Send Button */}
      {messages.length > 0 && progress.total === 0 && (
        <div className="flex justify-end">
          <button
            onClick={() => handleSend(0)}
            disabled={!canSend}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('producer.fileMode.send')}
          </button>
        </div>
      )}

      {/* Continue / Resend Buttons - 发送暂停或完成后显示 */}
      {messages.length > 0 && progress.total > 0 && !isSending && progress.current < progress.total && (
        <div className="flex justify-end gap-3">
          <button
            onClick={() => handleSend(progress.current)}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            {t('producer.fileMode.continue')}
          </button>
          <button
            onClick={() => handleSend(0)}
            className="px-6 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
          >
            {t('producer.fileMode.resend')}
          </button>
        </div>
      )}

      {/* Resend Button Only - 发送完成后只显示重新发送 */}
      {messages.length > 0 && progress.total > 0 && !isSending && progress.current >= progress.total && (
        <div className="flex justify-end gap-3">
          <button
            onClick={() => handleSend(0)}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            {t('producer.fileMode.resend')}
          </button>
        </div>
      )}
    </div>
  );
}

function buildRecord(
  msg: ParsedMessage, 
  mapping: ColumnMappingType,
  compression: 'none' | 'gzip' | 'snappy' | 'lz4' | 'zstd'
): {
  partition?: number;
  key?: string;
  value: string;
  headers?: Record<string, string>;
  compression?: 'gzip' | 'snappy' | 'lz4' | 'zstd';
} {
  // Determine partition: only use file partition if explicitly enabled
  const partition = mapping.useFilePartition 
    ? (msg.partition ?? (mapping.partitionColumn && msg._raw?.[mapping.partitionColumn] 
        ? parseInt(msg._raw[mapping.partitionColumn], 10) 
        : undefined))
    : undefined;

  // Build base record
  let key: string | undefined;
  let value: string;
  let headers: Record<string, string> | undefined;

  // If message has direct key/value fields, use them
  if (msg.key !== undefined || msg.value !== undefined) {
    key = msg.key;
    value = typeof msg.value === 'object' ? JSON.stringify(msg.value) : String(msg.value);
    headers = msg.headers;
  } else {
    // Otherwise, use column mapping for CSV-style data
    const data = msg._raw || {};
    key = mapping.keyColumn ? data[mapping.keyColumn] : undefined;
    value = mapping.valueColumn ? data[mapping.valueColumn] : JSON.stringify(data);
    headers = mapping.headerColumn && data[mapping.headerColumn] 
      ? safeParseJson(data[mapping.headerColumn]) 
      : undefined;
  }

  // Build final record with compression
  const record: {
    partition?: number;
    key?: string;
    value: string;
    headers?: Record<string, string>;
    compression?: 'gzip' | 'snappy' | 'lz4' | 'zstd';
  } = { partition, key, value, headers };

  // Only add compression if not 'none'
  if (compression !== 'none') {
    record.compression = compression;
  }

  return record;
}

function safeParseJson(str: string): Record<string, string> | undefined {
  try {
    return JSON.parse(str);
  } catch {
    return undefined;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper function to read a chunk as text
function readChunkAsText(chunk: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(chunk);
  });
}
