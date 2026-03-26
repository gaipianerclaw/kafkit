import { AlertCircle, RefreshCw, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { formatErrorForDisplay, getErrorSeverity } from '../../utils/errorHandler';

interface ErrorAlertProps {
  error: unknown;
  onRetry?: () => void;
  onClose?: () => void;
  showRetry?: boolean;
  className?: string;
}

export function ErrorAlert({ 
  error, 
  onRetry, 
  onClose, 
  showRetry = true,
  className = '' 
}: ErrorAlertProps) {
  const { t } = useTranslation();
  const { title, message, solution, retryable } = formatErrorForDisplay(error, t);
  const severity = getErrorSeverity(parseErrorCode(error));
  
  const bgColors = {
    error: 'bg-destructive/10 border-destructive/20',
    warning: 'bg-yellow-500/10 border-yellow-500/20',
    info: 'bg-blue-500/10 border-blue-500/20',
  };
  
  const textColors = {
    error: 'text-destructive',
    warning: 'text-yellow-600',
    info: 'text-blue-600',
  };

  return (
    <div className={`rounded-lg border p-4 ${bgColors[severity]} ${className}`}>
      <div className="flex items-start gap-3">
        <AlertCircle className={`w-5 h-5 mt-0.5 ${textColors[severity]}`} />
        <div className="flex-1 min-w-0">
          <h4 className={`font-medium ${textColors[severity]}`}>{title}</h4>
          <p className="text-sm text-muted-foreground mt-1">{message}</p>
          <p className="text-sm text-muted-foreground mt-2">
            <span className="font-medium">{t('common.errorSolutions')}:</span> {solution}
          </p>
          
          {(showRetry && retryable && onRetry) && (
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" onClick={onRetry}>
                <RefreshCw className="w-4 h-4 mr-1" />
                {t('common.retry')}
              </Button>
            </div>
          )}
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// 辅助函数：解析错误码
function parseErrorCode(error: unknown): string {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  const errorCodes = [
    'NetworkException',
    'UnknownTopicOrPartition',
    'NotLeaderForPartition',
    'AuthorizationFailed',
    'AuthenticationFailed',
    'SSLHandshakeFailed',
    'ConnectionRefused',
    'TimeoutException',
    'UnknownMemberId',
    'RebalanceInProgress',
    'InvalidOffset',
    'OffsetOutOfRange',
  ];
  
  for (const code of errorCodes) {
    if (errorMessage.includes(code)) return code;
  }
  
  return 'Unknown';
}
