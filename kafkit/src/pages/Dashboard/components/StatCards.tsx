import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Activity, TrendingUp } from 'lucide-react';
import { Skeleton } from '../../../components/ui/skeleton';
import { formatNumber } from '../../../utils/formatters';
import type { DashboardConsumerGroup, DashboardStats } from '../../../types/dashboard';

interface StatCardsProps {
  groups: DashboardConsumerGroup[];
  isLoading: boolean;
}

function calculateStats(groups: DashboardConsumerGroup[]): DashboardStats {
  return groups.reduce(
    (acc, group) => {
      acc.totalGroups++;
      acc.totalLag += group.totalLag;
      
      switch (group.healthStatus) {
        case 'healthy':
          acc.healthy++;
          break;
        case 'warning':
          acc.warning++;
          break;
        case 'critical':
          acc.critical++;
          break;
      }
      
      return acc;
    },
    {
      totalGroups: 0,
      healthy: 0,
      warning: 0,
      critical: 0,
      totalLag: 0,
    }
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  isLoading: boolean;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

function StatCard({ title, value, subtitle, icon, isLoading, variant = 'default' }: StatCardProps) {
  const variantClasses = {
    default: 'bg-card',
    success: 'bg-green-500/10 border-green-500/20',
    warning: 'bg-yellow-500/10 border-yellow-500/20',
    danger: 'bg-red-500/10 border-red-500/20',
  };

  return (
    <div className={`p-4 rounded-lg border ${variantClasses[variant]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          {isLoading ? (
            <Skeleton className="h-8 w-20 mt-1" />
          ) : (
            <>
              <p className="text-2xl font-bold mt-1">{value}</p>
              {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
            </>
          )}
        </div>
        <div className="p-2 bg-background rounded-md">{icon}</div>
      </div>
    </div>
  );
}

export function StatCards({ groups, isLoading }: StatCardsProps) {
  const { t } = useTranslation();
  const stats = useMemo(() => calculateStats(groups), [groups]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
      <StatCard
        title={t('dashboard.stats.totalGroups')}
        value={stats.totalGroups}
        icon={<Users className="w-5 h-5 text-muted-foreground" />}
        isLoading={isLoading}
      />
      
      <StatCard
        title={t('dashboard.stats.healthStatus')}
        value={`${stats.healthy}/${stats.warning}/${stats.critical}`}
        subtitle={t('dashboard.stats.healthSubtitle')}
        icon={<Activity className="w-5 h-5 text-muted-foreground" />}
        isLoading={isLoading}
        variant={stats.critical > 0 ? 'danger' : stats.warning > 0 ? 'warning' : 'success'}
      />
      
      <StatCard
        title={t('dashboard.stats.totalLag')}
        value={formatNumber(stats.totalLag)}
        icon={<TrendingUp className="w-5 h-5 text-muted-foreground" />}
        isLoading={isLoading}
      />
    </div>
  );
}
