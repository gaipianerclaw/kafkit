import { useEffect, useRef, useState, useCallback, memo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Play, Pause, Trash2, Download, Copy, Check, ChevronDown, ChevronRight, Settings2, FileText, Eye } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { useConnectionStore } from '../../stores';
import type { KafkaMessage, TopicDetail, OffsetSpec } from '../../types';
import { useTranslation } from 'react-i18next';

// Tauri dialog API
const getTauriDialog = async () => {
  try {
    const dialog = await import('@tauri-apps/plugin-dialog');
    return dialog;
  } catch {
    return null;
  }
};

// Invoke backend command
const invoke = async (cmd: string, args?: Record<string, unknown>) => {
  const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
  return tauriInvoke(cmd, args);
};

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

// 动态导入 Tauri event API
const getTauriEvent = async () => {
  try {
    const event = await import('@tauri-apps/api/event');
    return event;
  } catch (e) {
    return null;
  }
};

// 判断是否为 JSON 字符串
const isJsonString = (str: string): boolean => {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
};

// 判断是否为 CSV 格式（宽松检测）
const isCsvFormat = (str: string): boolean => {
  if (!str.includes(',')) return false;
  const lines = str.trim().split('\n');
  if (lines.length < 1) return false;
  // 只要有逗号，且每行至少有一个逗号，就认为是 CSV
  return lines.every(line => line.includes(','));
};

// 检测内容类型
type ContentType = 'json' | 'csv' | 'text';
const detectContentType = (str: string): ContentType => {
  if (isJsonString(str)) return 'json';
  if (isCsvFormat(str)) return 'csv';
  return 'text';
};

// CSV 表格渲染器
const CsvRenderer = ({ data }: { data: string }) => {
  const lines = data.trim().split('\n');
  if (lines.length === 0) return null;
  
  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };
  
  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map(parseCsvLine);
  const displayRows = rows.slice(0, 20);
  const hasMore = rows.length > 20;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            {headers.map((h, i) => (
              <th key={i} className="text-left py-1.5 px-2 font-semibold text-muted-foreground whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayRows.map((row, i) => (
            <tr key={i} className="border-b border-border/50 last:border-b-0">
              {row.map((cell, j) => (
                <td key={j} className="py-1 px-2 whitespace-nowrap">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {hasMore && (
        <div className="text-xs text-muted-foreground text-center py-2">
          ... 还有 {rows.length - 20} 行数据
        </div>
      )}
    </div>
  );
};

// JSON 语法高亮渲染器
const JsonRenderer = ({ data }: { data: unknown }) => {
  const renderValue = (value: unknown, depth = 0): JSX.Element => {
    const indent = '  '.repeat(depth);
    
    if (value === null) {
      return <span className="text-gray-500">null</span>;
    }
    
    if (typeof value === 'boolean') {
      return <span className="text-blue-600 dark:text-blue-400">{value.toString()}</span>;
    }
    
    if (typeof value === 'number') {
      return <span className="text-orange-600 dark:text-orange-400">{value}</span>;
    }
    
    if (typeof value === 'string') {
      const displayStr = value.length > 200 ? value.slice(0, 200) + '...' : value;
      return <span className="text-green-600 dark:text-green-400">{JSON.stringify(displayStr)}</span>;
    }
    
    if (Array.isArray(value)) {
      if (value.length === 0) return <span>[]</span>;
      const displayItems = value.slice(0, 50);
      const hasMore = value.length > 50;
      return (
        <span>
          <span>[</span>
          <div className="ml-4">
            {displayItems.map((item, idx) => (
              <div key={idx}>
                {renderValue(item, depth + 1)}
                {idx < value.length - 1 && <span>,</span>}
              </div>
            ))}
            {hasMore && (
              <div className="text-muted-foreground">... 还有 {value.length - 50} 项</div>
            )}
          </div>
          <span>{indent}]</span>
        </span>
      );
    }
    
    if (typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>);
      if (entries.length === 0) return <span>{'{'} {'}'}</span>;
      return (
        <span>
          <span>{'{'}</span>
          <div className="ml-4">
            {entries.map(([k, v], idx) => (
              <div key={k}>
                <span className="text-purple-600 dark:text-purple-400">{JSON.stringify(k)}</span>
                <span>: </span>
                {renderValue(v, depth + 1)}
                {idx < entries.length - 1 && <span>,</span>}
              </div>
            ))}
          </div>
          <span>{indent}{'}'}</span>
        </span>
      );
    }
    
    return <span>{String(value)}</span>;
  };

  return (
    <pre className="text-xs font-mono overflow-x-auto">
      {renderValue(data)}
    </pre>
  );
};

// 单条消息组件
const MessageItem = memo(({ msg, index }: {
  msg: KafkaMessage;
  index: number;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const contentType = detectContentType(msg.value);
  let displayValue: unknown = msg.value;
  if (contentType === 'json') {
    try {
      displayValue = JSON.parse(msg.value);
    } catch {
      displayValue = msg.value;
    }
  }
  
  const messageJson = {
    offset: msg.offset,
    partition: msg.partition,
    timestamp: msg.timestamp,
    key: msg.key || null,
    value: displayValue
  };
  
  const copyFullJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(messageJson, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getValuePreview = () => {
    const str = typeof displayValue === 'object' 
      ? JSON.stringify(displayValue)
      : String(displayValue);
    if (str.length <= 80) return str;
    return str.slice(0, 80) + '...';
  };

  // 格式化日期时间（简短格式）
  const formatShortTimestamp = (ts?: number) => {
    if (!ts) return '-';
    const date = new Date(ts);
    // 格式: 2026-03-19 08:00:00.123
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const ms = String(date.getMilliseconds()).padStart(3, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}`;
  };

  return (
    <div className="border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors">
      {/* 表头行 - 可点击展开 */}
      <div 
        className="grid grid-cols-[2rem_3rem_4rem_6rem_7rem_8rem_1fr_2.5rem] gap-2 px-3 py-2 cursor-pointer select-none items-center"
        onClick={() => setExpanded(!expanded)}
      >
        <button className="text-muted-foreground hover:text-foreground transition-colors justify-self-center">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        
        <span className="text-xs text-muted-foreground">#{index + 1}</span>
        
        <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-xs font-medium text-center">
          P{msg.partition}
        </span>
        
        <span className="text-xs text-muted-foreground font-mono">
          {msg.offset.toLocaleString()}
        </span>
        
        <span className="text-xs text-muted-foreground">
          {formatShortTimestamp(msg.timestamp)}
        </span>
        
        <span className="text-xs text-purple-600 font-mono truncate">
          {msg.key ? (msg.key.length > 12 ? msg.key.slice(0, 12) + '...' : msg.key) : '-'}
        </span>
        
        <span className="text-xs text-muted-foreground truncate font-mono">
          {getValuePreview()}
        </span>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            copyFullJson();
          }}
          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground justify-self-center"
          title="复制完整 JSON"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      
      {/* 展开后的详细内容 */}
      {expanded && (
        <div className="px-3 pb-3 pl-12">
          <div className="bg-muted/30 rounded border border-border">
            {/* 元信息 */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 border-b border-border bg-muted/50 text-xs">
              <span><span className="text-muted-foreground">Offset:</span> <span className="font-mono">{msg.offset}</span></span>
              <span><span className="text-muted-foreground">Partition:</span> <span className="font-mono">{msg.partition}</span></span>
              <span><span className="text-muted-foreground">Timestamp:</span> <span className="font-mono">{msg.timestamp}</span></span>
              {msg.key && <span><span className="text-muted-foreground">Key:</span> <span className="font-mono text-purple-600">{msg.key}</span></span>}
              <span><span className="text-muted-foreground">Size:</span> <span className="font-mono">{(msg.size / 1024).toFixed(2)} KB</span></span>
              <span><span className="text-muted-foreground">Type:</span> <span className="font-mono uppercase">{contentType}</span></span>
            </div>
            {/* Value 内容 */}
            <div className="p-3">
              {contentType === 'json' && <JsonRenderer data={displayValue} />}
              {contentType === 'csv' && <CsvRenderer data={msg.value} />}
              {contentType === 'text' && (
                <pre className="text-xs font-mono whitespace-pre-wrap break-all text-foreground">
                  {msg.value}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

MessageItem.displayName = 'MessageItem';

// 时间选择器组件
function TimestampSelector({ value, onChange }: { value?: number; onChange: (ts: number) => void }) {
  const { t } = useTranslation();
  
  // 从 timestamp 计算显示值
  const getDateTimeStrings = (ts?: number) => {
    if (!ts) {
      const now = new Date();
      return {
        date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
        time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      };
    }
    const date = new Date(ts);
    return {
      date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
      time: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    };
  };
  
  const { date: dateStr, time: timeStr } = getDateTimeStrings(value);
  
  // 使用本地时间创建 timestamp
  const createTimestamp = (date: string, time: string): number => {
    // date: "2026-03-19", time: "08:00"
    // 解析为本地时间
    const [year, month, day] = date.split('-').map(Number);
    const [hours, minutes] = time.split(':').map(Number);
    const dateObj = new Date(year, month - 1, day, hours, minutes, 0, 0);
    return dateObj.getTime();
  };
  
  const handleDateChange = (d: string) => {
    if (d && timeStr) {
      const ts = createTimestamp(d, timeStr);
      if (!isNaN(ts)) {
        console.log('[TimestampSelector] Date change:', d, timeStr, '->', ts, new Date(ts).toISOString());
        onChange(ts);
      }
    }
  };
  
  const handleTimeChange = (t: string) => {
    if (dateStr && t) {
      const ts = createTimestamp(dateStr, t);
      if (!isNaN(ts)) {
        console.log('[TimestampSelector] Time change:', dateStr, t, '->', ts, new Date(ts).toISOString());
        onChange(ts);
      }
    }
  };
  
  const quickSelects = [
    { label: t('consumer.timeSelector.now'), getTime: () => Date.now() },
    { label: t('consumer.timeSelector.hourAgo'), getTime: () => Date.now() - 3600000 },
    { label: t('consumer.timeSelector.todayMidnight'), getTime: () => new Date().setHours(0, 0, 0, 0) },
    { label: t('consumer.timeSelector.yesterday'), getTime: () => new Date(Date.now() - 86400000).setHours(0, 0, 0, 0) },
  ];
  
  return (
    <div className="space-y-3">
      <label className="text-sm text-muted-foreground block">{t('consumer.timeSelector.label')}</label>
      
      {/* 快速选择按钮 */}
      <div className="flex flex-wrap gap-2">
        {quickSelects.map(q => (
          <button
            key={q.label}
            onClick={() => {
              const ts = q.getTime();
              console.log('[TimestampSelector] Quick select:', q.label, '->', ts, new Date(ts).toISOString());
              onChange(ts);
            }}
            className="px-3 py-1.5 text-xs bg-muted hover:bg-muted/80 rounded-md transition-colors"
          >
            {q.label}
          </button>
        ))}
      </div>
      
      {/* 日期时间输入 */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-xs text-muted-foreground block mb-1.5">{t('consumer.timeSelector.date')}</label>
          <input
            type="date"
            value={dateStr}
            onChange={e => handleDateChange(e.target.value)}
            className="w-full h-11 px-3 rounded-md border border-input bg-background text-base"
          />
        </div>
        <div className="w-32">
          <label className="text-xs text-muted-foreground block mb-1.5">{t('consumer.timeSelector.time')}</label>
          <input
            type="time"
            value={timeStr}
            onChange={e => handleTimeChange(e.target.value)}
            className="w-full h-11 px-3 rounded-md border border-input bg-background text-base"
          />
        </div>
      </div>
      
      {/* 显示当前选择的时间 */}
      {value && (
        <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded">
          {((): string => {
            const d = new Date(value);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            const seconds = String(d.getSeconds()).padStart(2, '0');
            const ms = String(d.getMilliseconds()).padStart(3, '0');
            return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}.${ms}`;
          })()}
        </div>
      )}
    </div>
  );
}

// 消费参数配置面板
function ConsumerConfigPanel({
  isOpen,
  onClose,
  config,
  onChange,
}: {
  isOpen: boolean;
  onClose: () => void;
  config: ConsumerConfig;
  onChange: (config: ConsumerConfig) => void;
}) {
  const { t } = useTranslation();
  
  if (!isOpen) return null;

  return (
    <div className="absolute top-full right-0 mt-2 w-80 bg-background border border-border rounded-lg shadow-lg z-50 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium">{t('consumer.config.title')}</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">×</button>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="text-sm text-muted-foreground block mb-1">{t('consumer.config.startPosition')}</label>
          <Select
            value={config.offsetType}
            onChange={e => onChange({ ...config, offsetType: e.target.value as OffsetType })}
            options={[
              { value: 'latest', label: t('consumer.config.positions.latest') },
              { value: 'earliest', label: t('consumer.config.positions.earliest') },
              { value: 'timestamp', label: t('consumer.config.positions.timestamp') },
              { value: 'offset', label: t('consumer.config.positions.offset') },
            ]}
            className="w-full"
          />
        </div>
        
        {config.offsetType === 'timestamp' && (
          <TimestampSelector 
            value={config.timestamp || Date.now()} 
            onChange={timestamp => onChange({ ...config, timestamp })} 
          />
        )}
        
        {config.offsetType === 'offset' && (
          <div>
            <label className="text-sm text-muted-foreground block mb-1">{t('consumer.config.offset')}</label>
            <input
              type="number"
              value={config.offsetValue || 0}
              onChange={e => onChange({ ...config, offsetValue: parseInt(e.target.value) || 0 })}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
              placeholder={t('consumer.config.offsetPlaceholder')}
            />
          </div>
        )}
        
        <div className="border-t border-border pt-4">
          <label className="text-sm text-muted-foreground block mb-2">{t('consumer.config.mode.title')}</label>
          <div className="flex gap-2">
            <button
              onClick={() => onChange({ ...config, mode: 'preview' })}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md border text-sm transition-colors ${
                config.mode === 'preview' 
                  ? 'bg-primary text-primary-foreground border-primary' 
                  : 'bg-background hover:bg-muted border-border'
              }`}
            >
              <Eye className="w-4 h-4" />
              {t('consumer.config.mode.preview')}
            </button>
            <button
              onClick={() => onChange({ ...config, mode: 'file' })}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md border text-sm transition-colors ${
                config.mode === 'file' 
                  ? 'bg-primary text-primary-foreground border-primary' 
                  : 'bg-background hover:bg-muted border-border'
              }`}
            >
              <FileText className="w-4 h-4" />
              {t('consumer.config.mode.file')}
            </button>
          </div>
        </div>
        
        {config.mode === 'file' && (
          <div className="border-t border-border pt-4">
            <label className="text-sm text-muted-foreground block mb-1">{t('consumer.config.fileFormat')}</label>
            <Select
              value={config.fileFormat}
              onChange={e => onChange({ ...config, fileFormat: e.target.value as 'json' | 'csv' | 'jsonl' })}
              options={[
                { value: 'json', label: t('consumer.config.formats.jsonArray') },
                { value: 'jsonl', label: t('consumer.config.formats.jsonLines') },
                { value: 'csv', label: 'CSV' },
              ]}
              className="w-full"
            />
          </div>
        )}
      </div>
    </div>
  );
}

type OffsetType = 'latest' | 'earliest' | 'timestamp' | 'offset';
type ConsumeMode = 'preview' | 'file';
interface ConsumerConfig {
  offsetType: OffsetType;
  timestamp?: number;
  offsetValue?: number;
  mode: ConsumeMode;
  fileFormat: 'json' | 'csv' | 'jsonl';
}

export function ConsumerPage() {
  const navigate = useNavigate();
  const { topic } = useParams();
  const { activeConnection } = useConnectionStore();
  const { t } = useTranslation();
  
  // 消息数量限制选项 - 移到组件内部
  const PREVIEW_LIMITS = [
    { value: '100', label: t('consumer.limits.100') },
    { value: '500', label: t('consumer.limits.500') },
    { value: '1000', label: t('consumer.limits.1000') },
    { value: '5000', label: t('consumer.limits.5000') },
    { value: '10000', label: t('consumer.limits.10000') },
    { value: 'unlimited', label: t('consumer.limits.unlimited') },
  ];
  
  const [messages, setMessages] = useState<KafkaMessage[]>([]);
  const [isConsuming, setIsConsuming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [selectedPartition, setSelectedPartition] = useState<string>('all');
  const [detail, setDetail] = useState<TopicDetail | null>(null);
  const [topics, setTopics] = useState<{ name: string; partitionCount: number }[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showConfig, setShowConfig] = useState(false);
  const [previewLimit, setPreviewLimit] = useState('500');
  const [consumerConfig, setConsumerConfig] = useState<ConsumerConfig>({
    offsetType: 'latest',
    mode: 'preview',
    fileFormat: 'jsonl',
  });
  
  // 文件写入相关 - 使用 state 以便 UI 更新
  const [fileMessageCount, setFileMessageCount] = useState(0);
  const fileMessageCountRef = useRef(0);
  const filePathRef = useRef<string>('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const unlistenRef = useRef<(() => void) | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<KafkaMessage[]>([]);
  const configPanelRef = useRef<HTMLDivElement>(null);
  const isSwitchingTopicRef = useRef(false);

  const decodedTopic = topic ? decodeURIComponent(topic) : '';

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // 点击外部关闭配置面板
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (configPanelRef.current && !configPanelRef.current.contains(event.target as Node)) {
        setShowConfig(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (activeConnection && topic) {
      fetchTopicDetail();
      fetchTopics();
    }
  }, [activeConnection, topic]);

  // 组件卸载时的清理
  useEffect(() => {
    return () => {
      // 只有在不是切换 topic 的情况下才t('consumer.stop')消费
      if (!isSwitchingTopicRef.current && sessionId) {
        console.log('[Kafkit] Component unmounting, stopping consumption');
        // 使用同步方式清理，避免异步操作
        if (unlistenRef.current) {
          unlistenRef.current();
          unlistenRef.current = null;
        }
        // 异步停止消费（不等待完成）
        getService().then(service => 
          service.stopConsuming(sessionId).catch(() => {})
        );
      }
    };
  }, [sessionId]);

  useEffect(() => {
    if (autoScroll && messagesEndRef.current && scrollContainerRef.current) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }, [messages.length, autoScroll]);

  const fetchTopicDetail = async () => {
    if (!activeConnection || !topic) return;
    try {
      const tauriService = await getService();
      const data = await tauriService.getTopicDetail(activeConnection, decodedTopic);
      setDetail(data);
    } catch (err) {
      console.error('Failed to fetch topic detail:', err);
    }
  };

  const fetchTopics = async () => {
    if (!activeConnection) return;
    try {
      const tauriService = await getService();
      const topicList = await tauriService.listTopics(activeConnection);
      setTopics(topicList.map(t => ({ name: t.name, partitionCount: t.partitionCount })));
    } catch (err) {
      console.error('Failed to fetch topics:', err);
    }
  };

  const handleNewMessage = useCallback((newMsg: KafkaMessage) => {
    setMessages(prev => {
      const limit = previewLimit === 'unlimited' ? Infinity : parseInt(previewLimit);
      const newMessages = [...prev, newMsg];
      if (newMessages.length > limit) {
        return newMessages.slice(newMessages.length - limit);
      }
      return newMessages;
    });
  }, [previewLimit]);

  const buildOffsetSpec = (): OffsetSpec => {
    switch (consumerConfig.offsetType) {
      case 'earliest':
        return { type: 'earliest' };
      case 'timestamp':
        return { type: 'timestamp', timestamp: consumerConfig.timestamp || Date.now() };
      case 'offset':
        return { type: 'offset', offset: consumerConfig.offsetValue || 0 };
      case 'latest':
      default:
        return { type: 'latest' };
    }
  };

  // 初始化文件写入
  const initFileWriter = async (): Promise<boolean> => {
    if (consumerConfig.mode !== 'file') return true;
    
    const dialog = await getTauriDialog();
    if (!dialog) {
      console.error('Tauri dialog not available');
      return false;
    }

    try {
      const filePath = await dialog.save({
        defaultPath: `${decodedTopic}-messages-${Date.now()}.${consumerConfig.fileFormat}`,
        filters: [
          { name: consumerConfig.fileFormat.toUpperCase(), extensions: [consumerConfig.fileFormat] },
        ],
      });

      if (!filePath) {
        return false; // 用户取消
      }

      filePathRef.current = filePath as string;
      fileMessageCountRef.current = 0;
      setFileMessageCount(0);

      // 使用后端命令初始化文件
      if (consumerConfig.fileFormat === 'json') {
        await invoke('save_to_file', { filePath, content: '[\n' });
      } else if (consumerConfig.fileFormat === 'csv') {
        await invoke('save_to_file', { filePath, content: 'partition,offset,timestamp,key,value\n' });
      } else {
        await invoke('save_to_file', { filePath, content: '' });
      }

      console.log('[Kafkit] File writer initialized:', filePath);
      return true;
    } catch (err) {
      console.error('Failed to init file writer:', err);
      return false;
    }
  };

  // 写入消息到文件
  const writeMessageToFile = async (msg: KafkaMessage) => {
    if (consumerConfig.mode !== 'file') return;

    try {
      let content: string;
      
      // 构建消息对象
      let parsedValue: unknown = msg.value;
      if (isJsonString(msg.value)) {
        try { parsedValue = JSON.parse(msg.value); } catch {}
      }
      
      const messageObj = {
        offset: msg.offset,
        partition: msg.partition,
        timestamp: msg.timestamp,
        key: msg.key || null,
        value: parsedValue
      };

      if (consumerConfig.fileFormat === 'jsonl') {
        content = JSON.stringify(messageObj) + '\n';
      } else if (consumerConfig.fileFormat === 'json') {
        const prefix = fileMessageCountRef.current > 0 ? ',\n' : '';
        content = prefix + '  ' + JSON.stringify(messageObj);
      } else {
        // CSV format
        const timestamp = msg.timestamp ? new Date(msg.timestamp).toISOString() : '';
        const value = msg.value.replace(/"/g, '""').replace(/\n/g, ' ');
        content = `${msg.partition},${msg.offset},"${timestamp}","${msg.key || ''}","${value}"\n`;
      }

      // 使用后端命令追加写入文件
      await invoke('append_to_file', { filePath: filePathRef.current, content });
      fileMessageCountRef.current += 1;
      setFileMessageCount(fileMessageCountRef.current);
    } catch (err) {
      console.error('Failed to write message:', err);
    }
  };

  // 关闭文件写入
  const closeFileWriter = async () => {
    if (consumerConfig.mode !== 'file' || !filePathRef.current) return;

    try {
      if (consumerConfig.fileFormat === 'json') {
        // 写入数组结尾
        await invoke('append_to_file', { filePath: filePathRef.current, content: '\n]' });
      }
      
      console.log(`[Kafkit] File saved: ${filePathRef.current}, total messages: ${fileMessageCount}`);
    } catch (err) {
      console.error('Failed to close file writer:', err);
    }
    
    filePathRef.current = '';
    fileMessageCountRef.current = 0;
    setFileMessageCount(0);
  };

  const startConsumption = async () => {
    if (!activeConnection || !topic) return;

    try {
      // 如果是文件模式，先初始化文件
      if (consumerConfig.mode === 'file') {
        const initialized = await initFileWriter();
        if (!initialized) {
          console.log('[Kafkit] User cancelled file save dialog');
          return;
        }
      }

      const tauriService = await getService();
      const partition = selectedPartition === 'all' ? undefined : parseInt(selectedPartition);
      const offsetSpec = buildOffsetSpec();
      
      console.log('[Kafkit] Starting consumption with offset:', offsetSpec);
      
      const sid = await tauriService.startConsuming(
        activeConnection,
        decodedTopic,
        partition,
        offsetSpec
      );
      setSessionId(sid);
      setIsConsuming(true);

      const tauriEvent = await getTauriEvent();
      
      if (tauriEvent && tauriEvent.listen) {
        const unlisten = await tauriEvent.listen<KafkaMessage>('kafka-message', (event) => {
          if (event.payload) {
            const msg = event.payload;
            
            // 文件模式：直接写入文件
            if (consumerConfig.mode === 'file') {
              writeMessageToFile(msg);
            } else {
              // 预览模式：更新状态
              handleNewMessage(msg);
            }
          }
        });
        unlistenRef.current = unlisten;
      }
    } catch (err) {
      alert(t('consumer.alerts.startFailed') + ': ' + (err instanceof Error ? err.message : t('common.unknownError')));
    }
  };

  const stopConsumption = async () => {
    console.log('[Kafkit] Stopping consumption, sessionId:', sessionId);
    
    // 立即更新 UI 状态，即使后端调用失败
    setIsConsuming(false);
    
    if (sessionId) {
      try {
        const tauriService = await getService();
        await tauriService.stopConsuming(sessionId);
        console.log('[Kafkit] Backend stop successful');
      } catch (err) {
        console.error('Failed to stop consuming:', err);
      }
      setSessionId(null);
    }
    
    if (unlistenRef.current) {
      unlistenRef.current();
      unlistenRef.current = null;
    }
    
    // 关闭文件写入
    await closeFileWriter();
    
    console.log('[Kafkit] Stop consumption complete');
  };

  const clearMessages = () => {
    setMessages([]);
  };

  // t('consumer.export')数据 - 使用文件选择对话框
  const exportMessages = async (format: 'json' | 'csv' = 'json') => {
    const dialog = await getTauriDialog();
    if (!dialog) {
      // 降级到浏览器下载
      fallbackExport(format);
      return;
    }

    try {
      const filePath = await dialog.save({
        defaultPath: `${decodedTopic}-messages-${Date.now()}.${format}`,
        filters: [
          { name: format.toUpperCase(), extensions: [format] },
        ],
      });

      if (!filePath) return; // 用户取消

      let content: string;

      if (format === 'csv') {
        // CSV 导出
        const csvLines: string[] = [];
        messages.forEach(msg => {
          if (isCsvFormat(msg.value)) {
            csvLines.push(msg.value);
          }
        });
        
        if (csvLines.length === 0) {
          console.warn('没有找到 CSV 格式的消息');
          // 导出为普通 CSV 表格格式
          const headers = 'partition,offset,timestamp,key,value\n';
          const rows = messages.map(msg => {
            const ts = msg.timestamp ? new Date(msg.timestamp).toISOString() : '';
            const key = (msg.key || '').replace(/"/g, '""');
            const value = msg.value.replace(/"/g, '""').replace(/\n/g, ' ');
            return `${msg.partition},${msg.offset},"${ts}","${key}","${value}"`;
          });
          content = headers + rows.join('\n');
        } else {
          content = csvLines.join('\n');
        }
      } else {
        // JSON 导出
        const exportData = messages.map(msg => {
          let parsedValue: unknown = msg.value;
          if (isJsonString(msg.value)) {
            try { parsedValue = JSON.parse(msg.value); } catch {}
          }
          return {
            offset: msg.offset,
            partition: msg.partition,
            timestamp: msg.timestamp,
            key: msg.key || null,
            value: parsedValue
          };
        });
        content = JSON.stringify(exportData, null, 2);
      }

      await invoke('save_to_file', { filePath, content });
      console.log(`Exported ${messages.length} messages to ${filePath}`);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  // 降级导出方案（浏览器）
  const fallbackExport = (format: 'json' | 'csv') => {
    try {
      let content: string;
      let filename: string;
      let mimeType: string;

      if (format === 'csv') {
        const headers = 'partition,offset,timestamp,key,value\n';
        const rows = messages.map(msg => {
          const ts = msg.timestamp ? new Date(msg.timestamp).toISOString() : '';
          const key = (msg.key || '').replace(/"/g, '""');
          const value = msg.value.replace(/"/g, '""').replace(/\n/g, ' ');
          return `${msg.partition},${msg.offset},"${ts}","${key}","${value}"`;
        });
        content = headers + rows.join('\n');
        filename = `${decodedTopic}-messages-${Date.now()}.csv`;
        mimeType = 'text/csv';
      } else {
        const exportData = messages.map(msg => {
          let parsedValue: unknown = msg.value;
          if (isJsonString(msg.value)) {
            try { parsedValue = JSON.parse(msg.value); } catch {}
          }
          return {
            offset: msg.offset,
            partition: msg.partition,
            timestamp: msg.timestamp,
            key: msg.key || null,
            value: parsedValue
          };
        });
        content = JSON.stringify(exportData, null, 2);
        filename = `${decodedTopic}-messages-${Date.now()}.json`;
        mimeType = 'application/json';
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (err) {
      console.error('导出失败:', err);
    }
  };

  const partitionOptions = detail 
    ? [
        { value: 'all', label: t('consumer.columns.partition') + ': All' },
        ...detail.partitions.map(p => ({ value: String(p.partition), label: `P${p.partition}` }))
      ]
    : [{ value: 'all', label: t('consumer.columns.partition') + ': All' }];

  const getOffsetLabel = () => {
    switch (consumerConfig.offsetType) {
      case 'earliest': return 'Earliest';
      case 'timestamp': return 'Time';
      case 'offset': return `Offset:${consumerConfig.offsetValue}`;
      default: return 'Latest';
    }
  };

  const getModeIcon = () => {
    return consumerConfig.mode === 'file' ? <FileText className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />;
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 h-14 border-b border-border flex items-center justify-between px-4 bg-background z-20">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={async () => {
              // 如果正在消费，先停止消费
              if (isConsuming) {
                await stopConsumption();
              }
              navigate('/main/topics');
            }} 
            className="mr-2"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-3">
            {/* Topic 选择器 */}
            {topics.length > 0 && (
              <Select
                value={decodedTopic}
                onChange={async e => {
                  const newTopic = e.target.value;
                  if (newTopic !== decodedTopic) {
                    // 标记正在切换 topic，避免 cleanup 时重复停止
                    isSwitchingTopicRef.current = true;
                    // 切换 topic 时停止当前消费
                    if (isConsuming) {
                      await stopConsumption();
                    }
                    // t('consumer.clear')消息
                    setMessages([]);
                    // 重置状态
                    setDetail(null);
                    setSelectedPartition('all');
                    // 导航到新 topic
                    navigate(`/main/topics/${encodeURIComponent(newTopic)}/consume`);
                  }
                }}
                options={topics.map(t => ({ value: t.name, label: t.name }))}
                className="w-48"
                disabled={isConsuming}
              />
            )}
            <div>
              <p className="text-xs text-muted-foreground">
                {isConsuming && consumerConfig.mode === 'file' 
                  ? t('consumer.status.writtenToFile', { count: fileMessageCount })
                  : t('consumer.status.messageCount', { count: messages.length })
                }
                {consumerConfig.mode === 'preview' && previewLimit !== 'unlimited' && ` (${t('consumer.limits.title')}: ${previewLimit})`}
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* 分区选择 */}
          <Select
            value={selectedPartition}
            onChange={e => setSelectedPartition(e.target.value)}
            options={partitionOptions}
            className="w-32"
            disabled={isConsuming}
          />
          
          {/* 预览数量限制 */}
          {consumerConfig.mode === 'preview' && (
            <Select
              value={previewLimit}
              onChange={e => setPreviewLimit(e.target.value)}
              options={PREVIEW_LIMITS}
              className="w-28"
              disabled={isConsuming}
            />
          )}
          
          {/* 消费参数配置 */}
          <div className="relative" ref={configPanelRef}>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowConfig(!showConfig)}
              disabled={isConsuming}
              className={showConfig ? 'bg-muted' : ''}
            >
              <Settings2 className="w-4 h-4 mr-1" />
              {getOffsetLabel()}
              <span className="mx-1 text-border">|</span>
              {getModeIcon()}
            </Button>
            <ConsumerConfigPanel
              isOpen={showConfig}
              onClose={() => setShowConfig(false)}
              config={consumerConfig}
              onChange={setConsumerConfig}
            />
          </div>
          
          {/* 自动滚动（仅预览模式） */}
          {consumerConfig.mode === 'preview' && (
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={e => setAutoScroll(e.target.checked)}
                className="rounded border-border"
              />
              {t('consumer.autoScroll')}
            </label>
          )}
          
          {/* 导出（仅预览模式） */}
          {consumerConfig.mode === 'preview' && (
            <div className="relative group">
              <Button variant="outline" size="sm" disabled={messages.length === 0}>
                <Download className="w-4 h-4 mr-1" />
                {t('consumer.export')}
              </Button>
              <div className="absolute top-full right-0 mt-1 w-32 bg-background border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <button
                  onClick={() => exportMessages('json')}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted first:rounded-t-lg"
                >
                  {t('consumer.exportJson')}
                </button>
                <button
                  onClick={() => exportMessages('csv')}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted last:rounded-b-lg"
                >
                  {t('consumer.exportCsv')}
                </button>
              </div>
            </div>
          )}
          
          {consumerConfig.mode === 'preview' && (
            <Button variant="outline" size="sm" onClick={clearMessages}>
              <Trash2 className="w-4 h-4 mr-1" />
              {t('consumer.clear')}
            </Button>
          )}
          
          {isConsuming ? (
            <Button variant="destructive" size="sm" onClick={stopConsumption}>
              <Pause className="w-4 h-4 mr-1" />
              {t('consumer.stop')}
            </Button>
          ) : (
            <Button size="sm" onClick={startConsumption}>
              <Play className="w-4 h-4 mr-1" />
              {consumerConfig.mode === 'file' ? t('consumer.config.mode.file') : t('consumer.start')}
            </Button>
          )}
        </div>
      </div>

      {/* 预览模式：表头和消息列表 */}
      {consumerConfig.mode === 'preview' && (
        <>
          {/* 表头 */}
          <div className="flex-shrink-0 grid grid-cols-[2rem_3rem_4rem_6rem_7rem_8rem_1fr_2.5rem] gap-2 px-3 py-2 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground">
            <span></span>
            <span>{t('consumer.columns.index')}</span>
            <span>{t('consumer.columns.partition')}</span>
            <span>Offset</span>
            <span>{t('consumer.columns.timestamp')}</span>
            <span>Key</span>
            <span>{t('consumer.columns.value')}</span>
            <span className="text-center">{t('consumer.columns.actions')}</span>
          </div>

          {/* Messages */}
          <div 
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto bg-background"
            onScroll={() => {
              if (scrollContainerRef.current) {
                const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
                const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
                if (!isNearBottom && autoScroll) {
                  setAutoScroll(false);
                }
              }
            }}
          >
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                {isConsuming ? t('consumer.waiting') : t('consumer.clickToStart')}
              </div>
            ) : (
              <div>
                {messages.map((msg, idx) => (
                  <MessageItem
                    key={`${msg.partition}-${msg.offset}-${idx}`}
                    msg={msg}
                    index={idx}
                  />
                ))}
                <div ref={messagesEndRef} className="h-4" />
              </div>
            )}
          </div>
        </>
      )}

      {/* 文件模式：显示写入状态 */}
      {consumerConfig.mode === 'file' && (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
          <FileText className="w-16 h-16 mb-4 opacity-50" />
          {isConsuming ? (
            <div className="text-center">
              <p className="text-lg font-medium text-foreground mb-2">{t('consumer.status.writing')}</p>
              <p className="text-sm">{t('consumer.status.written', { count: fileMessageCount })}</p>
              <p className="text-xs mt-2 text-muted-foreground">{filePathRef.current || 'Preparing...'}</p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-lg font-medium text-foreground mb-2">{t('consumer.status.fileMode')}</p>
              <p className="text-sm">{t('consumer.status.fileModeDesc')}</p>
              <p className="text-xs mt-2">{t('consumer.config.fileFormat')}: {consumerConfig.fileFormat.toUpperCase()}</p>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex-shrink-0 h-8 border-t border-border flex items-center justify-between px-4 bg-muted/50 text-xs">
        <span className="text-muted-foreground">
          {consumerConfig.mode === 'preview' 
            ? t('consumer.status.totalMessages', { count: messages.length })
            : t('consumer.status.fileMode')
          }
        </span>
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground">
            Start: <span className="text-foreground">{getOffsetLabel()}</span>
          </span>
          <span className="text-muted-foreground">
            Mode: <span className="text-foreground">{consumerConfig.mode === 'file' ? t('consumer.config.mode.file') : t('consumer.config.mode.preview')}</span>
          </span>
          {isConsuming && (
            <span className="flex items-center gap-1.5 text-green-600">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              t('consumer.status.consuming')
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
