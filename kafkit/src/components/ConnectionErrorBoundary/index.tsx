import { Component, ErrorInfo, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';

interface Props {
  children: ReactNode;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundaryClass extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onRetry={this.props.onRetry} />;
    }

    return this.props.children;
  }
}

function ErrorFallback({ error, onRetry }: { error: Error | null; onRetry?: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <AlertCircle className="w-16 h-16 text-destructive mb-4" />
      <h2 className="text-xl font-semibold mb-2">{t('errors.boundaryTitle')}</h2>
      <p className="text-muted-foreground mb-4 text-center max-w-md">
        {t('errors.boundaryMessage')}
      </p>
      {error && (
        <div className="bg-muted p-4 rounded-lg mb-4 max-w-md w-full overflow-auto">
          <code className="text-sm text-destructive">{error.message}</code>
        </div>
      )}
      {onRetry && (
        <Button onClick={onRetry}>
          <RefreshCw className="w-4 h-4 mr-2" />
          {t('common.retry')}
        </Button>
      )}
    </div>
  );
}

export const ConnectionErrorBoundary = ErrorBoundaryClass;
