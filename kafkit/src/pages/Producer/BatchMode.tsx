import { useState } from 'react';
import { Send } from 'lucide-react';
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

interface BatchModeProps {
  connection: any;
  topic: string;
  format: 'json' | 'text' | 'csv';
}

export function BatchMode({ connection, topic, format }: BatchModeProps) {
  const { t } = useTranslation();
  
  const [partition, setPartition] = useState('');
  const [key, setKey] = useState('');
  const [batchValue, setBatchValue] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleBatchSend = async () => {
    if (!connection || !batchValue.trim()) return;

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
        connection,
        topic,
        messages,
        { rateLimit: 100 }
      );

      if (batchResult.failed === 0) {
        setResult({ success: true, message: t('producer.batchSuccess', { count: batchResult.success }) });
        setBatchValue('');
      } else {
        const errorDetails = batchResult.errors.slice(0, 3).map((e: any) => e.error).join('; ');
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

  return (
    <div className="space-y-6">
      {/* Format & Tools */}
      <div className="flex items-center gap-4">
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={loadExample}>
          {t('producer.loadExample')}
        </Button>
        {format === 'json' && (
          <Button variant="outline" size="sm" onClick={formatJson}>
            {t('producer.formatJson')}
          </Button>
        )}
      </div>

      {/* Options */}
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

      {/* Message Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium">{t('producer.contentBatch')}</label>
        <textarea
          value={batchValue}
          onChange={e => setBatchValue(e.target.value)}
          className="w-full h-64 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder={t('producer.placeholderBatch')}
        />
      </div>

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
        <Button 
          size="lg" 
          onClick={handleBatchSend} 
          isLoading={sending}
          disabled={!batchValue.trim()}
        >
          <Send className="w-4 h-4 mr-2" />
          {t('producer.sendBatch')}
        </Button>
      </div>
    </div>
  );
}
