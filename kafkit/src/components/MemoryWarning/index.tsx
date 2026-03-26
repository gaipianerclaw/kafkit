import { AlertTriangle, Download, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';

interface MemoryWarningProps {
  messageCount: number;
  onExport: () => void;
  onDismiss: () => void;
  threshold?: number;
}

export function MemoryWarning({ 
  messageCount, 
  onExport, 
  onDismiss,
  threshold = 5000 
}: MemoryWarningProps) {
  const { t } = useTranslation();
  
  // 只有当消息数量超过阈值时才显示
  if (messageCount < threshold) {
    return null;
  }

  const isCritical = messageCount >= 10000;

  return (
    <div className={`rounded-lg border p-3 mb-4 ${
      isCritical 
        ? 'bg-destructive/10 border-destructive/30' 
        : 'bg-yellow-500/10 border-yellow-500/30'
    }`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className={`w-5 h-5 mt-0.5 ${
          isCritical ? 'text-destructive' : 'text-yellow-600'
        }`} />
        <div className="flex-1 min-w-0">
          <h4 className={`font-medium ${
            isCritical ? 'text-destructive' : 'text-yellow-600'
          }`}>
            {t('consumer.alerts.memoryWarning')}
          </h4>
          <p className="text-sm text-muted-foreground mt-1">
            {t('consumer.alerts.memoryWarningDesc', { count: messageCount })}
          </p>
          {isCritical && (
            <p className="text-sm text-destructive mt-1 font-medium">
              {t('consumer.memoryLimitReached', { count: 10000 })}
            </p>
          )}
          
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="outline" onClick={onExport}>
              <Download className="w-4 h-4 mr-1" />
              {t('consumer.export')}
            </Button>
            <Button size="sm" variant="ghost" onClick={onDismiss}>
              {t('common.dismiss')}
            </Button>
          </div>
        </div>
        <button 
          onClick={onDismiss}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
