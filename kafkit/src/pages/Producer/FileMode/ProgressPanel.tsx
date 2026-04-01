import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle, Loader2, Square } from 'lucide-react';
import { SendProgress } from './types';

interface ProgressPanelProps {
  progress: SendProgress;
  error: string | null;
  isActive: boolean;
  onCancel: () => void;
}

export function ProgressPanel({ progress, error, isActive, onCancel }: ProgressPanelProps) {
  const { t } = useTranslation();
  
  // Ensure values don't go negative or exceed 100%
  const safeCurrent = Math.max(0, progress.current);
  const safeTotal = Math.max(safeCurrent, progress.total); // Total should be at least current
  const remaining = Math.max(0, safeTotal - safeCurrent);
  
  const percent = safeTotal > 0 
    ? Math.min(100, Math.round((safeCurrent / safeTotal) * 100)) 
    : 0;
  
  // Consider complete when not active and no remaining (or explicitly marked)
  const isComplete = !isActive && remaining === 0 && safeTotal > 0;

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            {isComplete 
              ? t('producer.fileMode.progress.completed')
              : isActive 
                ? t('producer.fileMode.progress.sending')
                : t('producer.fileMode.progress.paused')
            }
          </span>
          <span className="text-muted-foreground">
            {safeCurrent} / {safeTotal} ({percent}%)
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 ${
              error ? 'bg-destructive' : 'bg-primary'
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-background border border-border rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-2xl font-semibold">{progress.sent}</span>
          </div>
          <span className="text-sm text-muted-foreground">{t('producer.fileMode.progress.sent')}</span>
        </div>
        <div className="bg-background border border-border rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <XCircle className="w-4 h-4 text-destructive" />
            <span className="text-2xl font-semibold">{progress.failed}</span>
          </div>
          <span className="text-sm text-muted-foreground">{t('producer.fileMode.progress.failed')}</span>
        </div>
        <div className="bg-background border border-border rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Loader2 className={`w-4 h-4 ${isActive ? 'animate-spin' : ''}`} />
            <span className="text-2xl font-semibold">
              {remaining}
            </span>
          </div>
          <span className="text-sm text-muted-foreground">{t('producer.fileMode.progress.remaining')}</span>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
          <p className="text-sm text-destructive font-medium">
            {t('producer.fileMode.progress.error')}
          </p>
          <p className="text-sm text-destructive/80 mt-1">{error}</p>
        </div>
      )}

      {/* Cancel button */}
      {isActive && (
        <div className="flex justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 flex items-center gap-2"
          >
            <Square className="w-4 h-4" />
            {t('producer.fileMode.progress.cancel')}
          </button>
        </div>
      )}

      {/* Success message */}
      {isComplete && !error && progress.failed === 0 && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
          <p className="text-green-600 font-medium">
            {t('producer.fileMode.progress.allSent')}
          </p>
        </div>
      )}
    </div>
  );
}
