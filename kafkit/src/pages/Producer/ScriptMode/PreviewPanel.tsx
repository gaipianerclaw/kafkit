import { Eye, AlertCircle, FileCode } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ScriptMessage } from '../../../types/script';

interface PreviewPanelProps {
  preview: ScriptMessage | ScriptMessage[] | null;
  error: string | null;
  embedded?: boolean;
}

export function PreviewPanel({ preview, error, embedded }: PreviewPanelProps) {
  const { t } = useTranslation();

  const formatValue = (value: string | object): string => {
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return value;
  };

  const content = error ? (
    <div className="flex items-start gap-2 text-red-600">
      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <div className="text-sm">{error}</div>
    </div>
  ) : preview ? (
    <div className="space-y-3">
      {Array.isArray(preview) ? (
        <div className="text-xs text-muted-foreground mb-2">
          Generated {preview.length} messages:
        </div>
      ) : null}
      
      {(Array.isArray(preview) ? preview.slice(0, 3) : [preview]).map((msg, idx) => (
        <div key={idx} className="bg-muted/40 rounded-lg p-3 text-xs space-y-1.5">
          <div className="flex gap-2">
            <span className="text-muted-foreground font-medium">Key:</span>
            <span className="font-mono text-primary">{msg.key || '(null)'}</span>
          </div>
          <div>
            <span className="text-muted-foreground font-medium">Value:</span>
            <pre className="mt-1.5 p-2 bg-background rounded-md font-mono text-[10px] overflow-x-auto border border-border/50">
              {formatValue(msg.value)}
            </pre>
          </div>
          {msg.headers && Object.keys(msg.headers).length > 0 && (
            <div>
              <span className="text-muted-foreground font-medium">Headers:</span>
              <pre className="mt-1.5 p-2 bg-background rounded-md font-mono text-[10px] overflow-x-auto border border-border/50">
                {JSON.stringify(msg.headers, null, 2)}
              </pre>
            </div>
          )}
        </div>
      ))}
      
      {Array.isArray(preview) && preview.length > 3 && (
        <div className="text-xs text-muted-foreground text-center py-1">
          ... and {preview.length - 3} more
        </div>
      )}
    </div>
  ) : (
    <div className="h-full flex flex-col items-center justify-center text-sm text-muted-foreground gap-3">
      <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
        <FileCode className="w-8 h-8 opacity-30" />
      </div>
      <div className="text-center">
        <p className="font-medium">{t('producer.script.preview')}</p>
        <p className="text-xs mt-1">Click Preview button to generate message</p>
      </div>
    </div>
  );

  if (embedded) {
    return (
      <div className="h-full overflow-auto p-4">
        {content}
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden shadow-sm">
      <div className="bg-muted px-4 py-3 border-b flex items-center gap-2">
        <Eye className="w-4 h-4" />
        <span className="text-sm font-medium">{t('producer.script.preview')}</span>
      </div>
      <div className="p-4 h-[220px] overflow-auto">
        {content}
      </div>
    </div>
  );
}
