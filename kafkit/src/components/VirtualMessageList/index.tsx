import { useRef, useCallback, useEffect, memo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { useTranslation } from 'react-i18next';
import type { KafkaMessage } from '../../types';
import { Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import './styles.css';

interface VirtualMessageListProps {
  messages: KafkaMessage[];
  filteredMessages: KafkaMessage[];
  isConsuming: boolean;
  autoScroll: boolean;
  onScrollStateChange: (isNearBottom: boolean) => void;
  searchQuery: string;
  onMessageCountChange?: (count: number) => void;
}

// 判断是否为 JSON 字符串
const isJsonString = (str: string): boolean => {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
};

// 检测内容类型
type ContentType = 'json' | 'text';
const detectContentType = (str: string): ContentType => {
  if (isJsonString(str)) return 'json';
  return 'text';
};

// 格式化 JSON
const formatJson = (str: string): string => {
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch {
    return str;
  }
};

// 单个消息行组件
interface MessageRowProps {
  msg: KafkaMessage;
  index: number;
  style: React.CSSProperties;
}

const MessageRow = memo(({ msg, index, style }: MessageRowProps) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(msg.value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Copy failed:', e);
    }
  };

  const contentType = detectContentType(msg.value);
  const displayValue = expanded 
    ? (contentType === 'json' ? formatJson(msg.value) : msg.value)
    : msg.value.slice(0, 200) + (msg.value.length > 200 ? '...' : '');

  const formatTimestamp = (ts: number): string => {
    const date = new Date(ts);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }) + '.' + String(date.getMilliseconds()).padStart(3, '0');
  };

  // 根据内容长度计算行高
  const rowHeight = expanded ? 'auto' : 40;

  return (
    <div style={{...style, height: rowHeight}} className="virtual-message-row border-b border-border">
      {/* 紧凑视图 */}
      <div 
        className="grid grid-cols-[2rem_3rem_4rem_6rem_7rem_8rem_1fr_2.5rem] gap-2 px-3 py-2 hover:bg-muted/50 cursor-pointer items-center"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-xs text-muted-foreground">
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </span>
        <span className="text-xs text-muted-foreground font-mono">{index + 1}</span>
        <span className="text-xs font-mono">{msg.partition}</span>
        <span className="text-xs font-mono text-right">{msg.offset.toLocaleString()}</span>
        <span className="text-xs text-muted-foreground">{formatTimestamp(msg.timestamp)}</span>
        <span className="text-xs truncate font-mono text-muted-foreground">{msg.key || '-'}</span>
        <span className="text-xs truncate font-mono">{msg.value.slice(0, 100)}{msg.value.length > 100 && '...'}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleCopy();
          }}
          className="p-1 hover:bg-muted rounded flex items-center justify-center"
          title={t('common.copy')}
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* 展开详情 */}
      {expanded && (
        <div className="px-3 py-2 bg-muted/30 border-t border-border">
          <div className="grid grid-cols-2 gap-4 mb-2 text-xs">
            <div><span className="text-muted-foreground">Offset:</span> <span className="font-mono">{msg.offset}</span></div>
            <div><span className="text-muted-foreground">Partition:</span> <span className="font-mono">{msg.partition}</span></div>
            <div><span className="text-muted-foreground">Timestamp:</span> <span className="font-mono">{msg.timestamp} ({formatTimestamp(msg.timestamp)})</span></div>
            <div><span className="text-muted-foreground">Key:</span> <span className="font-mono">{msg.key || '(null)'}</span></div>
            <div><span className="text-muted-foreground">Size:</span> <span className="font-mono">{new Blob([msg.value]).size} bytes</span></div>
            <div><span className="text-muted-foreground">Type:</span> <span className="font-mono">{contentType}</span></div>
          </div>
          <div className="mt-2">
            <div className="text-xs text-muted-foreground mb-1">Value:</div>
            <pre className="text-xs font-mono bg-muted/50 p-2 rounded overflow-x-auto whitespace-pre-wrap break-all max-h-96 overflow-y-auto">
              {displayValue}
            </pre>
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
  searchQuery,
  onMessageCountChange,
}: VirtualMessageListProps) => {
  const { t } = useTranslation();
  const listRef = useRef<List>(null);
  const outerRef = useRef<HTMLDivElement>(null);

  // 通知父组件消息数量变化
  useEffect(() => {
    onMessageCountChange?.(filteredMessages.length);
  }, [filteredMessages.length, onMessageCountChange]);

  // 滚动到底部
  useEffect(() => {
    if (autoScroll && listRef.current && filteredMessages.length > 0) {
      listRef.current.scrollToItem(filteredMessages.length - 1, 'end');
    }
  }, [filteredMessages.length, autoScroll]);

  // 行渲染器
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const msg = filteredMessages[index];
    const originalIndex = messages.indexOf(msg);
    return (
      <MessageRow
        msg={msg}
        index={originalIndex}
        style={style}
      />
    );
  }, [filteredMessages, messages]);

  // 处理滚动
  const handleScroll = useCallback(({ scrollOffset }: { scrollOffset: number }) => {
    if (!outerRef.current) return;
    const { scrollHeight, clientHeight } = outerRef.current;
    const isNearBottom = scrollHeight - scrollOffset - clientHeight < 100;
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
      <List
        ref={listRef}
        outerRef={outerRef}
        height={400}
        itemCount={filteredMessages.length}
        itemSize={40}
        width="100%"
        onScroll={handleScroll}
        className="scrollbar-thin"
        overscanCount={5}
      >
        {Row}
      </List>
      {/* 消息计数器 */}
      <div className="absolute bottom-2 right-2 bg-background/90 border border-border rounded px-2 py-1 text-xs text-muted-foreground shadow">
        {t('consumer.virtualScroll.showing', { visible: filteredMessages.length, total: messages.length })}
      </div>
    </div>
  );
});

VirtualMessageList.displayName = 'VirtualMessageList';
