/**
 * TopicPreview - Preview tab for viewing topic details
 * Can be converted to consumer/producer tab
 */
import { useState, useEffect, useCallback } from 'react';
import { Eye, Download, Send, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useTabStore } from '../../stores';
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

interface TopicPreviewProps {
  tabId: string;
  topic: string;
  connectionId: string;
}

export function TopicPreview({ tabId, topic, connectionId }: TopicPreviewProps) {
  const { convertTab } = useTabStore();
  const [detail, setDetail] = useState<TopicDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // 加载 topic 详情
  const fetchTopicDetail = useCallback(async () => {
    try {
      const service = await getService();
      const result = await service.getTopicDetail(connectionId, topic);
      setDetail(result);
    } catch (error) {
      console.error('Failed to fetch topic detail:', error);
    } finally {
      setLoading(false);
    }
  }, [connectionId, topic]);

  useEffect(() => {
    fetchTopicDetail();
  }, [fetchTopicDetail]);

  // 计算总消息数
  const totalMessageCount = detail?.partitions.reduce(
    (sum, p) => sum + (p.messageCount || 0), 
    0
  ) || 0;

  // 转换为消费者 tab
  const handleStartConsume = () => {
    convertTab(tabId, 'consumer');
  };

  // 转换为生产者 tab
  const handleStartProduce = () => {
    convertTab(tabId, 'producer');
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-background">
      {/* Header */}
      <div className="h-14 border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{topic}</span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded flex items-center gap-1">
            <Eye className="w-3 h-3" />
            预览
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleStartConsume} className="gap-1">
            <Download className="w-4 h-4" />
            开始消费
          </Button>
          <Button variant="outline" size="sm" onClick={handleStartProduce} className="gap-1">
            <Send className="w-4 h-4" />
            发送消息
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {detail ? (
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* 基本信息卡片 */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">分区数</p>
                <p className="text-2xl font-semibold">{detail.partitions.length}</p>
              </div>
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">副本因子</p>
                <p className="text-2xl font-semibold">
                  {detail.partitions[0]?.replicas.length || 0}
                </p>
              </div>
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">消息总数</p>
                <p className="text-2xl font-semibold">{totalMessageCount.toLocaleString()}</p>
              </div>
            </div>

            {/* 分区详情 */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/50">
                <h3 className="text-sm font-medium">分区信息</h3>
              </div>
              <div className="divide-y divide-border">
                {detail.partitions.map(partition => (
                  <div key={partition.partition} className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium w-16">分区 {partition.partition}</span>
                      <span className="text-xs text-muted-foreground">
                        Leader: {partition.leader}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>ISR: {partition.isr.join(', ')}</span>
                      <span>Replicas: {partition.replicas.join(', ')}</span>
                      <span>消息数: {partition.messageCount.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Topic 配置 */}
            {detail.configs.length > 0 && (
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-muted/50">
                  <h3 className="text-sm font-medium">Topic 配置</h3>
                </div>
                <div className="divide-y divide-border">
                  {detail.configs.slice(0, 10).map(config => (
                    <div key={config.name} className="px-4 py-2 flex items-center justify-between text-sm">
                      <span className="font-mono text-xs">{config.name}</span>
                      <span className="text-muted-foreground">{config.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-12">
            <p>无法加载 Topic 详情</p>
          </div>
        )}
      </div>
    </div>
  );
}
