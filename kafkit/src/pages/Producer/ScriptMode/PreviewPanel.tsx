import { Eye, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ScriptMessage } from '../../../types/script';

interface PreviewPanelProps {
  preview: ScriptMessage | ScriptMessage[] | null;
  error: string | null;
}

export function PreviewPanel({ preview, error }: PreviewPanelProps) {
  const { t } = useTranslation();

  const formatValue = (value: string | object): string => {
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return value;
  };

  return (
    <div className="border rounded-lg overflow-hidden shadow-sm">
      <div className="bg-muted px-4 py-3 border-b flex items-center gap-2">
        <Eye className="w-4 h-4" />
        <span className="text-sm font-medium">{t('producer.script.preview')}</span>
      </div>
      
      <div className="p-4 h-[220px] overflow-auto">
        {error ? (
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
          <div className="h-full flex flex-col items-center justify-center text-sm text-muted-foreground gap-2">
            <Eye className="w-8 h-8 opacity-20" />
            <span>Click Preview to see generated message</span>
          </div>
        )}
      </div>
    </div>
  );
}
