import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Users, Settings2, RotateCcw } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useConnectionStore } from '../../stores';
import type { ConsumerGroupInfo, PartitionLag, OffsetResetSpec } from '../../types';
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

// 偏移量重置对话框组件
interface ResetOffsetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  lagData: PartitionLag[];
  onReset: (topic: string, partition: number | undefined, resetTo: OffsetResetSpec) => Promise<void>;
}

function ResetOffsetDialog({ isOpen, onClose, groupId, lagData, onReset }: ResetOffsetDialogProps) {
  const { t } = useTranslation();
  const [selectedTopic, setSelectedTopic] = useState('');
  const [selectedPartition, setSelectedPartition] = useState<string>('all');
  const [resetType, setResetType] = useState<'earliest' | 'latest' | 'timestamp' | 'offset'>('earliest');
  const [timestamp, setTimestamp] = useState('');
  const [offsetValue, setOffsetValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 获取该 Group 消费的所有 Topics
  const topics = useMemo(() => {
    const topicSet = new Set<string>();
    lagData.forEach(item => topicSet.add(item.topic));
    return Array.from(topicSet).sort();
  }, [lagData]);

  // 获取选中 Topic 的分区列表
  const partitions = useMemo(() => {
    if (!selectedTopic) return [];
    return lagData
      .filter(item => item.topic === selectedTopic)
      .map(item => item.partition)
      .sort((a, b) => a - b);
  }, [lagData, selectedTopic]);

  // 重置表单状态
  const resetForm = () => {
    setSelectedTopic(topics[0] || '');
    setSelectedPartition('all');
    setResetType('earliest');
    setTimestamp('');
    setOffsetValue('');
  };

  // 对话框打开时初始化
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!selectedTopic) return;

    setIsLoading(true);
    try {
      let resetSpec: OffsetResetSpec;
      switch (resetType) {
        case 'earliest':
          resetSpec = { type: 'earliest' };
          break;
        case 'latest':
          resetSpec = { type: 'latest' };
          break;
        case 'timestamp':
          resetSpec = { type: 'timestamp', timestamp: new Date(timestamp).getTime() };
          break;
        case 'offset':
          resetSpec = { type: 'offset', offset: parseInt(offsetValue) };
          break;
        default:
          resetSpec = { type: 'earliest' };
      }

      const partition = selectedPartition === 'all' ? undefined : parseInt(selectedPartition);
      await onReset(selectedTopic, partition, resetSpec);
      onClose();
    } catch (err) {
      console.error('Failed to reset offset:', err);
      alert(t('consumerGroups.resetFailed') + ': ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background border border-border rounded-lg shadow-lg w-[480px] max-w-[90vw] max-h-[90vh] overflow-auto">
        <div className="p-4 border-b border-border">
          <h3 className="text-lg font-semibold">{t('consumerGroups.resetOffset.title')}</h3>
          <p className="text-sm text-muted-foreground">{groupId}</p>
        </div>

        <div className="p-4 space-y-4">
          {/* Topic 选择 */}
          <div>
            <label className="block text-sm font-medium mb-2">{t('consumerGroups.resetOffset.topic')}</label>
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="">{t('consumerGroups.resetOffset.selectTopic')}</option>
              {topics.map(topic => (
                <option key={topic} value={topic}>{topic}</option>
              ))}
            </select>
          </div>

          {/* Partition 选择 */}
          <div>
            <label className="block text-sm font-medium mb-2">{t('consumerGroups.resetOffset.partition')}</label>
            <select
              value={selectedPartition}
              onChange={(e) => setSelectedPartition(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
              disabled={!selectedTopic}
            >
              <option value="all">{t('consumerGroups.resetOffset.allPartitions')}</option>
              {partitions.map(p => (
                <option key={p} value={p}>{t('consumerGroups.resetOffset.partition')} {p}</option>
              ))}
            </select>
          </div>

          {/* 重置策略 */}
          <div>
            <label className="block text-sm font-medium mb-2">{t('consumerGroups.resetOffset.strategy')}</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="resetType"
                  value="earliest"
                  checked={resetType === 'earliest'}
                  onChange={(e) => setResetType(e.target.value as any)}
                  className="rounded border-border"
                />
                <span className="text-sm">{t('consumerGroups.resetOffset.earliest')}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="resetType"
                  value="latest"
                  checked={resetType === 'latest'}
                  onChange={(e) => setResetType(e.target.value as any)}
                  className="rounded border-border"
                />
                <span className="text-sm">{t('consumerGroups.resetOffset.latest')}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="resetType"
                  value="timestamp"
                  checked={resetType === 'timestamp'}
                  onChange={(e) => setResetType(e.target.value as any)}
                  className="rounded border-border"
                />
                <span className="text-sm">{t('consumerGroups.resetOffset.timestamp')}</span>
              </label>
              {resetType === 'timestamp' && (
                <input
                  type="datetime-local"
                  value={timestamp}
                  onChange={(e) => setTimestamp(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm ml-6"
                />
              )}
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="resetType"
                  value="offset"
                  checked={resetType === 'offset'}
                  onChange={(e) => setResetType(e.target.value as any)}
                  className="rounded border-border"
                />
                <span className="text-sm">{t('consumerGroups.resetOffset.specificOffset')}</span>
              </label>
              {resetType === 'offset' && (
                <input
                  type="number"
                  value={offsetValue}
                  onChange={(e) => setOffsetValue(e.target.value)}
                  placeholder={t('consumerGroups.resetOffset.offsetPlaceholder')}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm ml-6"
                />
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {t('common.cancel')}
          </Button>
          <Button 
            onClick={handleSubmit} 
            isLoading={isLoading}
            disabled={!selectedTopic || (resetType === 'timestamp' && !timestamp) || (resetType === 'offset' && !offsetValue)}
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            {t('consumerGroups.resetOffset.confirm')}
          </Button>
        </div>
      </div>
    </div>
  );
}

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
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

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
    console.log(`[Kafkit] Fetching lag for group: ${groupId}`);
    try {
      const tauriService = await getService();
      const data = await tauriService.getConsumerLag(activeConnection, groupId);
      console.log(`[Kafkit] Lag data received:`, data);
      // 确保 data 是数组
      const lagArray = Array.isArray(data) ? data : [];
      setLagData(lagArray);
      if (lagArray.length === 0) {
        console.log('[Kafkit] No lag data found for group:', groupId);
      }
    } catch (err) {
      console.error('[Kafkit] Failed to fetch lag:', err);
      setLagData([]);
    } finally {
      setLagLoading(false);
    }
  };

  const handleResetOffset = async (
    topic: string, 
    partition: number | undefined, 
    resetTo: OffsetResetSpec
  ) => {
    if (!activeConnection || !selectedGroup) return;

    setIsResetting(true);
    try {
      const tauriService = await getService();
      await tauriService.resetConsumerOffset(
        activeConnection,
        selectedGroup,
        topic,
        partition,
        resetTo
      );
      // 刷新 Lag 数据
      await fetchLag(selectedGroup);
      alert(t('consumerGroups.resetOffset.success'));
    } catch (err) {
      console.error('Failed to reset offset:', err);
      throw err;
    } finally {
      setIsResetting(false);
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
    <div className="flex-1 flex flex-col h-full min-h-0">
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
        <div className="w-80 border-r border-border overflow-auto min-h-0">
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
                    <span className="font-medium truncate">{group?.groupId || t('common.unknown')}</span>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {t('consumerGroups.members')}: {group?.memberCount ?? 0} | {t('consumerGroups.coordinator')}: {group?.coordinator ?? 0}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Lag Detail */}
        <div className="flex-1 overflow-auto p-4 min-h-0">
          {selectedGroup ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold">{selectedGroup}</h2>
                  <p className="text-sm text-muted-foreground">
                    {t('consumerGroups.totalLag')}: {totalLag.toLocaleString()}
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowResetDialog(true)}
                  isLoading={isResetting}
                >
                  <Settings2 className="w-4 h-4 mr-1" />
                  {t('consumerGroups.resetOffset.title')}
                </Button>
              </div>

              {lagLoading ? (
                <div className="text-center py-8">{t('consumerGroups.status.loading')}</div>
              ) : !lagData || lagData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="mb-2">{t('consumerGroups.status.noData')}</p>
                  <p className="text-xs max-w-md mx-auto">
                    {t('consumerGroups.status.noDataHint') || '可能原因：1. 消费组尚未开始消费 2. 消费组没有提交过 offset 3. 消费组已过期'}
                  </p>
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

      {/* Reset Offset Dialog */}
      <ResetOffsetDialog
        isOpen={showResetDialog}
        onClose={() => setShowResetDialog(false)}
        groupId={selectedGroup || ''}
        lagData={lagData}
        onReset={handleResetOffset}
      />
    </div>
  );
}
