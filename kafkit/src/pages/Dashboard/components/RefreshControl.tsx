import { useTranslation } from 'react-i18next';
import { RefreshCw, Pause, Play } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { formatTimeAgo } from '../../../utils/formatters';

interface RefreshControlProps {
  autoRefresh: boolean;
  onToggle: (value: boolean) => void;
  lastUpdated: number;
  onManualRefresh: () => void;
  isLoading: boolean;
}

export function RefreshControl({
  autoRefresh,
  onToggle,
  lastUpdated,
  onManualRefresh,
  isLoading,
}: RefreshControlProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-3">
      {lastUpdated > 0 && (
        <span className="text-sm text-muted-foreground">
          {t('dashboard.updated', { time: formatTimeAgo(lastUpdated) })}
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
