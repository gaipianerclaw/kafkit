import { Eye, AlertCircle } from 'lucide-react';
import type { ScriptMessage } from '../../../types/script';

interface PreviewPanelProps {
  preview: ScriptMessage | ScriptMessage[] | null;
  error: string | null;
}

export function PreviewPanel({ preview, error }: PreviewPanelProps) {
  const formatValue = (value: string | object): string => {
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return value;
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-muted px-3 py-2 border-b flex items-center gap-2">
        <Eye className="w-4 h-4" />
        <span className="text-sm font-medium">Preview</span>
      </div>
      
      <div className="p-3 h-[200px] overflow-auto">
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
              <div key={idx} className="bg-muted/50 rounded p-2 text-xs space-y-1">
                <div className="flex gap-2">
                  <span className="text-muted-foreground">Key:</span>
                  <span className="font-mono text-primary">{msg.key || '(null)'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Value:</span>
                  <pre className="mt-1 p-1.5 bg-background rounded font-mono text-[10px] overflow-x-auto">
                    {formatValue(msg.value)}
                  </pre>
                </div>
                {msg.headers && Object.keys(msg.headers).length > 0 && (
                  <div>
                    <span className="text-muted-foreground">Headers:</span>
                    <pre className="mt-1 p-1.5 bg-background rounded font-mono text-[10px] overflow-x-auto">
                      {JSON.stringify(msg.headers, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
            
            {Array.isArray(preview) && preview.length > 3 && (
              <div className="text-xs text-muted-foreground text-center">
                ... and {preview.length - 3} more
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            Click Preview to see generated message
          </div>
        )}
      </div>
    </div>
  );
}
