import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Search, Plus, Trash2, Eye, Send, Download } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useConnectionStore } from '../../stores';
import * as tauriService from '../../services/tauriService';
import type { TopicInfo } from '../../types';

export function TopicListPage() {
  const navigate = useNavigate();
  const { activeConnection } = useConnectionStore();
  
  const [topics, setTopics] = useState<TopicInfo[]>([]);
  const [filteredTopics, setFilteredTopics] = useState<TopicInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeConnection) {
      fetchTopics();
    }
  }, [activeConnection]);

  useEffect(() => {
    if (searchQuery) {
      setFilteredTopics(topics.filter(t => 
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
      ));
    } else {
      setFilteredTopics(topics);
    }
  }, [searchQuery, topics]);

  const fetchTopics = async () => {
    if (!activeConnection) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await tauriService.listTopics(activeConnection);
      setTopics(data);
      setFilteredTopics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (topicName: string) => {
    if (!activeConnection) return;
    if (!confirm(`确定要删除 Topic "${topicName}" 吗？此操作不可恢复！`)) return;

    try {
      await tauriService.deleteTopic(activeConnection, topicName);
      await fetchTopics();
    } catch (err) {
      alert('删除失败: ' + (err instanceof Error ? err.message : '未知错误'));
    }
  };

  if (!activeConnection) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">请先选择一个连接</p>
          <Button onClick={() => navigate('/')}>返回首页</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="h-14 border-b border-border flex items-center justify-between px-4">
        <h1 className="text-lg font-semibold">Topics</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchTopics} isLoading={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Button size="sm" onClick={() => {}}>
            <Plus className="w-4 h-4 mr-2" />
            新建 Topic
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-auto">
        {/* Search */}
        <div className="mb-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索 Topic..."
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

        {/* Table */}
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Topic 名称</th>
                <th className="px-4 py-3 text-center text-sm font-medium">分区数</th>
                <th className="px-4 py-3 text-center text-sm font-medium">副本因子</th>
                <th className="px-4 py-3 text-right text-sm font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredTopics.map(topic => (
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
                        title="查看详情"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/main/topics/${encodeURIComponent(topic.name)}/consume`)}
                        title="消费消息"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/main/topics/${encodeURIComponent(topic.name)}/produce`)}
                        title="发送消息"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                      {!topic.isInternal && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(topic.name)}
                          title="删除"
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
        </div>

        {/* Empty State */}
        {!loading && filteredTopics.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchQuery ? '未找到匹配的 Topic' : '暂无 Topic'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
