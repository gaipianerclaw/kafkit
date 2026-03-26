import { useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Send, FileJson, Clock, Play, Square } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useConnectionStore } from '../../stores';
import { useTranslation } from 'react-i18next';

// 检测是否在 Tauri 环境中
const isTauri = () => {
  return typeof window !== 'undefined' && !!(window as any).__TAURI__;
};

// 动态导入服务
const getService = async () => {
  if (isTauri()) {
    return import('../../services/tauriService');
  } else {
    return import('../../services/mockTauriService');
  }
};

export function ProducerPage() {
  const navigate = useNavigate();
  const { topic } = useParams();
  const { activeConnection } = useConnectionStore();
  const { t } = useTranslation();
  
  const [mode, setMode] = useState<'single' | 'batch' | 'scheduled'>('single');
  const [partition, setPartition] = useState('');
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [batchValue, setBatchValue] = useState('');
  const [format, setFormat] = useState<'json' | 'text' | 'csv'>('text');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  
  // 批量/定时发送配置
  const [batchSize, setBatchSize] = useState(10);
  const [interval, setInterval] = useState(1000); // 毫秒
  const [repeatCount, setRepeatCount] = useState(1);
  const [isScheduledRunning, setIsScheduledRunning] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const scheduledRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef(false);

  const decodedTopic = topic ? decodeURIComponent(topic) : '';

  const handleSend = async () => {
    if (!activeConnection || !value.trim()) return;

    setSending(true);
    setResult(null);

    try {
      const tauriService = await getService();
      await tauriService.produceMessage(activeConnection, decodedTopic, {
        partition: partition ? parseInt(partition) : undefined,
        key: key || undefined,
        value: value.trim(),
      });
      setResult({ success: true, message: t('producer.success') });
      setValue('');
    } catch (err) {
      setResult({
        success: false,
        message: t('producer.failed') + ': ' + (err instanceof Error ? err.message : t('common.unknownError')),
      });
    } finally {
      setSending(false);
    }
  };

  const handleBatchSend = async () => {
    if (!activeConnection || !batchValue.trim()) return;

    setSending(true);
    setResult(null);

    try {
      const lines = batchValue.split('\n').filter(line => line.trim());
      const messages = lines.map(line => ({
        partition: partition ? parseInt(partition) : undefined,
        key: key || undefined,
        value: line.trim(),
      }));

      const tauriService = await getService();
      const batchResult = await tauriService.produceBatch(
        activeConnection,
        decodedTopic,
        messages,
        { rateLimit: 100 }
      );

      if (batchResult.failed === 0) {
        setResult({ success: true, message: t('producer.batchSuccess', { count: batchResult.success }) });
        setBatchValue('');
      } else {
        const errorDetails = batchResult.errors.slice(0, 3).map(e => e.error).join('; ');
        setResult({ 
          success: false, 
          message: t('producer.batchComplete', { success: batchResult.success, failed: batchResult.failed }) + '. ' + errorDetails
        });
      }
    } catch (err) {
      setResult({
        success: false,
        message: t('producer.failed') + ': ' + (err instanceof Error ? err.message : t('common.unknownError')),
      });
    } finally {
      setSending(false);
    }
  };

  const stopScheduled = useCallback(() => {
    abortRef.current = true;
    if (scheduledRef.current) {
      clearTimeout(scheduledRef.current);
      scheduledRef.current = null;
    }
    setIsScheduledRunning(false);
  }, []);

  const handleScheduledSend = async () => {
    if (!activeConnection || !batchValue.trim()) return;
    
    abortRef.current = false;
    setIsScheduledRunning(true);
    setSentCount(0);
    setResult(null);

    const lines = batchValue.split('\n').filter(line => line.trim());
    const totalMessages = lines.length * repeatCount;
    let currentCount = 0;
    let successCount = 0;
    let failedCount = 0;

    const sendBatch = async () => {
      if (abortRef.current) return;

      try {
        const tauriService = await getService();
        
        // 每次发送 batchSize 条消息
        const batchMessages = lines.slice(0, batchSize).map(line => ({
          partition: partition ? parseInt(partition) : undefined,
          key: key || undefined,
          value: line.trim(),
        }));

        if (batchMessages.length === 0) return;

        const batchResult = await tauriService.produceBatch(
          activeConnection,
          decodedTopic,
          batchMessages,
          { rateLimit: 100 }
        );

        successCount += batchResult.success;
        failedCount += batchResult.failed;
        currentCount += batchMessages.length;
        setSentCount(currentCount);

        setResult({
          success: failedCount === 0,
          message: t('producer.scheduledProgress', { current: currentCount, total: totalMessages, success: successCount, failed: failedCount })
        });

        // 如果还有更多消息要发送
        if (currentCount < totalMessages && !abortRef.current) {
          scheduledRef.current = setTimeout(sendBatch, interval);
        } else {
          setIsScheduledRunning(false);
          setResult({
            success: failedCount === 0,
            message: t('producer.scheduledComplete', { total: currentCount, success: successCount, failed: failedCount })
          });
        }
      } catch (err) {
        setResult({
          success: false,
          message: t('producer.failed') + ': ' + (err instanceof Error ? err.message : t('common.unknownError')),
        });
        setIsScheduledRunning(false);
      }
    };

    sendBatch();
  };

  const formatJson = () => {
    try {
      if (mode === 'single') {
        const parsed = JSON.parse(value);
        setValue(JSON.stringify(parsed, null, 2));
      } else {
        const lines = batchValue.split('\n').filter(line => line.trim());
        const formatted = lines.map(line => {
          try {
            return JSON.stringify(JSON.parse(line), null, 2);
          } catch {
            return line;
          }
        }).join('\n---\n');
        setBatchValue(formatted);
      }
    } catch {
      // Not valid JSON, ignore
    }
  };

  const loadExample = () => {
    if (format === 'json') {
      const example = JSON.stringify({
        id: Math.floor(Math.random() * 10000),
        message: 'Hello Kafka',
        timestamp: new Date().toISOString(),
      }, null, 2);
      if (mode === 'single') {
        setValue(example);
      } else {
        // 生成多条示例
        const examples = Array.from({ length: 5 }, (_, i) => JSON.stringify({
          id: i + 1,
          message: `Test message ${i + 1}`,
          timestamp: new Date().toISOString(),
        }));
        setBatchValue(examples.join('\n'));
      }
    } else if (format === 'csv') {
      const example = 'id,name,value\n1,test1,100\n2,test2,200';
      if (mode === 'single') {
        setValue('1,test1,100');
      } else {
        setBatchValue(example);
      }
    } else {
      const example = 'Hello, this is a test message';
      if (mode === 'single') {
        setValue(example);
      } else {
        const examples = Array.from({ length: 5 }, (_, i) => `Test message ${i + 1}`);
        setBatchValue(examples.join('\n'));
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="h-14 border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" onClick={() => navigate('/main/topics')} className="mr-2">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-lg font-semibold">{t('producer.title')}: {decodedTopic}</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-muted rounded-lg p-1">
            <button
              onClick={() => {
                stopScheduled();
                setMode('single');
              }}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                mode === 'single' ? 'bg-background shadow-sm' : 'text-muted-foreground'
              }`}
            >
              {t('producer.singleMode')}
            </button>
            <button
              onClick={() => {
                stopScheduled();
                setMode('batch');
              }}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                mode === 'batch' ? 'bg-background shadow-sm' : 'text-muted-foreground'
              }`}
            >
              {t('producer.batchMode')}
            </button>
            <button
              onClick={() => {
                setMode('scheduled');
              }}
              className={`px-3 py-1 text-sm rounded-md transition-colors flex items-center gap-1 ${
                mode === 'scheduled' ? 'bg-background shadow-sm' : 'text-muted-foreground'
              }`}
            >
              <Clock className="w-3 h-3" />
              {t('producer.scheduledMode')}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto min-h-0">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Format & Tools */}
          <div className="flex items-center gap-4">
            <Select
              label={t('producer.format')}
              value={format}
              onChange={e => setFormat(e.target.value as typeof format)}
              options={[
                { value: 'text', label: t('producer.formats.text') },
                { value: 'json', label: t('producer.formats.json') },
                { value: 'csv', label: t('producer.formats.csv') },
              ]}
            />
            <div className="flex-1" />
            <Button variant="outline" size="sm" onClick={loadExample}>
              {t('producer.loadExample')}
            </Button>
            {format === 'json' && (
              <Button variant="outline" size="sm" onClick={formatJson}>
                <FileJson className="w-4 h-4 mr-2" />
                {t('producer.formatJson')}
              </Button>
            )}
          </div>

          {/* Single Mode Options */}
          {mode === 'single' && (
            <div className="grid grid-cols-2 gap-4">
              <Input
                label={t('producer.partition')}
                type="number"
                value={partition}
                onChange={e => setPartition(e.target.value)}
                placeholder={t('producer.partitionPlaceholder')}
              />
              <Input
                label={t('producer.key')}
                value={key}
                onChange={e => setKey(e.target.value)}
                placeholder={t('producer.keyPlaceholder')}
              />
            </div>
          )}

          {/* Batch/Scheduled Mode Options */}
          {(mode === 'batch' || mode === 'scheduled') && (
            <div className="grid grid-cols-3 gap-4">
              <Input
                label={t('producer.partition')}
                type="number"
                value={partition}
                onChange={e => setPartition(e.target.value)}
                placeholder={t('producer.partitionPlaceholder')}
              />
              <Input
                label={t('producer.key')}
                value={key}
                onChange={e => setKey(e.target.value)}
                placeholder={t('producer.keyPlaceholder')}
              />
              {mode === 'scheduled' && (
                <Input
                  label={t('producer.batchSize')}
                  type="number"
                  min={1}
                  max={100}
                  value={batchSize}
                  onChange={e => setBatchSize(parseInt(e.target.value) || 10)}
                />
              )}
            </div>
          )}

          {/* Scheduled Mode Additional Options */}
          {mode === 'scheduled' && (
            <div className="grid grid-cols-2 gap-4 bg-muted/50 p-4 rounded-lg">
              <div>
                <label className="block text-sm font-medium mb-1">{t('producer.interval')}</label>
                <input
                  type="number"
                  min={100}
                  max={60000}
                  value={interval}
                  onChange={e => setInterval(parseInt(e.target.value) || 1000)}
                  disabled={isScheduledRunning}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">{t('producer.intervalHint')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('producer.repeatCount')}</label>
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={repeatCount}
                  onChange={e => setRepeatCount(parseInt(e.target.value) || 1)}
                  disabled={isScheduledRunning}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">{t('producer.repeatHint')}</p>
              </div>
            </div>
          )}

          {/* Message Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {mode === 'single' ? t('producer.contentSingle') : t('producer.contentBatch')}
            </label>
            <textarea
              value={mode === 'single' ? value : batchValue}
              onChange={e => mode === 'single' ? setValue(e.target.value) : setBatchValue(e.target.value)}
              disabled={isScheduledRunning}
              className="w-full h-64 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              placeholder={mode === 'single' ? t('producer.placeholderSingle') : t('producer.placeholderBatch')}
            />
          </div>

          {/* Progress Bar for Scheduled Mode */}
          {mode === 'scheduled' && isScheduledRunning && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t('producer.progress')}</span>
                <span>{sentCount} / {batchValue.split('\n').filter(line => line.trim()).length * repeatCount}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ 
                    width: `${Math.min(100, (sentCount / (batchValue.split('\n').filter(line => line.trim()).length * repeatCount || 1)) * 100)}%` 
                  }}
                />
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className={`p-4 rounded-lg ${
              result.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {result.message}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            {mode === 'single' && (
              <Button 
                size="lg" 
                onClick={handleSend} 
                isLoading={sending}
                disabled={!value.trim()}
              >
                <Send className="w-4 h-4 mr-2" />
                {t('producer.send')}
              </Button>
            )}
            {mode === 'batch' && (
              <Button 
                size="lg" 
                onClick={handleBatchSend} 
                isLoading={sending}
                disabled={!batchValue.trim()}
              >
                <Send className="w-4 h-4 mr-2" />
                {t('producer.sendBatch')}
              </Button>
            )}
            {mode === 'scheduled' && (
              <>
                {isScheduledRunning ? (
                  <Button 
                    size="lg" 
                    variant="destructive"
                    onClick={stopScheduled}
                  >
                    <Square className="w-4 h-4 mr-2" />
                    {t('producer.stop')}
                  </Button>
                ) : (
                  <Button 
                    size="lg" 
                    onClick={handleScheduledSend}
                    disabled={!batchValue.trim()}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {t('producer.startScheduled')}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
