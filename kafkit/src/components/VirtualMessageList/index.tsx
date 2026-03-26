import { useRef, useEffect, memo, useCallback } from 'react';
import type { KafkaMessage } from '../../types';
import './styles.css';

interface VirtualMessageListProps {
  messages: KafkaMessage[];
  filteredMessages: KafkaMessage[];
  isConsuming: boolean;
  autoScroll: boolean;
  onScrollStateChange: (isNearBottom: boolean) => void;
}

// 格式化时间戳

// 单个消息行组件
interface MessageRowProps {
  msg: KafkaMessage;
  index: number;
}

const MessageRow = memo(({ msg, index }: MessageRowProps) => {
  const formatTimestamp = (ts: number): string => {
    const date = new Date(ts);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="border-b border-border hover:bg-muted/30">
      <div className="grid grid-cols-[3rem_4rem_6rem_7rem_8rem_1fr] gap-2 px-3 py-2 items-center text-xs">
        <span className="text-muted-foreground font-mono">{index + 1}</span>
        <span className="font-mono">{msg.partition}</span>
        <span className="font-mono text-right">{msg.offset.toLocaleString()}</span>
        <span className="text-muted-foreground">{formatTimestamp(msg.timestamp || 0)}</span>
        <span className="truncate font-mono text-muted-foreground">{msg.key || '-'}</span>
        <span className="truncate font-mono" title={msg.value}>
          {msg.value.slice(0, 100)}{msg.value.length > 100 && '...'}
        </span>
      </div>
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
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // 简单的翻译函数（避免依赖问题）
  const t = (key: string) => {
    const translations: Record<string, string> = {
      'consumer.waiting': 'Waiting for messages...',
      'consumer.clickToStart': 'Click "Start" to consume messages',
      'consumer.noSearchResults': 'No messages match your search',
      'consumer.columns.index': 'Index',
      'consumer.columns.partition': 'Partition',
      'consumer.columns.offset': 'Offset',
      'consumer.columns.timestamp': 'Timestamp',
      'consumer.columns.key': 'Key',
      'consumer.columns.value': 'Value',
    };
    return translations[key] || key;
  };

  // 自动滚动
  useEffect(() => {
    if (autoScroll && scrollRef.current && filteredMessages.length > 0) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
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
    <div className="flex-1 min-h-0 relative flex flex-col">
      {/* 表头 */}
      <div className="flex-shrink-0 grid grid-cols-[3rem_4rem_6rem_7rem_8rem_1fr] gap-2 px-3 py-2 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground">
        <span>{t('consumer.columns.index')}</span>
        <span>{t('consumer.columns.partition')}</span>
        <span>{t('consumer.columns.offset')}</span>
        <span>{t('consumer.columns.timestamp')}</span>
        <span>{t('consumer.columns.key')}</span>
        <span>{t('consumer.columns.value')}</span>
      </div>
      
      {/* 消息列表 */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto scrollbar-thin"
        onScroll={handleScroll}
      >
        {filteredMessages.map((msg, idx) => (
          <MessageRow
            key={`${msg.partition}-${msg.offset}-${idx}`}
            msg={msg}
            index={messages.indexOf(msg)}
          />
        ))}
      </div>
      
      {/* 消息计数器 */}
      <div className="absolute bottom-2 right-2 bg-background/90 border border-border rounded px-2 py-1 text-xs text-muted-foreground shadow">
        {filteredMessages.length} / {messages.length}
      </div>
    </div>
  );
});

VirtualMessageList.displayName = 'VirtualMessageList';
