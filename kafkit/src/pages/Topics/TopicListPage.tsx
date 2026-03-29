import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Search, Plus, Trash2, Eye, Send, Download, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Pagination } from '../../components/Pagination';
import { useConnectionStore } from '../../stores';
import type { TopicInfo } from '../../types';
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

// 新建 Topic 对话框组件
function CreateTopicDialog({ 
  isOpen, 
  onClose, 
  onCreate 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onCreate: (name: string, partitions: number, replicas: number) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [partitions, setPartitions] = useState(1);
  const [replicas, setReplicas] = useState(1);
  const [creating, setCreating] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setCreating(true);
    try {
      await onCreate(name.trim(), partitions, replicas);
      setName('');
      setPartitions(1);
      setReplicas(1);
      onClose();
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background border border-border rounded-lg shadow-lg w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">{t('topics.createTitle')}</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('topics.name')}</label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
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
                value={partitions}
                onChange={e => setPartitions(parseInt(e.target.value) || 1)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('topics.replicationFactor')}</label>
              <Input
                type="number"
                min={1}
                max={10}
                value={replicas}
                onChange={e => setReplicas(parseInt(e.target.value) || 1)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t('topics.replicationFactorHint') || '注意：单节点 Kafka 只能设置为 1'}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" isLoading={creating}>
              {t('common.create')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 删除 Topic 确认对话框组件
function DeleteTopicDialog({
  isOpen,
  onClose,
  onConfirm,
  topicName,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  topicName: string;
}) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState('');
  const [deleting, setDeleting] = useState(false);

  if (!isOpen) return null;

  const isMatch = inputValue.trim() === topicName;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMatch) return;

    setDeleting(true);
    try {
      await onConfirm();
      setInputValue('');
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background border border-border rounded-lg shadow-lg w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-destructive">{t('topics.deleteTitle')}</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
            <p className="text-sm text-destructive">
              {t('topics.deleteWarning', { name: topicName })}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              {t('topics.deleteConfirmLabel')}
            </label>
            <Input
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder={topicName}
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t('topics.deleteConfirmHint', { name: topicName })}
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={deleting}>
              {t('common.cancel')}
            </Button>
            <Button 
              type="submit" 
              variant="destructive"
              isLoading={deleting}
              disabled={!isMatch}
            >
              {t('common.delete')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function TopicListPage() {
  const navigate = useNavigate();
  const { activeConnection } = useConnectionStore();
  const { t } = useTranslation();
  
  const [topics, setTopics] = useState<TopicInfo[]>([]);
  const [filteredTopics, setFilteredTopics] = useState<TopicInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [topicToDelete, setTopicToDelete] = useState<string | null>(null);
  const lastFetchedConnectionRef = useRef<string | null>(null);
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [paginatedTopics, setPaginatedTopics] = useState<TopicInfo[]>([]);

  useEffect(() => {
    // 只在 activeConnection 变化时才重新获取，返回时不刷新
    if (activeConnection && activeConnection !== lastFetchedConnectionRef.current) {
      lastFetchedConnectionRef.current = activeConnection;
      fetchTopics();
    }
  }, [activeConnection]);

  // 监听全局刷新事件
  useEffect(() => {
    const handleRefresh = () => {
      console.log('[TopicListPage] Refresh triggered by keyboard shortcut');
      if (activeConnection) {
        fetchTopics();
      }
    };
    
    window.addEventListener('kafkit:refresh', handleRefresh);
    return () => window.removeEventListener('kafkit:refresh', handleRefresh);
  }, [activeConnection]);

  useEffect(() => {
    let result = topics;
    
    // 搜索过滤
    if (searchQuery) {
      result = topics.filter(t => 
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setFilteredTopics(result);
    // 重置到第一页
    setCurrentPage(1);
  }, [searchQuery, topics]);
  
  // 分页计算
  useEffect(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    setPaginatedTopics(filteredTopics.slice(startIndex, endIndex));
  }, [filteredTopics, currentPage, pageSize]);

  const fetchTopics = async () => {
    if (!activeConnection) return;
    
    setLoading(true);
    setError(null);
    try {
      const tauriService = await getService();
      const data = await tauriService.listTopics(activeConnection);
      setTopics(data);
      setFilteredTopics(data);
    } catch (err) {
      console.error('[Kafkit] Failed to fetch topics:', err);
      setError(err instanceof Error ? err.message : t('topics.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTopic = async (name: string, partitions: number, replicas: number) => {
    if (!activeConnection) return;
    
    try {
      const tauriService = await getService();
      await tauriService.createTopic(activeConnection, name, partitions, replicas);
      await fetchTopics();
    } catch (err) {
      alert(t('topics.createError') + ': ' + (err instanceof Error ? err.message : t('common.unknownError')));
      throw err;
    }
  };

  const handleDeleteClick = (topicName: string, event?: React.MouseEvent) => {
    if (!activeConnection) return;
    
    // 阻止事件冒泡和默认行为
    event?.stopPropagation();
    event?.preventDefault();
    
    setTopicToDelete(topicName);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!activeConnection || !topicToDelete) return;

    console.log('[Kafkit] Deleting topic:', topicToDelete);
    try {
      const tauriService = await getService();
      await tauriService.deleteTopic(activeConnection, topicToDelete);
      console.log('[Kafkit] Topic deleted successfully:', topicToDelete);
      await fetchTopics();
      setTopicToDelete(null);
    } catch (err) {
      console.error('[Kafkit] Failed to delete topic:', err);
      alert(t('topics.deleteError') + ': ' + (err instanceof Error ? err.message : t('common.unknownError')));
      throw err;
    }
  };

  if (!activeConnection) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">{t('topics.selectConnection')}</p>
          <Button onClick={() => navigate('/')}>{t('common.back')}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="h-14 border-b border-border flex items-center justify-between px-4 flex-shrink-0">
        <h1 className="text-lg font-semibold">{t('topics.title')}</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchTopics} isLoading={loading}>
            {!loading && <RefreshCw className="w-4 h-4 mr-2" />}
            {t('common.refresh')}
          </Button>
          <Button size="sm" onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('topics.create')}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto min-h-0">
        {/* Search */}
        <div className="mb-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('topics.searchPlaceholder')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-lg">
            {error}
          </div>
        )}

        {/* Loading Overlay */}
        {loading && topics.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>{t('common.loading')}</span>
            </div>
          </div>
        )}

        {/* Table */}
        {!loading || topics.length > 0 ? (
          <div className="border border-border rounded-lg overflow-hidden relative">
            {/* Table Loading Overlay */}
            {loading && (
              <div className="absolute inset-0 bg-background/60 flex items-center justify-center z-10">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">{t('topics.name')}</th>
                  <th className="px-4 py-3 text-center text-sm font-medium">{t('topics.partitions')}</th>
                  <th className="px-4 py-3 text-center text-sm font-medium">{t('topics.replicationFactor')}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedTopics.map(topic => (
                  <tr key={topic.name} className="hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        {topic.isInternal && (
                          <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded mr-2">
                            internal
                          </span>
                        )}
                        <span className="font-medium">{topic.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm">{topic.partitionCount}</td>
                    <td className="px-4 py-3 text-center text-sm">{topic.replicationFactor}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/main/topics/${encodeURIComponent(topic.name)}`)}
                          title={t('topics.viewDetail')}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/main/topics/${encodeURIComponent(topic.name)}/consume`)}
                          title={t('topics.consume')}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/main/topics/${encodeURIComponent(topic.name)}/produce`)}
                          title={t('topics.produce')}
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                        {!topic.isInternal && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleDeleteClick(topic.name, e)}
                            title={t('common.delete')}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Pagination */}
            {filteredTopics.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(filteredTopics.length / pageSize)}
                totalItems={filteredTopics.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />
            )}
          </div>
        ) : null}

        {/* Empty State */}
        {!loading && filteredTopics.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchQuery ? t('topics.noMatch') : t('topics.empty')}
            </p>
          </div>
        )}
      </div>

      {/* Create Topic Dialog */}
      <CreateTopicDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreate={handleCreateTopic}
      />

      {/* Delete Topic Dialog */}
      {topicToDelete && (
        <DeleteTopicDialog
          isOpen={showDeleteDialog}
          onClose={() => {
            setShowDeleteDialog(false);
            setTopicToDelete(null);
          }}
          onConfirm={handleDeleteConfirm}
          topicName={topicToDelete}
        />
      )}
    </div>
  );
}
