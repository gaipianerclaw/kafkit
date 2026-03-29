import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { List, useListRef, useDynamicRowHeight } from 'react-window';
import { Copy, Check, ChevronDown, Database } from 'lucide-react';
import type { KafkaMessage } from '../../types';
import { detectAvroFormat, AvroParser } from '../../utils/schema/avro';
import { detectProtobufFormat, ProtobufParser, parseProtobufFields } from '../../utils/schema/protobuf';
import { SchemaRegistryService, SchemaRegistryConfig, StoredSchema } from '../../services/schemaRegistry';
import './styles.css';

interface VirtualMessageListProps {
  messages: KafkaMessage[];
  filteredMessages: KafkaMessage[];
  isConsuming: boolean;
  autoScroll: boolean;
  onScrollStateChange: (isNearBottom: boolean) => void;
}

// 默认行高
const ROW_HEIGHT_COLLAPSED = 48;
const ROW_HEIGHT_EXPANDED = 350;

// Hook to load schema registries
function useSchemaRegistries(): SchemaRegistryConfig | null {
  const [config, setConfig] = useState<SchemaRegistryConfig | null>(null);
  
  useEffect(() => {
    const saved = localStorage.getItem('kafkit-schema-registries');
    if (saved) {
      try {
        const registries = JSON.parse(saved);
        if (registries.length > 0) {
          setConfig(registries[0].config);
        }
      } catch {
        console.error('Failed to parse schema registries');
      }
    }
  }, []);
  
  return config;
}

// Hook to fetch schema from registry
function useSchemaFromRegistry(schemaId: number | null, config: SchemaRegistryConfig | null) {
  const [schema, setSchema] = useState<StoredSchema | null>(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (!schemaId || !config) {
      setSchema(null);
      return;
    }
    
    setLoading(true);
    const service = new SchemaRegistryService(config);
    
    service.getSchemaById(schemaId)
      .then(setSchema)
      .catch(err => {
        console.error('Failed to fetch schema:', err);
        setSchema(null);
      })
      .finally(() => setLoading(false));
  }, [schemaId, config]);
  
  return { schema, loading };
}

// Extract Confluent schema ID from message
function extractSchemaId(value: string): number | null {
  try {
    const binary = atob(value);
    if (binary.length < 5) return null;
    
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    
    if (bytes[0] !== 0) return null;
    
    const schemaId = (bytes[1] << 24) | (bytes[2] << 16) | (bytes[3] << 8) | bytes[4];
    return schemaId;
  } catch {
    return null;
  }
}

// 检测内容类型
type ContentType = 'json' | 'csv' | 'text' | 'avro' | 'protobuf';
const detectContentType = (str: string): ContentType => {
  if (detectAvroFormat(str) !== 'unknown') return 'avro';
  if (detectProtobufFormat(str) !== 'unknown') return 'protobuf';
  try {
    JSON.parse(str);
    return 'json';
  } catch {
    if (str.includes(',') && str.split('\n').every(line => line.includes(','))) {
      return 'csv';
    }
    return 'text';
  }
};

// 格式化时间戳
const formatShortTimestamp = (ts?: number): string => {
  if (!ts) return '-';
  const date = new Date(ts);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
};

// JSON 渲染器 with syntax highlighting and truncation
const JsonRenderer = ({ data }: { data: unknown }) => {
  const [expandedStrings, setExpandedStrings] = useState<Set<string>>(new Set());
  
  const toggleStringExpand = (key: string) => {
    setExpandedStrings(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };
  
  const renderValue = (value: unknown, level: number = 0, key?: string): React.ReactNode => {
    const indent = level * 12;
    const stringKey = key || `${level}`;
    
    if (value === null) return <span className="text-gray-500">null</span>;
    if (typeof value === 'boolean') return <span className="text-orange-600">{String(value)}</span>;
    if (typeof value === 'number') return <span className="text-blue-600">{value}</span>;
    if (typeof value === 'string') {
      const isExpanded = expandedStrings.has(stringKey);
      const isLong = value.length > 200;
      const displayValue = isLong && !isExpanded ? value.slice(0, 200) + '...' : value;
      
      return (
        <span className="text-green-600">
          &quot;{displayValue}&quot;
          {isLong && (
            <button
              onClick={() => toggleStringExpand(stringKey)}
              className="ml-1 text-xs text-blue-500 hover:text-blue-700 underline"
            >
              {isExpanded ? '收起' : '展开'}
            </button>
          )}
        </span>
      );
    }
    
    if (Array.isArray(value)) {
      if (value.length === 0) return <span>[]</span>;
      return (
        <div style={{ marginLeft: indent }}>
          <span>[</span>
          {value.map((item, idx) => (
            <div key={idx} style={{ marginLeft: 12 }}>
              {renderValue(item, level + 1, `${stringKey}[${idx}]`)}
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
          {entries.map(([k, val], idx) => (
            <div key={k} style={{ marginLeft: 12 }}>
              <span className="text-purple-600">&quot;{k}&quot;</span>
              <span>: </span>
              {renderValue(val, level + 1, `${stringKey}.${k}`)}
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
                <td key={cellIdx} className="py-1 px-2 font-mono">{cell}</td>
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
const AvroRenderer = ({ data, schema }: { data: string; schema?: StoredSchema }) => {
  const parsed = AvroParser.tryParseJson(data);
  
  if (!parsed) {
    return <pre className="text-xs font-mono whitespace-pre-wrap break-all text-foreground">{data}</pre>;
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground flex items-center gap-2">
        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded">Avro</span>
        {schema && (
          <span className="flex items-center gap-1">
            <Database className="w-3 h-3" />
            {schema.subject} v{schema.version}
          </span>
        )}
      </div>
      <JsonRenderer data={parsed} />
    </div>
  );
};

// Protobuf 渲染器
const ProtobufRenderer = ({ data, schema }: { data: string; schema?: StoredSchema }) => {
  const parsed = ProtobufParser.tryParseJson(data);
  
  if (!parsed) {
    try {
      const bytes = ProtobufParser.decodeBase64(data);
      if (bytes.length > 0) {
        const fields = parseProtobufFields(bytes);
        return (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">Protobuf Binary</span>
              {schema && (
                <span className="flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  {schema.subject} v{schema.version}
                </span>
              )}
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
      // 解析失败
    }
    
    return <pre className="text-xs font-mono whitespace-pre-wrap break-all text-foreground">{data}</pre>;
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground flex items-center gap-2">
        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">Protobuf JSON</span>
        {schema && (
          <span className="flex items-center gap-1">
            <Database className="w-3 h-3" />
            {schema.subject} v{schema.version}
          </span>
        )}
      </div>
      <JsonRenderer data={parsed} />
    </div>
  );
};

// 列表项数据类型
interface ListItemData {
  messages: KafkaMessage[];
  allMessages: KafkaMessage[];
  expandedRows: Set<number>;
  toggleExpanded: (index: number) => void;
  registryConfig: SchemaRegistryConfig | null;
  dynamicRowHeight: ReturnType<typeof useDynamicRowHeight>;
}

// 行渲染组件
const MessageRow: FC<any> = ({ index, style, data }) => {
  const { messages, allMessages, expandedRows, toggleExpanded, registryConfig, dynamicRowHeight } = data as ListItemData;
  const msg = messages[index];
  const originalIndex = allMessages.indexOf(msg);
  const isExpanded = expandedRows.has(index);
  const [copied, setCopied] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  
  // Schema Registry
  const schemaId = extractSchemaId(msg.value);
  const { schema } = useSchemaFromRegistry(schemaId, registryConfig);
  
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
  
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(JSON.stringify(messageJson, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  const previewValue = typeof displayValue === 'object' 
    ? JSON.stringify(displayValue)
    : String(displayValue);
  
  // 使用 ResizeObserver 测量实际行高
  useEffect(() => {
    if (!rowRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.contentRect.height;
        // 确保最小高度
        const finalHeight = Math.max(height, isExpanded ? ROW_HEIGHT_EXPANDED : ROW_HEIGHT_COLLAPSED);
        dynamicRowHeight.setRowHeight(index, finalHeight);
      }
    });
    
    observer.observe(rowRef.current);
    
    // 初始设置
    const initialHeight = isExpanded ? ROW_HEIGHT_EXPANDED : ROW_HEIGHT_COLLAPSED;
    dynamicRowHeight.setRowHeight(index, initialHeight);
    
    return () => observer.disconnect();
  }, [index, isExpanded, dynamicRowHeight]);
  
  return (
    <div ref={rowRef} style={style} className="border-b border-border last:border-b-0 bg-white hover:bg-muted/20">
      {/* 表头行 */}
      <div 
        className="grid grid-cols-[2rem_3rem_4rem_6rem_7rem_8rem_1fr_2.5rem] gap-2 px-3 py-2 cursor-pointer select-none items-center"
        onClick={() => toggleExpanded(index)}
      >
        <button 
          className={`
            w-6 h-6 rounded-full flex items-center justify-center
            transition-all duration-200 ease-in-out
            ${isExpanded 
              ? 'bg-primary/10 text-primary rotate-0' 
              : 'bg-muted text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground -rotate-90'
            }
            hover:scale-110 active:scale-95
            shadow-sm hover:shadow
          `}
          title={isExpanded ? '收起' : '展开'}
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        
        <span className="text-xs text-muted-foreground">#{originalIndex + 1}</span>
        
        <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-xs font-medium text-center">
          P{msg.partition}
        </span>
        
        <span className="text-xs text-muted-foreground font-mono">{msg.offset.toLocaleString()}</span>
        
        <span className="text-xs text-muted-foreground">{formatShortTimestamp(msg.timestamp)}</span>
        
        <span className="text-xs text-purple-600 font-mono truncate">
          {msg.key ? (msg.key.length > 12 ? msg.key.slice(0, 12) + '...' : msg.key) : '-'}
        </span>
        
        <span className="text-xs text-muted-foreground truncate font-mono">
          {previewValue.length > 80 ? previewValue.slice(0, 80) + '...' : previewValue}
        </span>
        
        <button
          onClick={handleCopy}
          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground justify-self-center"
          title="Copy JSON"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      
      {/* 展开内容 */}
      {isExpanded && (
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
            {/* Value 内容 - 固定高度可滚动区域 */}
            <div className="p-3 h-64 overflow-auto">
              {contentType === 'json' && <JsonRenderer data={displayValue} />}
              {contentType === 'csv' && <CsvRenderer data={msg.value} />}
              {contentType === 'avro' && <AvroRenderer data={msg.value} schema={schema || undefined} />}
              {contentType === 'protobuf' && <ProtobufRenderer data={msg.value} schema={schema || undefined} />}
              {contentType === 'text' && (
                <pre className="text-xs font-mono whitespace-pre-wrap break-all text-foreground">{msg.value}</pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 主虚拟列表组件
export const VirtualMessageList: FC<VirtualMessageListProps> = ({
  messages,
  filteredMessages,
  isConsuming,
  autoScroll,
  onScrollStateChange,
}) => {
  const { t } = useTranslation();
  const listRef = useListRef();
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const prevLengthRef = useRef(filteredMessages.length);
  
  // 使用动态行高 hook
  const dynamicRowHeight = useDynamicRowHeight({
    defaultRowHeight: ROW_HEIGHT_COLLAPSED,
  });
  
  // Schema Registry config
  const registryConfig = useSchemaRegistries();
  
  // 切换展开状态 - 同时更新行高
  const toggleExpanded = useCallback((index: number) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      
      if (newSet.has(index)) {
        newSet.delete(index);
        dynamicRowHeight.setRowHeight(index, ROW_HEIGHT_COLLAPSED);
      } else {
        newSet.add(index);
        dynamicRowHeight.setRowHeight(index, ROW_HEIGHT_EXPANDED);
      }
      
      return newSet;
    });
  }, [dynamicRowHeight]);
  
  // 当 filteredMessages 变化时，重置所有行高
  useEffect(() => {
    // 清理已不存在行的展开状态
    setExpandedRows(prev => {
      const newSet = new Set<number>();
      prev.forEach(idx => {
        if (idx < filteredMessages.length) {
          newSet.add(idx);
        }
      });
      return newSet;
    });
    
    // 重新计算所有行高
    for (let i = 0; i < filteredMessages.length; i++) {
      const isExpanded = expandedRows.has(i);
      dynamicRowHeight.setRowHeight(i, isExpanded ? ROW_HEIGHT_EXPANDED : ROW_HEIGHT_COLLAPSED);
    }
  }, [filteredMessages.length, dynamicRowHeight]);
  
  // 自动滚动
  useEffect(() => {
    if (autoScroll && listRef.current && filteredMessages.length > prevLengthRef.current) {
      listRef.current.scrollToRow({ index: filteredMessages.length - 1, align: 'end' });
    }
    prevLengthRef.current = filteredMessages.length;
  }, [filteredMessages.length, autoScroll, listRef]);
  
  // 处理滚动
  const handleScroll = useCallback(() => {
    const element = listRef.current?.element;
    if (!element) return;
    const { scrollTop, scrollHeight, clientHeight } = element;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    onScrollStateChange(isNearBottom);
  }, [onScrollStateChange, listRef]);
  
  // 列表项数据
  const itemData = useMemo<ListItemData>(() => ({
    messages: filteredMessages,
    allMessages: messages,
    expandedRows,
    toggleExpanded,
    registryConfig,
    dynamicRowHeight,
  }), [filteredMessages, messages, expandedRows, toggleExpanded, registryConfig, dynamicRowHeight]);
  
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
      <List
        listRef={listRef as any}
        defaultHeight={600}
        rowCount={filteredMessages.length}
        rowHeight={dynamicRowHeight}
        rowProps={{ data: itemData } as any}
        rowComponent={MessageRow as any}
        className="scrollbar-thin"
        onScroll={handleScroll}
      />
      
      {/* 消息计数器 */}
      <div className="absolute bottom-2 right-2 bg-background/90 border border-border rounded px-2 py-1 text-xs text-muted-foreground shadow z-10">
        {filteredMessages.length} / {messages.length}
      </div>
    </div>
  );
};
