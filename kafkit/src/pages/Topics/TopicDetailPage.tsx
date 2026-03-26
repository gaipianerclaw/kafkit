import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Send, Download, Info, BarChart3, Settings2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useConnectionStore } from '../../stores';
import type { TopicDetail, ConfigEntry } from '../../types';
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

export function TopicDetailPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { topic } = useParams();
  const { activeConnection } = useConnectionStore();

  const [detail, setDetail] = useState<TopicDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 配置编辑相关状态
  const [configs, setConfigs] = useState<ConfigEntry[]>([]);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [editingConfigs, setEditingConfigs] = useState<Record<string, string>>({});
  const [savingConfigs, setSavingConfigs] = useState(false);

  useEffect(() => {
    if (activeConnection && topic) {
      fetchTopicDetail();
    }
  }, [activeConnection, topic]);

  const fetchTopicDetail = async () => {
    if (!activeConnection || !topic) return;

    console.log('[Kafkit] Fetching topic detail for:', decodeURIComponent(topic));
    setLoading(true);
    setError(null);
    try {
      const tauriService = await getService();
      const data = await tauriService.getTopicDetail(activeConnection, decodeURIComponent(topic));
      console.log('[Kafkit] Topic detail:', data);
      setDetail(data);

      // 同时获取配置
      await fetchTopicConfigs();
    } catch (err) {
      console.error('[Kafkit] Failed to fetch topic detail:', err);
      setError(err instanceof Error ? err.message : t('topics.loadError'));
    } finally {
      setLoading(false);
    }
  };

  // 获取 Topic 配置
  const fetchTopicConfigs = async () => {
    if (!activeConnection || !topic) return;

    try {
      const tauriService = await getService();
      const configData = await tauriService.getTopicConfigs(activeConnection, decodeURIComponent(topic));
      setConfigs(configData);
    } catch (err) {
      console.error('[Kafkit] Failed to fetch topic configs:', err);
    }
  };

  // 打开配置编辑对话框
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
    if (!activeConnection || !topic) return;

    setSavingConfigs(true);
    try {
      const tauriService = await getService();

      // 过滤掉空值的配置
      const configsToSave: Record<string, string> = {};
      Object.entries(editingConfigs).forEach(([key, value]) => {
        if (value && value.trim() !== '') {
          configsToSave[key] = value.trim();
        }
      });

      await tauriService.updateTopicConfigs(activeConnection, decodeURIComponent(topic), configsToSave);
      setShowConfigDialog(false);
      await fetchTopicConfigs(); // 刷新配置列表
    } catch (err) {
      console.error('[Kafkit] Failed to update topic configs:', err);
      alert(t('topicDetail.configUpdateFailed') || 'Failed to update configs');
    } finally {
      setSavingConfigs(false);
    }
  };

  const decodedTopic = topic ? decodeURIComponent(topic) : '';

  // 计算统计信息
  const stats = detail ? {
    totalPartitions: detail.partitions.length,
    totalMessages: detail.partitions.reduce((sum, p) => sum + p.messageCount, 0),
    totalReplicas: detail.partitions.reduce((sum, p) => sum + p.replicas.length, 0),
    avgReplicationFactor: detail.partitions.length > 0
      ? (detail.partitions.reduce((sum, p) => sum + p.replicas.length, 0) / detail.partitions.length).toFixed(1)
      : '0',
  } : null;

  return (
    <div className="flex-1 flex flex-col h-full min-h-0">
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
            {!loading && <RefreshCw className="w-4 h-4 mr-2" />}
            {t('common.refresh')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={openConfigDialog}
          >
            <Settings2 className="w-4 h-4 mr-2" />
            {t('topicDetail.editConfigs') || 'Edit Configs'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/main/topics/${topic}/consume`)}
          >
            <Download className="w-4 h-4 mr-2" />
            {t('topics.consume')}
          </Button>
          <Button
            size="sm"
            onClick={() => navigate(`/main/topics/${topic}/produce`)}
          >
            <Send className="w-4 h-4 mr-2" />
            {t('topics.produce')}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-auto min-h-0">
        {error && (
          <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-lg">
            {error}
          </div>
        )}

        {detail && stats && (
          <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <BarChart3 className="w-4 h-4" />
                  <span className="text-sm">{t('topicDetail.stats.totalPartitions')}</span>
                </div>
                <div className="text-2xl font-semibold">{stats.totalPartitions}</div>
              </div>
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Info className="w-4 h-4" />
                  <span className="text-sm">{t('topicDetail.stats.totalMessages')}</span>
                </div>
                <div className="text-2xl font-semibold">{stats.totalMessages.toLocaleString()}</div>
              </div>
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <BarChart3 className="w-4 h-4" />
                  <span className="text-sm">{t('topicDetail.stats.replicationFactor')}</span>
                </div>
                <div className="text-2xl font-semibold">{stats.avgReplicationFactor}</div>
              </div>
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <BarChart3 className="w-4 h-4" />
                  <span className="text-sm">{t('topicDetail.stats.totalReplicas')}</span>
                </div>
                <div className="text-2xl font-semibold">{stats.totalReplicas}</div>
              </div>
            </div>

            {/* Partitions */}
            <div className="bg-card border border-border rounded-lg">
              <div className="px-4 py-3 border-b border-border">
                <h2 className="font-medium">{t('topicDetail.partitions')}</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium">{t('topicDetail.table.partition')}</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">{t('topicDetail.table.leader')}</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">{t('topicDetail.table.replicas')}</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">{t('topicDetail.table.isr')}</th>
                      <th className="px-4 py-2 text-right text-sm font-medium">{t('topicDetail.table.earliestOffset')}</th>
                      <th className="px-4 py-2 text-right text-sm font-medium">{t('topicDetail.table.latestOffset')}</th>
                      <th className="px-4 py-2 text-right text-sm font-medium">{t('topicDetail.table.messageCount')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {detail.partitions.map(p => (
                      <tr key={p.partition} className="hover:bg-muted/50">
                        <td className="px-4 py-2 text-sm font-mono">{p.partition}</td>
                        <td className="px-4 py-2 text-sm">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-primary/10 text-primary">
                            Broker {p.leader}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm">
                          <div className="flex flex-wrap gap-1">
                            {p.replicas.map(r => (
                              <span key={r} className="text-xs px-1.5 py-0.5 bg-muted rounded">
                                {r}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm">
                          <div className="flex flex-wrap gap-1">
                            {p.isr.map(r => (
                              <span key={r} className="text-xs px-1.5 py-0.5 bg-green-50 text-green-700 rounded">
                                {r}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm text-right font-mono">{p.earliestOffset.toLocaleString()}</td>
                        <td className="px-4 py-2 text-sm text-right font-mono">{p.latestOffset.toLocaleString()}</td>
                        <td className="px-4 py-2 text-sm text-right font-mono">{p.messageCount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {detail.partitions.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  {t('topics.empty')}
                </div>
              )}
            </div>

            {/* Configs */}
            {configs.length > 0 && (
              <div className="bg-card border border-border rounded-lg">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <h2 className="font-medium">{t('topicDetail.configs')}</h2>
                  <Button variant="ghost" size="sm" onClick={openConfigDialog}>
                    <Settings2 className="w-4 h-4 mr-2" />
                    {t('topicDetail.editConfigs') || 'Edit'}
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium">{t('topicDetail.configName') || 'Config'}</th>
                        <th className="px-4 py-2 text-left text-sm font-medium">{t('topicDetail.configValue') || 'Value'}</th>
                        <th className="px-4 py-2 text-center text-sm font-medium">{t('topicDetail.configSource') || 'Source'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {configs.map(c => (
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
            )}
          </div>
        )}
      </div>

      {/* Config Edit Dialog */}
      {showConfigDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg w-[600px] max-h-[80vh] flex flex-col">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h2 className="font-medium">{t('topicDetail.editConfigs') || 'Edit Topic Configs'}</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowConfigDialog(false)}>
                ✕
              </Button>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {/* Common Configs */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">{t('topicDetail.commonConfigs') || 'Common Configs'}</h3>
                
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">retention.ms</label>
                  <input
                    type="text"
                    value={editingConfigs['retention.ms'] || ''}
                    onChange={(e) => setEditingConfigs({ ...editingConfigs, 'retention.ms': e.target.value })}
                    placeholder="604800000 (7 days)"
                    className="w-full px-3 py-2 text-sm border border-border rounded bg-background"
                  />
                  <p className="text-xs text-muted-foreground mt-1">{t('topicDetail.retentionHint') || 'Data retention time in milliseconds'}</p>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-1">cleanup.policy</label>
                  <select
                    value={editingConfigs['cleanup.policy'] || ''}
                    onChange={(e) => setEditingConfigs({ ...editingConfigs, 'cleanup.policy': e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-border rounded bg-background"
                  >
                    <option value="">{t('common.select') || 'Select...'}</option>
                    <option value="delete">delete</option>
                    <option value="compact">compact</option>
                    <option value="delete,compact">delete,compact</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-1">min.insync.replicas</label>
                  <input
                    type="text"
                    value={editingConfigs['min.insync.replicas'] || ''}
                    onChange={(e) => setEditingConfigs({ ...editingConfigs, 'min.insync.replicas': e.target.value })}
                    placeholder="1"
                    className="w-full px-3 py-2 text-sm border border-border rounded bg-background"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-1">max.message.bytes</label>
                  <input
                    type="text"
                    value={editingConfigs['max.message.bytes'] || ''}
                    onChange={(e) => setEditingConfigs({ ...editingConfigs, 'max.message.bytes': e.target.value })}
                    placeholder="1048588"
                    className="w-full px-3 py-2 text-sm border border-border rounded bg-background"
                  />
                </div>
              </div>

              {/* Custom Configs */}
              <div className="pt-4 border-t border-border">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">{t('topicDetail.otherConfigs') || 'Other Configs'}</h3>
                <div className="space-y-2 max-h-40 overflow-auto">
                  {Object.entries(editingConfigs)
                    .filter(([key]) => !['retention.ms', 'cleanup.policy', 'min.insync.replicas', 'max.message.bytes'].includes(key))
                    .map(([key, value]) => (
                      <div key={key} className="flex gap-2">
                        <input
                          type="text"
                          value={key}
                          readOnly
                          className="flex-1 px-3 py-1.5 text-sm border border-border rounded bg-muted"
                        />
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => setEditingConfigs({ ...editingConfigs, [key]: e.target.value })}
                          className="flex-1 px-3 py-1.5 text-sm border border-border rounded bg-background"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const { [key]: _, ...rest } = editingConfigs;
                            setEditingConfigs(rest);
                          }}
                          className="text-destructive"
                        >
                          ✕
                        </Button>
                      </div>
                    ))}
                </div>
                
                {/* Add custom config */}
                <div className="flex gap-2 mt-3">
                  <input
                    type="text"
                    id="newConfigKey"
                    placeholder={t('topicDetail.configName') || 'Config name'}
                    className="flex-1 px-3 py-1.5 text-sm border border-border rounded bg-background"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const keyInput = document.getElementById('newConfigKey') as HTMLInputElement;
                      const key = keyInput.value.trim();
                      if (key && !editingConfigs[key]) {
                        setEditingConfigs({ ...editingConfigs, [key]: '' });
                        keyInput.value = '';
                      }
                    }}
                  >
                    {t('common.add') || 'Add'}
                  </Button>
                </div>
              </div>
            </div>
            <div className="px-4 py-3 border-t border-border flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowConfigDialog(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={saveConfigs} isLoading={savingConfigs}>
                {t('common.save')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
