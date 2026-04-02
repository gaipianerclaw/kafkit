import { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { FileUploadZone } from './FileUploadZone';
import { FilePreview } from './FilePreview';
import { ColumnMapping } from './ColumnMapping';
import { StrategyConfig } from './StrategyConfig';
import { ValueTimestampMapper } from './ValueTimestampMapper';
import { ProgressPanel } from './ProgressPanel';
import { FileFormat, ParsedMessage, ColumnMapping as ColumnMappingType, SendingStrategy, ValueTimestampConfig } from './types';
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
    partitionStrategy: 'key-hash', // 默认基于 key hash 分区
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
  
  // Value timestamp config state
  const [valueTimestampConfig, setValueTimestampConfig] = useState<ValueTimestampConfig>({
    enabled: false,
    fieldPath: '',
    format: 'unknown',
    mode: 'file',
  });
  
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
    setColumnMapping({ keyColumn: '', valueColumn: '', headerColumn: '', partitionColumn: '', useFilePartition: false, partitionStrategy: 'key-hash' });
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
    setColumnMapping({ keyColumn: '', valueColumn: '', headerColumn: '', partitionColumn: '', useFilePartition: false, partitionStrategy: 'key-hash' });
    setValueTimestampConfig({ enabled: false, fieldPath: '', format: 'unknown', mode: 'file' });
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
          
          const record = buildRecord(msg, columnMapping, compression, valueTimestampConfig, csvHeaders);
          
          try {
            await tauriService.produceMessage(connection, topic, record);
            sentCount++;
          } catch (error) {
            failedCount++;
            console.error('[FileMode] Failed to send message:', error);
            // Log first few errors for debugging
            if (failedCount <= 3) {
              setSendError(String(error));
            }
          }
          
          processedCount++;
          // Update progress after every message
          const currentPos = startFrom + processedCount;
          setProgress(p => ({ 
            ...p, 
            total: Math.max(p.total, currentPos),
            sent: startFrom + sentCount, 
            failed: failedCount,
            current: currentPos 
          }));
        }
      } else if (strategy.type === 'tps') {
        // TPS-controlled sending
        const tps = strategy.config.tps || 10;
        const intervalMs = 1000 / tps;
        
        for await (const msg of generator) {
          if (abortRef.current) break;
          
          const record = buildRecord(msg, columnMapping, compression, valueTimestampConfig, csvHeaders);
          
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
          
          // Update progress after every message
          const currentPos = startFrom + processedCount;
          setProgress(p => ({ 
            ...p, 
            total: Math.max(p.total, currentPos),
            sent: startFrom + sentCount, 
            failed: failedCount,
            current: currentPos 
          }));
        }
      } else if (strategy.type === 'interval') {
        // Fixed interval
        const intervalMs = (strategy.config.intervalSeconds || 1) * 1000;
        let isFirst = true;
        
        for await (const msg of generator) {
          if (abortRef.current) break;
          if (!isFirst) await sleep(intervalMs);
          isFirst = false;
          
          const record = buildRecord(msg, columnMapping, compression, valueTimestampConfig, csvHeaders);
          
          try {
            await tauriService.produceMessage(connection, topic, record);
            sentCount++;
          } catch (error) {
            failedCount++;
          }
          
          processedCount++;
          // Update progress after every message
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
  }, [file, detectedFormat, format, columnMapping, compression, strategy, connection, topic, csvHeaders, valueTimestampConfig]);

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
          <h3 className="text-lg font-medium mb-4">{t('producer.fileMode.partition.title', '分区策略')}</h3>
          <div className="space-y-3">
            {/* 单选：使用文件中的 partition */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="partitionStrategy"
                value="file-partition"
                checked={columnMapping.useFilePartition}
                onChange={() => setColumnMapping({ ...columnMapping, useFilePartition: true, partitionStrategy: 'key-hash' })}
                disabled={isSending}
                className="w-4 h-4 mt-0.5"
              />
              <div className="flex-1">
                <span className="text-sm font-medium">
                  {t('producer.fileMode.partition.useFilePartition', '使用文件中的 Partition')}
                </span>
                <p className="text-xs text-muted-foreground">
                  {t('producer.fileMode.partition.useFilePartitionHint', '按照文件中 partition 列的值发送到指定分区')}
                </p>
                {/* CSV 格式时显示列选择 */}
                {showMapping && columnMapping.useFilePartition && (
                  <div className="mt-2">
                    <select
                      value={columnMapping.partitionColumn}
                      onChange={(e) => setColumnMapping({ ...columnMapping, partitionColumn: e.target.value })}
                      disabled={isSending}
                      className="w-full max-w-xs px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">{t('producer.fileMode.partition.autoDetect', '自动检测')}</option>
                      {headers.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </label>

            {/* 单选：基于 Key 哈希 */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="partitionStrategy"
                value="key-hash"
                checked={!columnMapping.useFilePartition && columnMapping.partitionStrategy === 'key-hash'}
                onChange={() => setColumnMapping({ ...columnMapping, useFilePartition: false, partitionStrategy: 'key-hash' })}
                disabled={isSending}
                className="w-4 h-4 mt-0.5"
              />
              <div>
                <span className="text-sm font-medium">
                  {t('producer.fileMode.mapping.keyHash', '基于 Key 哈希')}
                </span>
                <p className="text-xs text-muted-foreground">
                  {t('producer.fileMode.mapping.keyHashHint', '相同 Key 的消息发送到同一分区，保证顺序')}
                </p>
              </div>
            </label>

            {/* 单选：轮询 */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="partitionStrategy"
                value="roundrobin"
                checked={!columnMapping.useFilePartition && columnMapping.partitionStrategy === 'roundrobin'}
                onChange={() => setColumnMapping({ ...columnMapping, useFilePartition: false, partitionStrategy: 'roundrobin' })}
                disabled={isSending}
                className="w-4 h-4 mt-0.5"
              />
              <div>
                <span className="text-sm font-medium">
                  {t('producer.fileMode.mapping.roundrobin', '轮询')}
                </span>
                <p className="text-xs text-muted-foreground">
                  {t('producer.fileMode.mapping.roundrobinHint', '消息均匀分布到各分区（Key 仍会被发送到 Kafka，但不影响分区选择）')}
                </p>
              </div>
            </label>
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

      {/* Value Timestamp Config */}
      {messages.length > 0 && (
        <section className="bg-background border border-border rounded-lg p-6 relative z-10">
          <h3 className="text-lg font-medium mb-4">{t('producer.fileMode.valueTimestamp.title')}</h3>
          <ValueTimestampMapper
            config={valueTimestampConfig}
            onChange={setValueTimestampConfig}
            previewMessages={messages}
            disabled={isSending}
          />
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
  compression: 'none' | 'gzip' | 'snappy' | 'lz4' | 'zstd',
  valueTimestampConfig: ValueTimestampConfig,
  csvHeaders: string[]
): {
  partition?: number;
  key?: string;
  value: string;
  headers?: Record<string, string>;
  compression?: 'gzip' | 'snappy' | 'lz4' | 'zstd';
  timestamp?: number;
  partitionStrategy?: 'key-hash' | 'roundrobin';
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

  // Note: When partitionStrategy is 'roundrobin', the backend will ignore key
  // for partition assignment, but the key is still sent with the message

  // Modify timestamp in value if enabled
  if (valueTimestampConfig.enabled && valueTimestampConfig.fieldPath) {
    // For CSV column paths (e.g., "csv_column_1"), we need the original CSV line
    if (valueTimestampConfig.fieldPath.startsWith('csv_column_')) {
      const columnIndex = parseInt(valueTimestampConfig.fieldPath.replace('csv_column_', ''), 10);
      
      // Get the original CSV line
      let csvLine: string | undefined;
      
      // For JSONL with embedded CSV (like Kafka export format), use msg.value directly
      // msg.value should be the CSV string when key/value fields are present
      if (msg.value && typeof msg.value === 'string' && msg.value.includes(',') && !msg.value.startsWith('{')) {
        // msg.value is the CSV line
        csvLine = msg.value;
      } else if (msg._raw?._line && typeof msg._raw._line === 'string' && msg._raw._line.includes(',') && !msg._raw._line.startsWith('{')) {
        // Use stored original line if it's CSV format
        csvLine = msg._raw._line;
      } else {
        // Rebuild CSV line from _raw data using header order
        const data = msg._raw || {};
        const headers = Object.keys(data).filter(h => !h.startsWith('_'));
        csvLine = rebuildCsvRow(data, headers);
      }
      
      if (csvLine) {
        const parts = csvLine.split(',');
        if (columnIndex >= 0 && columnIndex < parts.length) {
          const newTimestamp = calculateNewTimestampValue(parts[columnIndex].trim(), valueTimestampConfig);
          parts[columnIndex] = String(newTimestamp);
          const modifiedLine = parts.join(',');
          
          // Update value based on mapping
          if (mapping.valueColumn && msg._raw) {
            // If valueColumn is set, extract the modified value from the column
            // Use csvHeaders (original file column order) if available, otherwise fall back to Object.keys
            const headersToUse = csvHeaders.length > 0 ? csvHeaders : Object.keys(msg._raw);
            const valueIndex = headersToUse.indexOf(mapping.valueColumn);
            if (valueIndex >= 0 && valueIndex < parts.length) {
              value = parts[valueIndex];
            } else {
              value = modifiedLine;
            }
          } else {
            value = modifiedLine;
          }
        }
      }
    } else {
      // For column name paths (e.g., "timestamp"), modify in msg._raw and rebuild value
      const data = msg._raw || {};
      const fieldPath = valueTimestampConfig.fieldPath;
      
      if (fieldPath in data) {
        const originalValue = data[fieldPath];
        const newValue = calculateNewTimestampValue(originalValue, valueTimestampConfig);
        
        // Create modified data with new timestamp
        const modifiedData = { ...data, [fieldPath]: String(newValue) };
        
        // Rebuild value based on how it was originally built
        if (msg.key !== undefined || msg.value !== undefined) {
          // Check if original value was a CSV string (contains commas)
          const originalValueStr = typeof msg.value === 'string' ? msg.value : '';
          if (originalValueStr.includes(',') && !originalValueStr.startsWith('{')) {
            // Rebuild as CSV row using original column order from Object.keys
            value = rebuildCsvRow(modifiedData, Object.keys(data));
          } else {
            // Original value was JSON object
            value = JSON.stringify(modifiedData);
          }
        } else if (mapping.valueColumn) {
          value = modifiedData[mapping.valueColumn] || '';
        } else {
          // If no value column specified, rebuild as CSV row
          value = rebuildCsvRow(modifiedData, Object.keys(data));
        }
      }
    }
  }

  // Use original timestamp from file (metadata timestamp)
  const timestamp: number | undefined = extractTimestamp(msg);

  // Build final record with compression
  // Note: If useFilePartition is true, partitionStrategy is ignored (explicit partition takes precedence)
  const record: {
    partition?: number;
    key?: string;
    value: string;
    headers?: Record<string, string>;
    compression?: 'gzip' | 'snappy' | 'lz4' | 'zstd';
    timestamp?: number;
    partitionStrategy?: 'key-hash' | 'roundrobin';
  } = { 
    partition, 
    key, 
    value, 
    headers, 
    timestamp, 
    // Only set partitionStrategy when not using file partition
    partitionStrategy: mapping.useFilePartition ? undefined : mapping.partitionStrategy 
  };

  // Only add compression if not 'none'
  if (compression !== 'none') {
    record.compression = compression;
  }

  return record;
}

/**
 * Extract timestamp from parsed message
 * Supports various timestamp formats
 */
function extractTimestamp(msg: ParsedMessage): number | undefined {
  // Check if message has direct timestamp field
  if (msg._raw?.timestamp) {
    const ts = msg._raw.timestamp;
    // Try to parse as number (Unix timestamp in ms)
    const numTs = typeof ts === 'number' ? ts : parseInt(ts, 10);
    if (!isNaN(numTs)) {
      return numTs;
    }
  }
  
  // Check for timestamp in headers
  if (msg.headers?.timestamp) {
    const ts = parseInt(msg.headers.timestamp, 10);
    if (!isNaN(ts)) {
      return ts;
    }
  }
  
  return undefined;
}


/**
 * Calculate new timestamp value based on config
 */
function calculateNewTimestampValue(originalValue: any, config: ValueTimestampConfig): any {
  // Parse original value to milliseconds
  let originalMs: number;
  
  if (typeof originalValue === 'number') {
    originalMs = config.format === 'unix_sec' ? originalValue * 1000 : originalValue;
  } else if (typeof originalValue === 'string') {
    // Handle iso8601_space format by replacing space with 'T' for parsing
    const parseValue = config.format === 'iso8601_space' 
      ? originalValue.replace(' ', 'T') 
      : originalValue;
    originalMs = new Date(parseValue).getTime();
    if (isNaN(originalMs)) {
      return originalValue;
    }
  } else {
    return originalValue;
  }

  let newMs: number;
  switch (config.mode) {
    case 'file':
      return originalValue;
    case 'current':
      newMs = Date.now();
      break;
    case 'fixed':
      if (typeof config.fixedValue === 'number') {
        newMs = config.fixedValue;
      } else if (typeof config.fixedValue === 'string') {
        const parsed = new Date(config.fixedValue).getTime();
        newMs = isNaN(parsed) ? originalMs : parsed;
      } else {
        newMs = originalMs;
      }
      break;
    case 'offset':
      newMs = originalMs + (config.offsetMs || 0);
      break;
    default:
      return originalValue;
  }

  // Format output according to original format
  switch (config.format) {
    case 'unix_ms':
      return newMs;
    case 'unix_sec':
      return Math.floor(newMs / 1000);
    case 'iso8601':
      return new Date(newMs).toISOString();
    case 'iso8601_space':
      // Format as yyyy-MM-dd HH:mm:ss.SSS (preserve original CSV format)
      return formatDateWithSpace(newMs);
    default:
      return newMs;
  }
}

// Format date as yyyy-MM-dd HH:mm:ss.SSS
function formatDateWithSpace(timestamp: number): string {
  const date = new Date(timestamp);
  const pad = (n: number) => String(n).padStart(2, '0');
  const padMs = (n: number) => String(n).padStart(3, '0');
  
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
         `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${padMs(date.getMilliseconds())}`;
}

/**
 * Rebuild a CSV row from modified data and original column order
 */
function rebuildCsvRow(data: Record<string, string>, headers: string[]): string {
  return headers.map(header => {
    const value = data[header] ?? '';
    // Quote values that contain commas or quotes
    if (value.includes(',') || value.includes('"')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }).join(',');
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
