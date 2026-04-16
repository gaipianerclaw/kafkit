import { useTranslation } from 'react-i18next';
import { Inbox, RefreshCw } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

interface EmptyStateProps {
  onRefresh: () => void;
}

export function EmptyState({ onRefresh }: EmptyStateProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 bg-card rounded-lg border border-dashed">
      <Inbox className="w-12 h-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium">{t('dashboard.empty.title')}</h3>
      <p className="text-sm text-muted-foreground mt-2 text-center max-w-md">
        {t('dashboard.empty.description')}
      </p>
      <Button onClick={onRefresh} variant="outline" className="mt-4 gap-2">
        <RefreshCw className="w-4 h-4" />
        {t('dashboard.empty.refresh')}
      </Button>
    </div>
  );
}
