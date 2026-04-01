/**
 * TopicPanel - Left side panel for topic management
 * Similar to IDEA Kafka plugin layout
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Download, Send, ChevronLeft, ChevronRight, Folder, Server, ChevronDown, Plus, Settings } from 'lucide-react';
import { useConnectionStore, useTabStore } from '../../stores';
import { useNavigate } from 'react-router-dom';

interface TopicInfo {
  name: string;
  partitionCount: number;
  isInternal: boolean;
}

interface TopicPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  selectedTopic: string | null;
  onSelectTopic: (topic: string) => void;
}

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

export function TopicPanel({ isOpen, onToggle, selectedTopic, onSelectTopic }: TopicPanelProps) {
  const navigate = useNavigate();
  const { activeConnection, connections, setActiveConnection } = useConnectionStore();
  const { tabs, addTab } = useTabStore();
  const [topics, setTopics] = useState<TopicInfo[]>([]);
  const [filterText, setFilterText] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConnectionMenu, setShowConnectionMenu] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    topic: TopicInfo;
  } | null>(null);

  // Fetch topics
  useEffect(() => {
    if (!activeConnection || !isOpen) return;
    
    const fetchTopics = async () => {
      setLoading(true);
      try {
        const tauriService = await getService();
        const result = await tauriService.listTopics(activeConnection);
        setTopics(result);
      } catch (error) {
        console.error('Failed to fetch topics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTopics();
  }, [activeConnection, isOpen]);

  // Filter topics
  const filteredTopics = useMemo(() => {
    if (!filterText.trim()) return topics;
    const lowerFilter = filterText.toLowerCase();
    return topics.filter(t => t.name.toLowerCase().includes(lowerFilter));
  }, [topics, filterText]);

  // Check if tab limit reached
  const canAddTab = tabs.length < 10;

  const activeConn = connections.find(c => c.id === activeConnection);

  const handleOpenConsumer = useCallback((topicName: string) => {
    if (!activeConnection) return;
    if (!canAddTab) {
      alert('最多只能打开 10 个标签页，请先关闭部分标签');
      return;
    }
    addTab('consumer', topicName, activeConnection);
  }, [activeConnection, addTab, canAddTab]);

  const handleOpenProducer = useCallback((topicName: string) => {
    if (!activeConnection) return;
    if (!canAddTab) {
      alert('最多只能打开 10 个标签页，请先关闭部分标签');
      return;
    }
    addTab('producer', topicName, activeConnection);
  }, [activeConnection, addTab, canAddTab]);

  const handleContextMenu = useCallback((e: React.MouseEvent, topic: TopicInfo) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      topic
    });
  }, []);

  const handleTopicClick = useCallback((topicName: string) => {
    onSelectTopic(topicName);
  }, [onSelectTopic]);

  const handleDoubleClick = useCallback((topicName: string) => {
    handleOpenConsumer(topicName);
  }, [handleOpenConsumer]);

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  if (!isOpen) {
    return (
      <div className="w-8 h-full border-r border-border bg-muted/20 flex flex-col items-center py-2">
        <button
          onClick={onToggle}
          className="p-1.5 rounded hover:bg-muted transition-colors"
          title="展开 Topic 面板"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="w-64 h-full border-r border-border bg-card flex flex-col">
        {/* Connection Selector - At the top */}
        <div className="h-14 border-b border-border flex items-center px-3">
          <div className="relative w-full">
            <button
              onClick={() => setShowConnectionMenu(!showConnectionMenu)}
              className="w-full flex items-center gap-2 px-3 py-2 bg-muted rounded-md hover:bg-muted/80 transition-colors text-sm"
            >
              <Server className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="truncate flex-1 text-left">
                {activeConn ? activeConn.name : '选择连接'}
              </span>
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                activeConn?.isConnected ? 'bg-green-500' : 'bg-gray-400'
              }`} />
              <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </button>

            {showConnectionMenu && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50">
                {connections.map(conn => (
                  <button
                    key={conn.id}
                    onClick={() => {
                      setActiveConnection(conn.id);
                      setShowConnectionMenu(false);
                    }}
                    className={`w-full flex items-center px-3 py-2 text-sm hover:bg-muted transition-colors text-left ${
                      activeConnection === conn.id ? 'bg-muted' : ''
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full mr-2 ${
                      conn.isConnected ? 'bg-green-500' : 'bg-gray-400'
                    }`} />
                    <span className="truncate">{conn.name}</span>
                  </button>
                ))}
                <div className="border-t border-border my-1" />
                <button
                  onClick={() => {
                    navigate('/main/connections/new');
                    setShowConnectionMenu(false);
                  }}
                  className="w-full flex items-center px-3 py-2 text-sm text-primary hover:bg-muted transition-colors text-left"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  新建连接
                </button>
                <button
                  onClick={() => {
                    navigate('/main/connections');
                    setShowConnectionMenu(false);
                  }}
                  className="w-full flex items-center px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors text-left"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  管理连接
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="搜索 Topic..."
              className="w-full pl-9 pr-3 py-1.5 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Topic List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              加载中...
            </div>
          ) : filteredTopics.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {filterText ? '没有找到匹配的 Topic' : '暂无 Topic'}
            </div>
          ) : (
            <div className="py-1">
              {filteredTopics.map((topic) => (
                <TopicItem
                  key={topic.name}
                  topic={topic}
                  isSelected={topic.name === selectedTopic}
                  onClick={() => handleTopicClick(topic.name)}
                  onOpenConsumer={() => handleOpenConsumer(topic.name)}
                  onOpenProducer={() => handleOpenProducer(topic.name)}
                  onContextMenu={(e) => handleContextMenu(e, topic)}
                  onDoubleClick={() => handleDoubleClick(topic.name)}
                  disabled={!canAddTab && !activeConnection}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer - Count */}
        <div className="h-8 border-t border-border flex items-center justify-between px-3 text-xs text-muted-foreground">
          <span>共 {filteredTopics.length} 个 Topic</span>
          <button
            onClick={onToggle}
            className="p-1 rounded hover:bg-muted transition-colors"
            title="收起"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-popover border border-border rounded-md shadow-lg py-1 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => {
              handleOpenConsumer(contextMenu.topic.name);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            打开消费者
          </button>
          <button
            onClick={() => {
              handleOpenProducer(contextMenu.topic.name);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            打开生产者
          </button>
        </div>
      )}
    </>
  );
}

// Topic Item Component
interface TopicItemProps {
  topic: TopicInfo;
  isSelected: boolean;
  onClick: () => void;
  onOpenConsumer: () => void;
  onOpenProducer: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  disabled?: boolean;
}

function TopicItem({ topic, isSelected, onClick, onOpenConsumer, onOpenProducer, onContextMenu, onDoubleClick, disabled }: TopicItemProps) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className={`group relative px-3 py-2 cursor-pointer transition-colors ${
        isSelected 
          ? 'bg-primary/10 border-r-2 border-r-primary' 
          : 'hover:bg-muted/50'
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onDoubleClick={onDoubleClick}
    >
      <div className="flex items-center gap-2">
        <Folder className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
        <span className={`flex-1 truncate text-sm ${isSelected ? 'font-medium' : ''}`} title={topic.name}>
          {topic.name}
        </span>
        
        {/* Action Icons - Show on hover */}
        {!topic.isInternal && showActions && !disabled && (
          <div className="flex items-center gap-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenConsumer();
              }}
              className="p-1 rounded hover:bg-muted-foreground/20 transition-colors"
              title="打开消费者"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenProducer();
              }}
              className="p-1 rounded hover:bg-muted-foreground/20 transition-colors"
              title="打开生产者"
            >
              <Send className="w-3.5 h-3.5 text-green-600" />
            </button>
          </div>
        )}
      </div>
      
      {/* Partition count badge */}
      <div className="ml-6 text-xs text-muted-foreground">
        {topic.partitionCount} 分区
        {topic.isInternal && <span className="ml-2 text-amber-600">internal</span>}
      </div>
    </div>
  );
}
