import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Play, Pause, Trash2, Download } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { useConnectionStore } from '../../stores';
import * as tauriService from '../../services/tauriService';
import type { KafkaMessage, TopicDetail } from '../../types';
import { listen } from '@tauri-apps/api/event';

export function ConsumerPage() {
  const navigate = useNavigate();
  const { topic } = useParams();
  const { activeConnection } = useConnectionStore();
  
  const [messages, setMessages] = useState<KafkaMessage[]>([]);
  const [isConsuming, setIsConsuming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [selectedPartition, setSelectedPartition] = useState<string>('all');
  const [detail, setDetail] = useState<TopicDetail | null>(null);
  const [format, setFormat] = useState<'auto' | 'json' | 'text'>('auto');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const unlistenRef = useRef<(() => void) | null>(null);

  const decodedTopic = topic ? decodeURIComponent(topic) : '';

  useEffect(() => {
    if (activeConnection && topic) {
      fetchTopicDetail();
    }
    return () => {
      stopConsumption();
    };
  }, [activeConnection, topic]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const fetchTopicDetail = async () => {
    if (!activeConnection || !topic) return;
    try {
      const data = await tauriService.getTopicDetail(activeConnection, decodedTopic);
      setDetail(data);
    } catch (err) {
      console.error('Failed to fetch topic detail:', err);
    }
  };

  const startConsumption = async () => {
    if (!activeConnection || !topic) return;

    try {
      const partition = selectedPartition === 'all' ? undefined : parseInt(selectedPartition);
      const sid = await tauriService.startConsuming(
        activeConnection,
        decodedTopic,
        partition,
        { type: 'latest' }
      );
      setSessionId(sid);
      setIsConsuming(true);

      // Listen for messages
      const unlisten = await listen<KafkaMessage>('kafka-message', (event) => {
        setMessages(prev => [...prev, event.payload]);
      });
      unlistenRef.current = unlisten;
    } catch (err) {
      alert('启动消费失败: ' + (err instanceof Error ? err.message : '未知错误'));
    }
  };

  const stopConsumption = async () => {
    if (sessionId) {
      try {
        await tauriService.stopConsuming(sessionId);
      } catch (err) {
        console.error('Failed to stop consuming:', err);
      }
    }
    if (unlistenRef.current) {
      unlistenRef.current();
      unlistenRef.current = null;
    }
    setIsConsuming(false);
    setSessionId(null);
  };

  const clearMessages = () => {
    setMessages([]);
  };

  const exportMessages = () => {
    const data = JSON.stringify(messages, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${decodedTopic}-messages-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatMessage = (value: string): string => {
    if (format === 'json' || (format === 'auto' && isJson(value))) {
      try {
        return JSON.stringify(JSON.parse(value), null, 2);
      } catch {
        return value;
      }
    }
    return value;
  };

  const isJson = (str: string): boolean => {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  };

  const partitionOptions = detail 
    ? [
        { value: 'all', label: '所有分区' },
        ...detail.partitions.map(p => ({ value: String(p.partition), label: `Partition ${p.partition}` }))
      ]
    : [{ value: 'all', label: '所有分区' }];

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="h-14 border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" onClick={() => navigate('/main/topics')} className="mr-2">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">消费: {decodedTopic}</h1>
            <p className="text-xs text-muted-foreground">
              {messages.length} 条消息
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={selectedPartition}
            onChange={e => setSelectedPartition(e.target.value)}
            options={partitionOptions}
            className="w-40"
          />
          <Select
            value={format}
            onChange={e => setFormat(e.target.value as typeof format)}
            options={[
              { value: 'auto', label: '自动检测' },
              { value: 'json', label: 'JSON' },
              { value: 'text', label: '纯文本' },
            ]}
            className="w-32"
          />
          <Button variant="outline" size="sm" onClick={exportMessages} disabled={messages.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            导出
          </Button>
          <Button variant="outline" size="sm" onClick={clearMessages}>
            <Trash2 className="w-4 h-4 mr-2" />
            清空
          </Button>
          {isConsuming ? (
            <Button variant="destructive" size="sm" onClick={stopConsumption}>
              <Pause className="w-4 h-4 mr-2" />
              停止
            </Button>
          ) : (
            <Button size="sm" onClick={startConsumption}>
              <Play className="w-4 h-4 mr-2" />
              开始
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto bg-muted/30 font-mono text-sm">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            {isConsuming ? '等待消息...' : '点击"开始"按钮消费消息'}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {messages.map((msg, idx) => (
              <div key={idx} className="p-3 hover:bg-muted/50">
                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-1">
                  <span>Partition: {msg.partition}</span>
                  <span>Offset: {msg.offset}</span>
                  {msg.timestamp && (
                    <span>{new Date(msg.timestamp).toLocaleString()}</span>
                  )}
                  <span>{msg.size} bytes</span>
                </div>
                {msg.key && (
                  <div className="text-xs text-muted-foreground mb-1">
                    Key: {msg.key}
                  </div>
                )}
                <pre className="whitespace-pre-wrap break-all text-foreground">
                  {formatMessage(msg.value)}
                </pre>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}
