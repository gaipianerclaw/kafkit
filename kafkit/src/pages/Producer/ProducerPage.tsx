import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Send, FileJson } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useConnectionStore } from '../../stores';

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
  
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const [partition, setPartition] = useState('');
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [batchValue, setBatchValue] = useState('');
  const [format, setFormat] = useState<'json' | 'text' | 'csv'>('text');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const decodedTopic = topic ? decodeURIComponent(topic) : '';

  const handleSend = async () => {
    if (!activeConnection || !value.trim()) return;

    setSending(true);
    setResult(null);

    try {
      const tauriService = await getService();
      if (mode === 'single') {
        await tauriService.produceMessage(activeConnection, decodedTopic, {
          partition: partition ? parseInt(partition) : undefined,
          key: key || undefined,
          value: value.trim(),
        });
        setResult({ success: true, message: '消息发送成功' });
        setValue('');
      } else {
        // Batch mode
        const lines = batchValue.split('\n').filter(line => line.trim());
        const messages = lines.map(line => ({
          value: line.trim(),
        }));

        const batchResult = await tauriService.produceBatch(
          activeConnection,
          decodedTopic,
          messages,
          { rateLimit: 100 }
        );

        if (batchResult.failed === 0) {
          setResult({ success: true, message: `成功发送 ${batchResult.success} 条消息` });
          setBatchValue('');
        } else {
          setResult({ 
            success: false, 
            message: `发送完成: ${batchResult.success} 成功, ${batchResult.failed} 失败` 
          });
        }
      }
    } catch (err) {
      setResult({
        success: false,
        message: '发送失败: ' + (err instanceof Error ? err.message : '未知错误'),
      });
    } finally {
      setSending(false);
    }
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
        setBatchValue([example, example, example].join('\n'));
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
        setBatchValue([example, example, example].join('\n'));
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="h-14 border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" onClick={() => navigate('/main/topics')} className="mr-2">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-lg font-semibold">发送消息: {decodedTopic}</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-muted rounded-lg p-1">
            <button
              onClick={() => setMode('single')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                mode === 'single' ? 'bg-background shadow-sm' : 'text-muted-foreground'
              }`}
            >
              单条
            </button>
            <button
              onClick={() => setMode('batch')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                mode === 'batch' ? 'bg-background shadow-sm' : 'text-muted-foreground'
              }`}
            >
              批量
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Format & Tools */}
          <div className="flex items-center gap-4">
            <Select
              label="消息格式"
              value={format}
              onChange={e => setFormat(e.target.value as typeof format)}
              options={[
                { value: 'text', label: '纯文本' },
                { value: 'json', label: 'JSON' },
                { value: 'csv', label: 'CSV' },
              ]}
            />
            <div className="flex-1" />
            <Button variant="outline" size="sm" onClick={loadExample}>
              加载示例
            </Button>
            {format === 'json' && (
              <Button variant="outline" size="sm" onClick={formatJson}>
                <FileJson className="w-4 h-4 mr-2" />
                格式化
              </Button>
            )}
          </div>

          {/* Single Mode Options */}
          {mode === 'single' && (
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Partition (可选)"
                type="number"
                value={partition}
                onChange={e => setPartition(e.target.value)}
                placeholder="自动分配"
              />
              <Input
                label="Key (可选)"
                value={key}
                onChange={e => setKey(e.target.value)}
                placeholder="message key"
              />
            </div>
          )}

          {/* Message Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {mode === 'single' ? '消息内容' : '消息内容（每行一条）'}
            </label>
            <textarea
              value={mode === 'single' ? value : batchValue}
              onChange={e => mode === 'single' ? setValue(e.target.value) : setBatchValue(e.target.value)}
              className="w-full h-64 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder={mode === 'single' ? '输入消息内容...' : '每行输入一条消息...'}
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
          <div className="flex justify-end">
            <Button 
              size="lg" 
              onClick={handleSend} 
              isLoading={sending}
              disabled={mode === 'single' ? !value.trim() : !batchValue.trim()}
            >
              <Send className="w-4 h-4 mr-2" />
              {mode === 'single' ? '发送' : '批量发送'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
