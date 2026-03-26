import { useRef, useEffect, memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';
import type { KafkaMessage } from '../../types';
import { detectAvroFormat, AvroParser } from '../../utils/schema/avro';
import { detectProtobufFormat, ProtobufParser, parseProtobufFields } from '../../utils/schema/protobuf';
import './styles.css';

interface VirtualMessageListProps {
  messages: KafkaMessage[];
  filteredMessages: KafkaMessage[];
  isConsuming: boolean;
  autoScroll: boolean;
  onScrollStateChange: (isNearBottom: boolean) => void;
}

// 检测内容类型
type ContentType = 'json' | 'csv' | 'text' | 'avro' | 'protobuf';
const detectContentType = (str: string): ContentType => {
  // 先检测 Avro
  if (detectAvroFormat(str) !== 'unknown') {
    return 'avro';
  }
  // 再检测 Protobuf
  if (detectProtobufFormat(str) !== 'unknown') {
    return 'protobuf';
  }
  // 检测 JSON
  try {
    JSON.parse(str);
    return 'json';
  } catch {
    // 检测 CSV
    if (str.includes(',') && str.split('\n').every(line => line.includes(','))) {
      return 'csv';
    }
    return 'text';
  }
};

// JSON 渲染器
const JsonRenderer = ({ data }: { data: unknown }) => {
  const renderValue = (value: unknown, level: number = 0): JSX.Element => {
    const indent = level * 12;
    
    if (value === null) return <span className="text-gray-500">null</span>;
    if (typeof value === 'boolean') return <span className="text-orange-600">{String(value)}</span>;
    if (typeof value === 'number') return <span className="text-blue-600">{value}</span>;
    if (typeof value === 'string') return <span className="text-green-600">&quot;{value}&quot;</span>;
    
    if (Array.isArray(value)) {
      if (value.length === 0) return <span>[]</span>;
      return (
        <div style={{ marginLeft: indent }}>
          <span>[</span>
          {value.map((item, idx) => (
            <div key={idx} style={{ marginLeft: 12 }}>
              {renderValue(item, level + 1)}
              {idx < value.length - 1 && <span>,</span>}
            </div>
          ))}
          <span>]</span>
        </div>
      );
    }
    
    if (typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>);
      if (entries.length === 0) return <span>{'{}'}</span>;
      return (
        <div style={{ marginLeft: indent }}>
          <span>{'{'}</span>
          {entries.map(([key, val], idx) => (
            <div key={key} style={{ marginLeft: 12 }}>
              <span className="text-purple-600">&quot;{key}&quot;</span>
              <span>: </span>
              {renderValue(val, level + 1)}
              {idx < entries.length - 1 && <span>,</span>}
            </div>
          ))}
          <span>{'}'}</span>
        </div>
      );
    }
    
    return <span>{String(value)}</span>;
  };
  
  return (
    <pre className="text-xs font-mono whitespace-pre-wrap break-all">
      {renderValue(data)}
    </pre>
  );
};

// CSV 渲染器
const CsvRenderer = ({ data }: { data: string }) => {
  const { t } = useTranslation();
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
  
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            {headers.map((h, i) => (
              <th key={i} className="text-left py-1 px-2 font-medium text-muted-foreground bg-muted/50">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 20).map((row, rowIdx) => (
            <tr key={rowIdx} className="border-b border-border/50">
              {row.map((cell, cellIdx) => (
                <td key={cellIdx} className="py-1 px-2 font-mono">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 20 && (
        <div className="text-xs text-muted-foreground text-center py-2">
          {t('consumer.rowsLeft', { count: rows.length - 20 })}
        </div>
      )}
    </div>
  );
};

// Avro 渲染器
const AvroRenderer = ({ data }: { data: string }) => {
  const parsed = AvroParser.tryParseJson(data);
  
  if (!parsed) {
    return (
      <pre className="text-xs font-mono whitespace-pre-wrap break-all text-foreground">
        {data}
      </pre>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground flex items-center gap-2">
        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded">Avro</span>
      </div>
      <JsonRenderer data={parsed} />
    </div>
  );
};

// Protobuf 渲染器
const ProtobufRenderer = ({ data }: { data: string }) => {
  const parsed = ProtobufParser.tryParseJson(data);
  
  if (!parsed) {
    // 尝试解析 base64
    try {
      const bytes = ProtobufParser.decodeBase64(data);
      if (bytes.length > 0) {
        const fields = parseProtobufFields(bytes);
        return (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">Protobuf Binary</span>
            </div>
            <div className="text-xs font-mono">
              {fields.map((f, i) => (
                <div key={i} className="py-1 border-b border-border/30">
                  <span className="text-muted-foreground">Field {f.field}:</span>
                  <span className="ml-2">{typeof f.value === 'string' ? f.value : `[${f.type}]`}</span>
                </div>
              ))}
            </div>
          </div>
        );
      }
    } catch {
      // 解析失败，显示原始数据
    }
    
    return (
      <pre className="text-xs font-mono whitespace-pre-wrap break-all text-foreground">
        {data}
      </pre>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground flex items-center gap-2">
        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">Protobuf JSON</span>
      </div>
      <JsonRenderer data={parsed} />
    </div>
  );
};

// 单个消息行组件
interface MessageRowProps {
  msg: KafkaMessage;
  index: number;
}

const MessageRow = memo(({ msg, index }: MessageRowProps) => {
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

  const formatShortTimestamp = (ts?: number) => {
    if (!ts) return '-';
    const date = new Date(ts);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
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
          title="Copy JSON"
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
              <span><span className="text-muted-foreground">Size:</span> <span className="font-mono">{((msg.size || 0) / 1024).toFixed(2)} KB</span></span>
              <span><span className="text-muted-foreground">Type:</span> <span className="font-mono uppercase">{contentType}</span></span>
            </div>
            {/* Value 内容 */}
            <div className="p-3 max-h-96 overflow-auto">
              {contentType === 'json' && <JsonRenderer data={displayValue} />}
              {contentType === 'csv' && <CsvRenderer data={msg.value} />}
              {contentType === 'avro' && <AvroRenderer data={msg.value} />}
              {contentType === 'protobuf' && <ProtobufRenderer data={msg.value} />}
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

MessageRow.displayName = 'MessageRow';

// 虚拟列表组件
export const VirtualMessageList = memo(({
  messages,
  filteredMessages,
  isConsuming,
  autoScroll,
  onScrollStateChange,
}: VirtualMessageListProps) => {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredMessages.length, autoScroll]);

  // 处理滚动
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    onScrollStateChange(isNearBottom);
  }, [onScrollStateChange]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        {isConsuming ? t('consumer.waiting') : t('consumer.clickToStart')}
      </div>
    );
  }

  if (filteredMessages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        {t('consumer.noSearchResults')}
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 relative">
      <div 
        ref={scrollRef}
        className="h-full overflow-y-auto scrollbar-thin"
        onScroll={handleScroll}
      >
        {filteredMessages.map((msg, idx) => (
          <MessageRow
            key={`${msg.partition}-${msg.offset}-${idx}`}
            msg={msg}
            index={messages.indexOf(msg)}
          />
        ))}
        <div ref={messagesEndRef} className="h-4" />
      </div>
      
      {/* 消息计数器 */}
      <div className="absolute bottom-2 right-2 bg-background/90 border border-border rounded px-2 py-1 text-xs text-muted-foreground shadow z-10">
        {filteredMessages.length} / {messages.length}
      </div>
    </div>
  );
});

VirtualMessageList.displayName = 'VirtualMessageList';
