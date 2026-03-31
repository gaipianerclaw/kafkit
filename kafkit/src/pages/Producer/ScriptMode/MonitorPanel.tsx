import { Activity, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
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
  if (!task && !isRunning) {
    return (
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-muted px-3 py-2 border-b flex items-center gap-2">
          <Activity className="w-4 h-4" />
          <span className="text-sm font-medium">Monitor</span>
        </div>
        <div className="p-3 h-[200px] flex items-center justify-center text-sm text-muted-foreground">
          Start sending to see metrics
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
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-muted px-3 py-2 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4" />
          <span className="text-sm font-medium">Monitor</span>
        </div>
        {isRunning && (
          <span className="flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
        )}
      </div>
      
      <div className="p-3 space-y-3">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-muted/50 rounded p-2">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Activity className="w-3 h-3" />
              Sent
            </div>
            <div className="text-lg font-semibold">
              {formatNumber(task?.sentCount || 0)}
            </div>
          </div>
          
          <div className="bg-muted/50 rounded p-2">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Duration
            </div>
            <div className="text-lg font-semibold">
              {formatDuration(duration)}
            </div>
          </div>
          
          <div className="bg-muted/50 rounded p-2">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Success
            </div>
            <div className="text-lg font-semibold text-green-600">
              {successRate}%
            </div>
          </div>
          
          <div className="bg-muted/50 rounded p-2">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <XCircle className="w-3 h-3" />
              Failed
            </div>
            <div className="text-lg font-semibold text-red-600">
              {formatNumber(task?.failedCount || 0)}
            </div>
          </div>
        </div>

        {/* Current TPS */}
        {isRunning && task?.currentTPS !== undefined && (
          <div className="bg-primary/5 rounded p-2">
            <div className="text-xs text-muted-foreground">Current TPS</div>
            <div className="text-xl font-bold text-primary">
              {formatNumber(task.currentTPS)}
            </div>
          </div>
        )}

        {/* Recent Errors */}
        {task?.errors && task.errors.length > 0 && (
          <div className="border-t pt-2">
            <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
              <AlertTriangle className="w-3 h-3" />
              Recent Errors ({task.errors.length})
            </div>
            <div className="max-h-[80px] overflow-y-auto space-y-1">
              {task.errors.slice(-3).map((err, idx) => (
                <div key={idx} className="text-xs text-red-600 truncate">
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
