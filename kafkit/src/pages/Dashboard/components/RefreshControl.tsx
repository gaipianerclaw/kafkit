import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Pause, Play } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

interface RefreshControlProps {
  autoRefresh: boolean;
  onToggle: (value: boolean) => void;
  lastUpdated: number;
  onManualRefresh: () => void;
  isLoading: boolean;
}

function useLocalizedTimeAgo(timestamp: number, t: (key: string, options?: Record<string, unknown>) => string) {
  return useMemo(() => {
    if (timestamp <= 0) return '';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 5) return t('timeAgo.justNow');
    if (seconds < 60) return t('timeAgo.secondsAgo', { count: seconds });

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return t('timeAgo.minutesAgo', { count: minutes });

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('timeAgo.hoursAgo', { count: hours });

    const days = Math.floor(hours / 24);
    return t('timeAgo.daysAgo', { count: days });
  }, [timestamp, t]);
}

export function RefreshControl({
  autoRefresh,
  onToggle,
  lastUpdated,
  onManualRefresh,
  isLoading,
}: RefreshControlProps) {
  const { t } = useTranslation();
  const timeAgo = useLocalizedTimeAgo(lastUpdated, t);

  return (
    <div className="flex items-center gap-3">
      {lastUpdated > 0 && (
        <span className="text-sm text-muted-foreground">
          {t('dashboard.updated', { time: timeAgo })}
        </span>
      )}
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => onToggle(!autoRefresh)}
        className="gap-2"
      >
        {autoRefresh ? (
          <>
            <Pause className="w-4 h-4" />
            {t('dashboard.pause')}
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            {t('dashboard.resume')}
          </>
        )}
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={onManualRefresh}
        disabled={isLoading}
        className="gap-2"
      >
        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        {t('dashboard.refresh')}
      </Button>
    </div>
  );
}
