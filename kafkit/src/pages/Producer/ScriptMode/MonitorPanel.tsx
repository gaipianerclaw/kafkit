import { Activity, Clock, CheckCircle, XCircle, AlertTriangle, Terminal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { SendTask } from '../../../types/script';

interface MonitorPanelProps {
  task: SendTask | null;
  isRunning: boolean;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  }
  return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

export function MonitorPanel({ task, isRunning }: MonitorPanelProps) {
  const { t } = useTranslation();

  if (!task && !isRunning) {
    return (
      <div className="border rounded-lg overflow-hidden shadow-sm">
        <div className="bg-muted px-4 py-3 border-b flex items-center gap-2">
          <Activity className="w-4 h-4" />
          <span className="text-sm font-medium">{t('producer.script.monitor')}</span>
        </div>
        <div className="p-4 h-[220px] flex flex-col items-center justify-center text-sm text-muted-foreground gap-2">
          <Terminal className="w-8 h-8 opacity-20" />
          <span>Start sending to see metrics</span>
        </div>
      </div>
    );
  }

  const duration = task?.startTime 
    ? Date.now() - task.startTime 
    : 0;

  const successRate = task && task.sentCount > 0
    ? ((task.successCount / task.sentCount) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="border rounded-lg overflow-hidden shadow-sm">
      <div className="bg-muted px-4 py-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4" />
          <span className="text-sm font-medium">{t('producer.script.monitor')}</span>
        </div>
        {isRunning && (
          <span className="flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
        )}
      </div>
      
      <div className="p-4 space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted/40 rounded-lg p-3">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
              <Activity className="w-3 h-3" />
              {t('producer.script.stats.sent')}
            </div>
            <div className="text-xl font-semibold">
              {formatNumber(task?.sentCount || 0)}
            </div>
          </div>
          
          <div className="bg-muted/40 rounded-lg p-3">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
              <Clock className="w-3 h-3" />
              {t('producer.script.stats.duration')}
            </div>
            <div className="text-xl font-semibold">
              {formatDuration(duration)}
            </div>
          </div>
          
          <div className="bg-muted/40 rounded-lg p-3">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
              <CheckCircle className="w-3 h-3" />
              {t('producer.script.stats.success')}
            </div>
            <div className="text-xl font-semibold text-green-600">
              {successRate}%
            </div>
          </div>
          
          <div className="bg-muted/40 rounded-lg p-3">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
              <XCircle className="w-3 h-3" />
              {t('producer.script.stats.failed')}
            </div>
            <div className="text-xl font-semibold text-red-600">
              {formatNumber(task?.failedCount || 0)}
            </div>
          </div>
        </div>

        {/* Current TPS */}
        {isRunning && task?.currentTPS !== undefined && (
          <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
            <div className="text-xs text-muted-foreground mb-1">{t('producer.script.stats.currentTPS')}</div>
            <div className="text-2xl font-bold text-primary">
              {formatNumber(task.currentTPS)}
            </div>
          </div>
        )}

        {/* Recent Errors */}
        {task?.errors && task.errors.length > 0 && (
          <div className="border-t pt-3">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5 mb-2">
              <AlertTriangle className="w-3 h-3" />
              Recent Errors ({task.errors.length})
            </div>
            <div className="max-h-[80px] overflow-y-auto space-y-1">
              {task.errors.slice(-3).map((err, idx) => (
                <div key={idx} className="text-xs text-red-600 truncate bg-red-50 px-2 py-1 rounded">
                  {new Date(err.timestamp).toLocaleTimeString()}: {err.message}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
