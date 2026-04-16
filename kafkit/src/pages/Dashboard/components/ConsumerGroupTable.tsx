import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import { Input } from '../../../components/ui/Input';
import { Skeleton } from '../../../components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import { formatNumber } from '../../../utils/formatters';
import { PartitionDetail } from './PartitionDetail';
import type { DashboardConsumerGroup, SortConfig, HealthStatus } from '../../../types/dashboard';

interface ConsumerGroupTableProps {
  groups: DashboardConsumerGroup[];
  isLoading: boolean;
  sortConfig: SortConfig;
  onSort: (config: SortConfig) => void;
  filterStatus: HealthStatus | 'all';
  onFilterStatus: (status: HealthStatus | 'all') => void;
  searchQuery: string;
  onSearch: (query: string) => void;
  expandedGroup: string | null;
  onToggleExpand: (groupId: string) => void;
}

function getHealthDotClass(status: HealthStatus): string {
  switch (status) {
    case 'healthy':
      return 'bg-green-500';
    case 'warning':
      return 'bg-yellow-500';
    case 'critical':
      return 'bg-red-500';
    default:
      return 'bg-gray-500';
  }
}

function getHealthLabel(t: (key: string) => string, status: HealthStatus): string {
  switch (status) {
    case 'healthy':
      return t('dashboard.health.healthy');
    case 'warning':
      return t('dashboard.health.warning');
    case 'critical':
      return t('dashboard.health.critical');
    default:
      return status;
  }
}

export function ConsumerGroupTable({
  groups,
  isLoading,
  sortConfig,
  onSort,
  filterStatus,
  onFilterStatus,
  searchQuery,
  onSearch,
  expandedGroup,
  onToggleExpand,
}: ConsumerGroupTableProps) {
  const { t } = useTranslation();

  const filteredGroups = useMemo(() => {
    return groups
      .filter((g) => filterStatus === 'all' || g.healthStatus === filterStatus)
      .filter((g) => g.groupId.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortConfig.direction === 'asc'
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }
        return 0;
      });
  }, [groups, sortConfig, filterStatus, searchQuery]);

  const handleSort = (key: SortConfig['key']) => {
    onSort({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'desc' ? 'asc' : 'desc',
    });
  };

  const SortIcon = ({ column }: { column: SortConfig['key'] }) => {
    if (sortConfig.key !== column) {
      return <span className="text-muted-foreground/30 ml-1">↕</span>;
    }
    return <span className="ml-1">{sortConfig.direction === 'desc' ? '↓' : '↑'}</span>;
  };

  return (
    <div className="flex flex-col h-full bg-card rounded-lg border">
      {/* Filter bar */}
      <div className="flex items-center gap-4 p-4 border-b">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t('dashboard.table.search')}
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => onFilterStatus(e.target.value as HealthStatus | 'all')}
          className="h-9 px-3 rounded-md border border-input bg-background text-sm"
        >
          <option value="all">{t('dashboard.filter.all')}</option>
          <option value="healthy">{t('dashboard.health.healthy')}</option>
          <option value="warning">{t('dashboard.health.warning')}</option>
          <option value="critical">{t('dashboard.health.critical')}</option>
        </select>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead className="w-8"></TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('groupId')}
              >
                {t('dashboard.table.groupId')}
                <SortIcon column="groupId" />
              </TableHead>
              <TableHead>{t('dashboard.table.state')}</TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('memberCount')}
              >
                {t('dashboard.table.members')}
                <SortIcon column="memberCount" />
              </TableHead>
              <TableHead>{t('dashboard.table.topics')}</TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('totalLag')}
              >
                {t('dashboard.table.lag')}
                <SortIcon column="totalLag" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : filteredGroups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {t('dashboard.table.noResults')}
                </TableCell>
              </TableRow>
            ) : (
              filteredGroups.map((group) => (
                <>
                  <TableRow
                    key={group.groupId}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onToggleExpand(group.groupId)}
                  >
                    <TableCell>
                      {expandedGroup === group.groupId ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </TableCell>
                    <TableCell>
                      <div
                        className={`w-2 h-2 rounded-full ${getHealthDotClass(group.healthStatus)}`}
                        title={getHealthLabel(t, group.healthStatus)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{group.groupId}</TableCell>
                    <TableCell>{group.state}</TableCell>
                    <TableCell>{group.memberCount}</TableCell>
                    <TableCell>{group.topics.length}</TableCell>
                    <TableCell className="font-mono">{formatNumber(group.totalLag)}</TableCell>
                  </TableRow>
                  {expandedGroup === group.groupId && (
                    <TableRow>
                      <TableCell colSpan={7} className="p-0">
                        <PartitionDetail partitions={group.partitionLags} />
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
