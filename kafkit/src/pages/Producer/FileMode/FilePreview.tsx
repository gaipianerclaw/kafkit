import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { ParsedMessage, FileFormat } from './types';

interface FilePreviewProps {
  messages: ParsedMessage[];
  totalCount: number | string;
  errors: string[];
  format: FileFormat;
}

export function FilePreview({ messages, totalCount, errors, format }: FilePreviewProps) {
  const { t } = useTranslation();
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [showErrors, setShowErrors] = useState(true);

  const toggleRow = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  const formatValue = (value: any): string => {
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const truncateValue = (value: any, maxLength: number = 100): string => {
    const str = formatValue(value);
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength) + '...';
  };

  return (
    <div className="space-y-4">
      {/* Header info */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t('producer.fileMode.preview.showing', { 
            count: messages.length,
            total: typeof totalCount === 'number' ? totalCount : '...'
          })}
        </p>
        {errors.length > 0 && (
          <button
            onClick={() => setShowErrors(!showErrors)}
            className="text-sm text-destructive flex items-center gap-1 hover:underline"
          >
            <AlertCircle className="w-4 h-4" />
            {errors.length} {t('producer.fileMode.preview.errors')}
            {showErrors ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>

      {/* Validation errors */}
      {showErrors && errors.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3">
          <ul className="text-sm text-destructive space-y-1">
            {errors.slice(0, 5).map((error, idx) => (
              <li key={idx}>• {error}</li>
            ))}
            {errors.length > 5 && (
              <li>... {t('producer.fileMode.preview.moreErrors', { count: errors.length - 5 })}</li>
            )}
          </ul>
        </div>
      )}

      {/* Preview table */}
      {messages.length > 0 && (
        <div className="border border-border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-2 text-left font-medium w-16">#</th>
                <th className="px-4 py-2 text-left font-medium">{t('producer.fileMode.preview.key')}</th>
                <th className="px-4 py-2 text-left font-medium">{t('producer.fileMode.preview.value')}</th>
                {messages.some(m => m.headers) && (
                  <th className="px-4 py-2 text-left font-medium">{t('producer.fileMode.preview.headers')}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {messages.map((msg, idx) => (
                <>
                  <tr 
                    key={idx}
                    className="border-t border-border hover:bg-muted/50 cursor-pointer"
                    onClick={() => toggleRow(idx)}
                  >
                    <td className="px-4 py-2 text-muted-foreground">{idx + 1}</td>
                    <td className="px-4 py-2 font-mono text-xs max-w-[150px] truncate">
                      {msg.key || '-'}
                    </td>
                    <td className="px-4 py-2 max-w-[400px] truncate">
                      {expandedRows.has(idx) 
                        ? formatValue(msg.value)
                        : truncateValue(msg.value)
                      }
                    </td>
                    {messages.some(m => m.headers) && (
                      <td className="px-4 py-2 text-xs text-muted-foreground">
                        {msg.headers ? Object.keys(msg.headers).length + ' headers' : '-'}
                      </td>
                    )}
                  </tr>
                  {expandedRows.has(idx) && (
                    <tr className="bg-muted/30">
                      <td colSpan={messages.some(m => m.headers) ? 4 : 3} className="px-4 py-3">
                        <pre className="text-xs font-mono bg-background p-3 rounded border border-border overflow-auto max-h-48">
                          {formatValue({
                            key: msg.key,
                            value: msg.value,
                            headers: msg.headers,
                            partition: msg.partition,
                          })}
                        </pre>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Format hint */}
      <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
        <p className="font-medium mb-1">{t('producer.fileMode.preview.formatHint')}:</p>
        {format === 'csv' && (
          <p>{t('producer.fileMode.preview.csvHint')}</p>
        )}
        {format === 'jsonl' && (
          <p>{t('producer.fileMode.preview.jsonlHint')}</p>
        )}
        {format === 'json' && (
          <p>{t('producer.fileMode.preview.jsonHint')}</p>
        )}
      </div>
    </div>
  );
}
