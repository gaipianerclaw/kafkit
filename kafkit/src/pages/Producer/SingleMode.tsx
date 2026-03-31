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

interface SingleModeProps {
  connection: any;
  topic: string;
  format: 'json' | 'text' | 'csv';
}

export function SingleMode({ connection, topic, format }: SingleModeProps) {
  const { t } = useTranslation();
  
  const [partition, setPartition] = useState('');
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSend = async () => {
    if (!connection || !value.trim()) return;

    setSending(true);
    setResult(null);

    try {
      const tauriService = await getService();
      await tauriService.produceMessage(connection, topic, {
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

  const formatJson = () => {
    try {
      const parsed = JSON.parse(value);
      setValue(JSON.stringify(parsed, null, 2));
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
      setValue(example);
    } else if (format === 'csv') {
      setValue('1,test1,100');
    } else {
      setValue('Hello, this is a test message');
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
        <label className="text-sm font-medium">{t('producer.contentSingle')}</label>
        <textarea
          value={value}
          onChange={e => setValue(e.target.value)}
          className="w-full h-64 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder={t('producer.placeholderSingle')}
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
          onClick={handleSend} 
          isLoading={sending}
          disabled={!value.trim()}
        >
          <Send className="w-4 h-4 mr-2" />
          {t('producer.send')}
        </Button>
      </div>
    </div>
  );
}
