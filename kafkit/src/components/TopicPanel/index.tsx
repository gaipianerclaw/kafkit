/**
 * TopicPanel - Left side panel for topic management
 * Similar to IDEA Kafka plugin layout
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Download, Send, ChevronLeft, ChevronRight, Folder, Server, ChevronDown, Plus, Settings, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
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
  selectedTopic?: string | null;
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

export function TopicPanel({ isOpen, onToggle, selectedTopic }: TopicPanelProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
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

  // Create topic dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicPartitions, setNewTopicPartitions] = useState(1);
  const [newTopicReplicas, setNewTopicReplicas] = useState(1);
  const [creating, setCreating] = useState(false);

  // Delete topic dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [topicToDelete, setTopicToDelete] = useState<TopicInfo | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [deleting, setDeleting] = useState(false);

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

  // 点击 topic 创建预览 tab
  const handleTopicClick = useCallback((topicName: string) => {
    if (!activeConnection) return;
    if (!canAddTab) {
      alert('最多只能打开 10 个标签页，请先关闭部分标签');
      return;
    }
    // 创建预览 tab
    addTab('topic-preview', topicName, activeConnection);
  }, [activeConnection, addTab, canAddTab]);

  // 双击创建消费者 tab（保留快捷操作）
  const handleDoubleClick = useCallback((topicName: string) => {
    handleOpenConsumer(topicName);
  }, [handleOpenConsumer]);

  // 创建 Topic
  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConnection || !newTopicName.trim()) return;

    setCreating(true);
    try {
      const tauriService = await getService();
      await tauriService.createTopic(activeConnection, newTopicName.trim(), newTopicPartitions, newTopicReplicas);
      setNewTopicName('');
      setNewTopicPartitions(1);
      setNewTopicReplicas(1);
      setShowCreateDialog(false);
      fetchTopics();
    } catch (err) {
      alert(t('topics.createError') + ': ' + (err instanceof Error ? err.message : t('common.unknownError')));
    } finally {
      setCreating(false);
    }
  };

  // 删除 Topic
  const handleDeleteClick = (topic: TopicInfo) => {
    setTopicToDelete(topic);
    setDeleteConfirmInput('');
    setShowDeleteDialog(true);
    setContextMenu(null);
  };

  const handleDeleteConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConnection || !topicToDelete) return;

    setDeleting(true);
    try {
      const tauriService = await getService();
      await tauriService.deleteTopic(activeConnection, topicToDelete.name);
      setShowDeleteDialog(false);
      setTopicToDelete(null);
      fetchTopics();
    } catch (err) {
      alert(t('topics.deleteError') + ': ' + (err instanceof Error ? err.message : t('common.unknownError')));
    } finally {
      setDeleting(false);
    }
  };

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

        {/* Search and Create */}
        <div className="p-3 border-b border-border flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder={t('topics.searchPlaceholder')}
              className="w-full pl-9 pr-3 py-1.5 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {activeConnection && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCreateDialog(true)}
              title={t('topics.create')}
            >
              <Plus className="w-4 h-4" />
            </Button>
          )}
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
            {t('topics.openConsumer')}
          </button>
          <button
            onClick={() => {
              handleOpenProducer(contextMenu.topic.name);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            {t('topics.openProducer')}
          </button>
          {!contextMenu.topic.isInternal && (
            <>
              <div className="border-t border-border my-1" />
              <button
                onClick={() => handleDeleteClick(contextMenu.topic)}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors flex items-center gap-2 text-destructive"
              >
                <Trash2 className="w-4 h-4" />
                {t('common.delete')}
              </button>
            </>
          )}
        </div>
      )}

      {/* Create Topic Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background border border-border rounded-lg shadow-lg w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold">{t('topics.createTitle')}</h2>
            </div>
            <form onSubmit={handleCreateTopic} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t('topics.name')}</label>
                <Input
                  value={newTopicName}
                  onChange={e => setNewTopicName(e.target.value)}
                  placeholder="my-topic"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('topics.partitions')}</label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={newTopicPartitions}
                    onChange={e => setNewTopicPartitions(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('topics.replicationFactor')}</label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={newTopicReplicas}
                    onChange={e => setNewTopicReplicas(parseInt(e.target.value) || 1)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{t('topics.replicationFactorHint')}</p>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" isLoading={creating}>
                  {t('common.create')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Topic Dialog */}
      {showDeleteDialog && topicToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background border border-border rounded-lg shadow-lg w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-destructive">{t('topics.deleteTitle')}</h2>
            </div>
            <form onSubmit={handleDeleteConfirm} className="p-6 space-y-4">
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
                <p className="text-sm text-destructive">
                  {t('topics.deleteWarning', { name: topicToDelete.name })}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('topics.deleteConfirmLabel')}</label>
                <Input
                  value={deleteConfirmInput}
                  onChange={e => setDeleteConfirmInput(e.target.value)}
                  placeholder={topicToDelete.name}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground mt-1">{t('topics.deleteConfirmHint', { name: topicToDelete.name })}</p>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={deleting}>
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  isLoading={deleting}
                  disabled={deleteConfirmInput.trim() !== topicToDelete.name}
                >
                  {t('common.delete')}
                </Button>
              </div>
            </form>
          </div>
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
