import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Send, Download } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useConnectionStore } from '../../stores';
import type { TopicDetail } from '../../types';

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

export function TopicDetailPage() {
  const navigate = useNavigate();
  const { topic } = useParams();
  const { activeConnection } = useConnectionStore();
  
  const [detail, setDetail] = useState<TopicDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeConnection && topic) {
      fetchTopicDetail();
    }
  }, [activeConnection, topic]);

  const fetchTopicDetail = async () => {
    if (!activeConnection || !topic) return;
    
    setLoading(true);
    setError(null);
    try {
      const tauriService = await getService();
      const data = await tauriService.getTopicDetail(activeConnection, decodeURIComponent(topic));
      setDetail(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const decodedTopic = topic ? decodeURIComponent(topic) : '';

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="h-14 border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" onClick={() => navigate('/main/topics')} className="mr-2">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-lg font-semibold">{decodedTopic}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchTopicDetail} isLoading={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate(`/main/topics/${topic}/consume`)}
          >
            <Download className="w-4 h-4 mr-2" />
            消费
          </Button>
          <Button 
            size="sm" 
            onClick={() => navigate(`/main/topics/${topic}/produce`)}
          >
            <Send className="w-4 h-4 mr-2" />
            发送
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-auto">
        {error && (
          <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-lg">
            {error}
          </div>
        )}

        {detail && (
          <div className="space-y-6">
            {/* Partitions */}
            <div className="bg-card border border-border rounded-lg">
              <div className="px-4 py-3 border-b border-border">
                <h2 className="font-medium">分区信息</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium">Partition</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">Leader</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">Replicas</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">ISR</th>
                      <th className="px-4 py-2 text-right text-sm font-medium">Earliest Offset</th>
                      <th className="px-4 py-2 text-right text-sm font-medium">Latest Offset</th>
                      <th className="px-4 py-2 text-right text-sm font-medium">消息数</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {detail.partitions.map(p => (
                      <tr key={p.partition} className="hover:bg-muted/50">
                        <td className="px-4 py-2 text-sm">{p.partition}</td>
                        <td className="px-4 py-2 text-sm">{p.leader}</td>
                        <td className="px-4 py-2 text-sm">{p.replicas.join(', ')}</td>
                        <td className="px-4 py-2 text-sm">{p.isr.join(', ')}</td>
                        <td className="px-4 py-2 text-sm text-right">{p.earliestOffset.toLocaleString()}</td>
                        <td className="px-4 py-2 text-sm text-right">{p.latestOffset.toLocaleString()}</td>
                        <td className="px-4 py-2 text-sm text-right">{p.messageCount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Configs */}
            <div className="bg-card border border-border rounded-lg">
              <div className="px-4 py-3 border-b border-border">
                <h2 className="font-medium">配置参数</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium">配置项</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">值</th>
                      <th className="px-4 py-2 text-center text-sm font-medium">来源</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {detail.configs.map(c => (
                      <tr key={c.name} className="hover:bg-muted/50">
                        <td className="px-4 py-2 text-sm font-mono">{c.name}</td>
                        <td className="px-4 py-2 text-sm">{c.value}</td>
                        <td className="px-4 py-2 text-sm text-center">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            c.default ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'
                          }`}>
                            {c.source}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
