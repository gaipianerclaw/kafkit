/**
 * TopicDetailView - Display topic details in workspace
 * Similar to TopicDetailPage but embedded in the workspace
 */
import { useEffect, useState } from 'react';
import { RefreshCw, Download, Send, Info, BarChart3, Settings2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useConnectionStore, useTabStore } from '../../stores';
import type { TopicDetail as TopicDetailType, ConfigEntry } from '../../types';
import { useTranslation } from 'react-i18next';

interface TopicDetailViewProps {
  topicName: string;
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

export function TopicDetailView({ topicName }: TopicDetailViewProps) {
  const { t } = useTranslation();
  void t; // Reserved for future i18n use
  const { activeConnection } = useConnectionStore();
  const { tabs, addTab } = useTabStore();

  const [detail, setDetail] = useState<TopicDetailType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configs, setConfigs] = useState<ConfigEntry[]>([]);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [editingConfigs, setEditingConfigs] = useState<Record<string, string>>({});
  const [savingConfigs, setSavingConfigs] = useState(false);

  // Check if tab limit reached
  const canAddTab = tabs.length < 10;

  useEffect(() => {
    if (activeConnection && topicName) {
      fetchTopicDetail();
    }
  }, [activeConnection, topicName]);

  const fetchTopicDetail = async () => {
    if (!activeConnection || !topicName) return;

    setLoading(true);
    setError(null);
    try {
      const tauriService = await getService();
      const data = await tauriService.getTopicDetail(activeConnection, topicName);
      setDetail(data);
      await fetchTopicConfigs();
    } catch (err) {
      console.error('[Kafkit] Failed to fetch topic detail:', err);
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchTopicConfigs = async () => {
    if (!activeConnection || !topicName) return;

    try {
      const tauriService = await getService();
      const configData = await tauriService.getTopicConfigs(activeConnection, topicName);
      setConfigs(configData);
    } catch (err) {
      console.error('[Kafkit] Failed to fetch topic configs:', err);
    }
  };

  const handleOpenConsumer = () => {
    if (!activeConnection) return;
    if (!canAddTab) {
      alert('最多只能打开 10 个标签页，请先关闭部分标签');
      return;
    }
    addTab('consumer', topicName, activeConnection);
  };

  const handleOpenProducer = () => {
    if (!activeConnection) return;
    if (!canAddTab) {
      alert('最多只能打开 10 个标签页，请先关闭部分标签');
      return;
    }
    addTab('producer', topicName, activeConnection);
  };

  const openConfigDialog = () => {
    const configMap: Record<string, string> = {};
    configs.forEach(c => {
      configMap[c.name] = c.value;
    });
    if (!configMap['retention.ms']) configMap['retention.ms'] = '';
    if (!configMap['cleanup.policy']) configMap['cleanup.policy'] = '';
    if (!configMap['min.insync.replicas']) configMap['min.insync.replicas'] = '';
    if (!configMap['max.message.bytes']) configMap['max.message.bytes'] = '';
    setEditingConfigs(configMap);
    setShowConfigDialog(true);
  };

  const saveConfigs = async () => {
    if (!activeConnection || !topicName) return;

    setSavingConfigs(true);
    try {
      const tauriService = await getService();
      const configsToUpdate: Record<string, string> = {};
      Object.entries(editingConfigs)
        .filter(([, value]) => value !== '')
        .forEach(([key, value]) => {
          configsToUpdate[key] = value;
        });
      
      await tauriService.updateTopicConfigs(activeConnection, topicName, configsToUpdate);
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
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-destructive mb-4">{error}</div>
        <Button onClick={fetchTopicDetail}>
          <RefreshCw className="w-4 h-4 mr-2" />
          重试
        </Button>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        请选择 Topic 查看详情
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">{topicName}</h1>
          <p className="text-sm text-muted-foreground">
            {topicName.startsWith('__') ? 'Internal Topic' : 'User Topic'} · {detail.partitions.length} 分区
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleOpenConsumer} disabled={!canAddTab}>
            <Download className="w-4 h-4 mr-2" />
            打开消费者
          </Button>
          <Button onClick={handleOpenProducer} disabled={!canAddTab}>
            <Send className="w-4 h-4 mr-2" />
            打开生产者
          </Button>
          <Button variant="outline" onClick={openConfigDialog}>
            <Settings2 className="w-4 h-4 mr-2" />
            配置
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
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
          value={detail.partitions.reduce((sum, p) => sum + (p.latestOffset || 0), 0).toLocaleString()}
        />
        <StatCard 
          icon={<Info className="w-5 h-5" />}
          title="大小"
          value={formatBytes(detail.partitions.reduce((sum, p) => sum + ((p.latestOffset - p.earliestOffset) * 100), 0))}
        />
      </div>

      {/* Partitions Table */}
      <div className="border rounded-lg overflow-hidden mb-6">
        <div className="bg-muted px-4 py-2 font-medium border-b">
          分区详情
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2">分区</th>
              <th className="text-left px-4 py-2">Leader</th>
              <th className="text-left px-4 py-2">Replicas</th>
              <th className="text-left px-4 py-2">ISR</th>
              <th className="text-right px-4 py-2">Offset</th>
            </tr>
          </thead>
          <tbody>
            {detail.partitions.map((partition) => (
              <tr key={partition.partition} className="border-t">
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

      {/* Config Dialog */}
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
                    className="w-full px-3 py-2 border rounded-md text-sm"
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
