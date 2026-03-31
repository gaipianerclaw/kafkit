import { useState, useRef, useCallback } from 'react';
import { Play, Square } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
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

interface ScheduledModeProps {
  connection: any;
  topic: string;
  format: 'json' | 'text' | 'csv';
}

export function ScheduledMode({ connection, topic, format }: ScheduledModeProps) {
  const { t } = useTranslation();
  
  const [partition, setPartition] = useState('');
  const [key, setKey] = useState('');
  const [batchValue, setBatchValue] = useState('');
  const [batchSize, setBatchSize] = useState(10);
  const [interval, setInterval] = useState(1000);
  const [repeatCount, setRepeatCount] = useState(1);
  
  const [isRunning, setIsRunning] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  
  const scheduledRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef(false);

  const stopScheduled = useCallback(() => {
    abortRef.current = true;
    if (scheduledRef.current) {
      clearTimeout(scheduledRef.current);
      scheduledRef.current = null;
    }
    setIsRunning(false);
  }, []);

  const handleScheduledSend = async () => {
    if (!connection || !batchValue.trim()) return;
    
    abortRef.current = false;
    setIsRunning(true);
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
        
        const batchMessages = lines.slice(0, batchSize).map(line => ({
          partition: partition ? parseInt(partition) : undefined,
          key: key || undefined,
          value: line.trim(),
        }));

        if (batchMessages.length === 0) return;

        const batchResult = await tauriService.produceBatch(
          connection,
          topic,
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

        if (currentCount < totalMessages && !abortRef.current) {
          scheduledRef.current = setTimeout(sendBatch, interval);
        } else {
          setIsRunning(false);
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
        setIsRunning(false);
      }
    };

    sendBatch();
  };

  const formatJson = () => {
    try {
      const lines = batchValue.split('\n').filter(line => line.trim());
      const formatted = lines.map(line => {
        try {
          return JSON.stringify(JSON.parse(line), null, 2);
        } catch {
          return line;
        }
      }).join('\n---\n');
      setBatchValue(formatted);
    } catch {
      // Not valid JSON, ignore
    }
  };

  const loadExample = () => {
    if (format === 'json') {
      const examples = Array.from({ length: 5 }, (_, i) => JSON.stringify({
        id: i + 1,
        message: `Test message ${i + 1}`,
        timestamp: new Date().toISOString(),
      }));
      setBatchValue(examples.join('\n'));
    } else if (format === 'csv') {
      setBatchValue('id,name,value\n1,test1,100\n2,test2,200');
    } else {
      const examples = Array.from({ length: 5 }, (_, i) => `Test message ${i + 1}`);
      setBatchValue(examples.join('\n'));
    }
  };

  const totalMessages = batchValue.split('\n').filter(line => line.trim()).length * repeatCount;

  return (
    <div className="space-y-6">
      {/* Format & Tools */}
      <div className="flex items-center gap-4">
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={loadExample} disabled={isRunning}>
          {t('producer.loadExample')}
        </Button>
        {format === 'json' && (
          <Button variant="outline" size="sm" onClick={formatJson} disabled={isRunning}>
            {t('producer.formatJson')}
          </Button>
        )}
      </div>

      {/* Options */}
      <div className="grid grid-cols-3 gap-4">
        <Input
          label={t('producer.partition')}
          type="number"
          value={partition}
          onChange={e => setPartition(e.target.value)}
          placeholder={t('producer.partitionPlaceholder')}
          disabled={isRunning}
        />
        <Input
          label={t('producer.key')}
          value={key}
          onChange={e => setKey(e.target.value)}
          placeholder={t('producer.keyPlaceholder')}
          disabled={isRunning}
        />
        <Input
          label={t('producer.batchSize')}
          type="number"
          min={1}
          max={100}
          value={batchSize}
          onChange={e => setBatchSize(parseInt(e.target.value) || 10)}
          disabled={isRunning}
        />
      </div>

      {/* Scheduled Options */}
      <div className="grid grid-cols-2 gap-4 bg-muted/50 p-4 rounded-lg">
        <div>
          <label className="block text-sm font-medium mb-1">{t('producer.interval')}</label>
          <input
            type="number"
            min={100}
            max={60000}
            value={interval}
            onChange={e => setInterval(parseInt(e.target.value) || 1000)}
            disabled={isRunning}
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
            disabled={isRunning}
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
          />
          <p className="text-xs text-muted-foreground mt-1">{t('producer.repeatHint')}</p>
        </div>
      </div>

      {/* Message Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium">{t('producer.contentBatch')}</label>
        <textarea
          value={batchValue}
          onChange={e => setBatchValue(e.target.value)}
          disabled={isRunning}
          className="w-full h-48 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          placeholder={t('producer.placeholderBatch')}
        />
      </div>

      {/* Progress Bar */}
      {isRunning && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{t('producer.progress')}</span>
            <span>{sentCount} / {totalMessages}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all"
              style={{ 
                width: `${Math.min(100, (sentCount / (totalMessages || 1)) * 100)}%` 
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
        {isRunning ? (
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
      </div>
    </div>
  );
}
