/**
 * TopicPreview - Preview tab for viewing topic details and editing configs
 * Can be converted to consumer/producer tab
 */
import { useState, useEffect, useCallback } from 'react';
import { Eye, Download, Send, RefreshCw, Settings2, Info, BarChart3 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useTabStore } from '../../stores';
import type { TopicDetail, ConfigEntry } from '../../types';

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
  const [configs, setConfigs] = useState<ConfigEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [editingConfigs, setEditingConfigs] = useState<Record<string, string>>({});
  const [savingConfigs, setSavingConfigs] = useState(false);

  // 加载 topic 详情
  const fetchTopicDetail = useCallback(async () => {
    if (!connectionId || !topic) return;

    setLoading(true);
    setError(null);
    try {
      const service = await getService();
      const data = await service.getTopicDetail(connectionId, topic);
      setDetail(data);
      await fetchTopicConfigs();
    } catch (err) {
      console.error('[Kafkit] Failed to fetch topic detail:', err);
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [connectionId, topic]);

  // 加载 topic 配置
  const fetchTopicConfigs = useCallback(async () => {
    if (!connectionId || !topic) return;

    try {
      const service = await getService();
      const configData = await service.getTopicConfigs(connectionId, topic);
      setConfigs(configData);
    } catch (err) {
      console.error('[Kafkit] Failed to fetch topic configs:', err);
    }
  }, [connectionId, topic]);

  useEffect(() => {
    fetchTopicDetail();
  }, [fetchTopicDetail]);

  // 计算总消息数
  const totalMessageCount = detail?.partitions.reduce(
    (sum, p) => sum + (p.latestOffset || 0), 
    0
  ) || 0;

  // 计算 topic 大小（估算）
  const totalSize = detail?.partitions.reduce(
    (sum, p) => sum + ((p.latestOffset - p.earliestOffset) * 100), 
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

  // 打开配置对话框
  const openConfigDialog = () => {
    const configMap: Record<string, string> = {};
    configs.forEach(c => {
      configMap[c.name] = c.value;
    });
    // 添加常用配置项的默认值
    if (!configMap['retention.ms']) configMap['retention.ms'] = '';
    if (!configMap['cleanup.policy']) configMap['cleanup.policy'] = '';
    if (!configMap['min.insync.replicas']) configMap['min.insync.replicas'] = '';
    if (!configMap['max.message.bytes']) configMap['max.message.bytes'] = '';
    setEditingConfigs(configMap);
    setShowConfigDialog(true);
  };

  // 保存配置
  const saveConfigs = async () => {
    if (!connectionId || !topic) return;

    setSavingConfigs(true);
    try {
      const service = await getService();
      const configsToUpdate: Record<string, string> = {};
      Object.entries(editingConfigs)
        .filter(([, value]) => value !== '')
        .forEach(([key, value]) => {
          configsToUpdate[key] = value;
        });
      
      await service.updateTopicConfigs(connectionId, topic, configsToUpdate);
      await fetchTopicConfigs();
      setShowConfigDialog(false);
    } catch (err) {
      console.error('[Kafkit] Failed to save configs:', err);
      alert('保存配置失败: ' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setSavingConfigs(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="text-destructive mb-4">{error}</div>
        <Button onClick={fetchTopicDetail}>
          <RefreshCw className="w-4 h-4 mr-2" />
          重试
        </Button>
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
          <Button variant="outline" size="sm" onClick={openConfigDialog} className="gap-1">
            <Settings2 className="w-4 h-4" />
            配置
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {detail ? (
          <div className="space-y-6 max-w-5xl mx-auto">
            {/* 统计卡片 */}
            <div className="grid grid-cols-4 gap-4">
              <StatCard 
                icon={<BarChart3 className="w-5 h-5" />}
                title="分区数"
                value={detail.partitions.length}
              />
              <StatCard 
                icon={<Info className="w-5 h-5" />}
                title="副本因子"
                value={detail.partitions[0]?.replicas.length || 0}
              />
              <StatCard 
                icon={<BarChart3 className="w-5 h-5" />}
                title="总消息数"
                value={totalMessageCount.toLocaleString()}
              />
              <StatCard 
                icon={<Info className="w-5 h-5" />}
                title="大小"
                value={formatBytes(totalSize)}
              />
            </div>

            {/* 分区详情表格 */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted px-4 py-2 font-medium border-b text-sm">
                分区详情
              </div>
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">分区</th>
                    <th className="text-left px-4 py-2 font-medium">Leader</th>
                    <th className="text-left px-4 py-2 font-medium">Replicas</th>
                    <th className="text-left px-4 py-2 font-medium">ISR</th>
                    <th className="text-right px-4 py-2 font-medium">Latest Offset</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {detail.partitions.map((partition) => (
                    <tr key={partition.partition} className="hover:bg-muted/30">
                      <td className="px-4 py-2">{partition.partition}</td>
                      <td className="px-4 py-2">{partition.leader}</td>
                      <td className="px-4 py-2">{partition.replicas.join(', ')}</td>
                      <td className="px-4 py-2">{partition.isr.join(', ')}</td>
                      <td className="px-4 py-2 text-right">{partition.latestOffset.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 当前配置 */}
            {configs.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted px-4 py-2 font-medium border-b text-sm flex items-center justify-between">
                  <span>Topic 配置</span>
                  <Button variant="ghost" size="sm" onClick={openConfigDialog}>
                    <Settings2 className="w-4 h-4 mr-1" />
                    修改
                  </Button>
                </div>
                <div className="divide-y max-h-64 overflow-auto">
                  {configs.slice(0, 10).map(config => (
                    <div key={config.name} className="px-4 py-2 flex items-center justify-between text-sm">
                      <code className="text-xs bg-muted px-2 py-1 rounded">{config.name}</code>
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

      {/* 配置编辑对话框 */}
      {showConfigDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border rounded-lg shadow-lg w-[500px] max-h-[80vh] flex flex-col">
            <div className="px-4 py-3 border-b font-medium">Topic 配置</div>
            <div className="p-4 overflow-auto flex-1 space-y-4">
              {Object.entries(editingConfigs).map(([configKey, value]) => (
                <div key={configKey}>
                  <label className="text-sm font-medium mb-1 block">{configKey}</label>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => setEditingConfigs(prev => ({ ...prev, [configKey]: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-md text-sm bg-background"
                    placeholder={`输入 ${configKey} 的值`}
                  />
                </div>
              ))}
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowConfigDialog(false)}>
                取消
              </Button>
              <Button onClick={saveConfigs} disabled={savingConfigs}>
                {savingConfigs ? '保存中...' : '保存'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({ icon, title, value }: { icon: React.ReactNode; title: string; value: string | number }) {
  return (
    <div className="border rounded-lg p-4 bg-card">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        {icon}
        <span className="text-sm">{title}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

// Format bytes to human readable
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
