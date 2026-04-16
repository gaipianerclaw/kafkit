import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity } from 'lucide-react';
import { useConnectionStore } from '../../stores';
import { useDashboardData } from './hooks/useDashboardData';
import { RefreshControl } from './components/RefreshControl';
import { StatCards } from './components/StatCards';
import { LagTrendChart } from './components/LagTrendChart';
import { ConsumerGroupTable } from './components/ConsumerGroupTable';
import { EmptyState } from './components/EmptyState';
import type { SortConfig, HealthStatus } from '../../types/dashboard';

export function DashboardPage() {
  const { t } = useTranslation();
  const { activeConnection, connections } = useConnectionStore();
  
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'totalLag', direction: 'desc' });
  const [filterStatus, setFilterStatus] = useState<HealthStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const { groups, trendData, isLoading, error, lastUpdated, refresh } = useDashboardData(
    activeConnection || '',
    autoRefresh
  );

  const handleToggleExpand = useCallback((groupId: string) => {
    setExpandedGroup((prev) => (prev === groupId ? null : groupId));
  }, []);

  // Get active connection name for display
  const activeConnectionName = connections.find(c => c.id === activeConnection)?.name || activeConnection;

  if (!activeConnection) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <Activity className="w-12 h-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">{t('dashboard.noConnection')}</h2>
        <p className="text-muted-foreground mt-2">{t('dashboard.selectConnection')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 gap-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('dashboard.connection')}: {activeConnectionName}
          </p>
        </div>
        <RefreshControl
          autoRefresh={autoRefresh}
          onToggle={setAutoRefresh}
          lastUpdated={lastUpdated}
          onManualRefresh={refresh}
          isLoading={isLoading}
        />
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg shrink-0">
          <p className="font-medium">{t('dashboard.error.title')}</p>
          <p className="text-sm">{error.message}</p>
          <button
            onClick={refresh}
            className="mt-2 text-sm underline hover:no-underline"
          >
            {t('dashboard.error.retry')}
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <StatCards groups={groups} isLoading={isLoading} />

      {/* Trend Chart */}
      <div className="shrink-0 h-64">
        <LagTrendChart data={trendData} />
      </div>

      {/* Consumer Group Table */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {groups.length === 0 && !isLoading && !error ? (
          <EmptyState onRefresh={refresh} />
        ) : (
          <ConsumerGroupTable
            groups={groups}
            isLoading={isLoading}
            sortConfig={sortConfig}
            onSort={setSortConfig}
            filterStatus={filterStatus}
            onFilterStatus={setFilterStatus}
            searchQuery={searchQuery}
            onSearch={setSearchQuery}
            expandedGroup={expandedGroup}
            onToggleExpand={handleToggleExpand}
          />
        )}
      </div>
    </div>
  );
}

export default DashboardPage;
