import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Users } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useConnectionStore } from '../../stores';
import type { ConsumerGroupInfo, PartitionLag } from '../../types';
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

export function GroupListPage() {
  const navigate = useNavigate();
  const { activeConnection } = useConnectionStore();
  const { t } = useTranslation();
  
  const [groups, setGroups] = useState<ConsumerGroupInfo[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [lagData, setLagData] = useState<PartitionLag[]>([]);
  const [loading, setLoading] = useState(false);
  const [lagLoading, setLagLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeConnection) {
      fetchGroups();
    }
  }, [activeConnection]);

  useEffect(() => {
    if (selectedGroup) {
      fetchLag(selectedGroup);
    }
  }, [selectedGroup]);

  const fetchGroups = async () => {
    if (!activeConnection) return;
    
    setLoading(true);
    setError(null);
    try {
      const tauriService = await getService();
      const data = await tauriService.listConsumerGroups(activeConnection);
      // 确保 data 是数组
      setGroups(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch groups:', err);
      setError(err instanceof Error ? err.message : t('consumerGroups.errors.loadFailed'));
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchLag = async (groupId: string) => {
    if (!activeConnection) return;
    
    setLagLoading(true);
    try {
      const tauriService = await getService();
      const data = await tauriService.getConsumerLag(activeConnection, groupId);
      // 确保 data 是数组
      setLagData(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch lag:', err);
      setLagData([]);
    } finally {
      setLagLoading(false);
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'Stable': return 'bg-green-500';
      case 'PreparingRebalance': return 'bg-yellow-500';
      case 'CompletingRebalance': return 'bg-blue-500';
      case 'Dead': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const totalLag = (lagData || []).reduce((sum, item) => sum + (item?.lag || 0), 0);

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
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="h-14 border-b border-border flex items-center justify-between px-4">
        <h1 className="text-lg font-semibold">{t('consumerGroups.title')}</h1>
        <Button variant="outline" size="sm" onClick={fetchGroups} isLoading={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {t('consumerGroups.refresh')}
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Group List */}
        <div className="w-80 border-r border-border overflow-auto">
          {error && (
            <div className="p-4 bg-red-50 text-red-600 text-sm">
              {t('common.error')}: {error}
            </div>
          )}
          {!groups || groups.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              {loading ? t('consumerGroups.status.loading') : t('consumerGroups.status.empty')}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {groups.map((group, index) => (
                <button
                  key={group?.groupId || index}
                  onClick={() => setSelectedGroup(group?.groupId || null)}
                  className={`w-full p-4 text-left hover:bg-muted/50 transition-colors ${
                    selectedGroup === group?.groupId ? 'bg-muted' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${getStateColor(group?.state)}`} />
                    <span className="font-medium truncate">{group?.groupId || 'Unknown'}</span>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Members: {group?.memberCount ?? 0} | Coordinator: {group?.coordinator ?? 0}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Lag Detail */}
        <div className="flex-1 overflow-auto p-4">
          {selectedGroup ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold">{selectedGroup}</h2>
                  <p className="text-sm text-muted-foreground">
                    {t('consumerGroups.totalLag')}: {totalLag.toLocaleString()}
                  </p>
                </div>
              </div>

              {lagLoading ? (
                <div className="text-center py-8">{t('consumerGroups.status.loading')}</div>
              ) : !lagData || lagData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t('consumerGroups.status.noData')}
                </div>
              ) : (
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium">{t('consumerGroups.columns.topic')}</th>
                        <th className="px-4 py-2 text-center text-sm font-medium">{t('consumerGroups.columns.partition')}</th>
                        <th className="px-4 py-2 text-right text-sm font-medium">{t('consumerGroups.columns.currentOffset')}</th>
                        <th className="px-4 py-2 text-right text-sm font-medium">{t('consumerGroups.columns.logEnd')}</th>
                        <th className="px-4 py-2 text-right text-sm font-medium">{t('consumerGroups.columns.lag')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {lagData.map((item, idx) => (
                        <tr key={idx} className="hover:bg-muted/50">
                          <td className="px-4 py-2 text-sm">{item?.topic || '-'}</td>
                          <td className="px-4 py-2 text-sm text-center">{item?.partition ?? '-'}</td>
                          <td className="px-4 py-2 text-sm text-right">{(item?.currentOffset ?? 0).toLocaleString()}</td>
                          <td className="px-4 py-2 text-sm text-right">{(item?.logEndOffset ?? 0).toLocaleString()}</td>
                          <td className="px-4 py-2 text-sm text-right">
                            <span className={`${(item?.lag ?? 0) > 1000 ? 'text-red-500 font-medium' : ''}`}>
                              {(item?.lag ?? 0).toLocaleString()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Users className="w-12 h-12 mb-4" />
              <p>{t('consumerGroups.selectGroup')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
