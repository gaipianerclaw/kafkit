/**
 * File Mode - Value Timestamp Mapper Component
 * Allows users to map and modify timestamp fields within message values
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Search, Check, AlertCircle } from 'lucide-react';
import { ValueTimestampConfig, TimestampMode, ParsedMessage } from './types';

interface ValueTimestampMapperProps {
  config: ValueTimestampConfig;
  onChange: (config: ValueTimestampConfig) => void;
  previewMessages: ParsedMessage[];
  disabled?: boolean;
}

interface DetectedField {
  path: string;
  format: 'unix_ms' | 'unix_sec' | 'iso8601' | 'iso8601_space' | 'unknown';
  sampleValue: string;
}

export function ValueTimestampMapper({
  config,
  onChange,
  previewMessages,
  disabled,
}: ValueTimestampMapperProps) {
  const { t } = useTranslation();
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedFields, setDetectedFields] = useState<DetectedField[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  // Auto-detect timestamp fields from preview messages
  const detectTimestampFields = useCallback((): DetectedField[] => {
    const fields = new Map<string, DetectedField>();

    for (const msg of previewMessages.slice(0, 5)) {
      const value = typeof msg.value === 'string' ? msg.value : JSON.stringify(msg.value);
      
      // Try JSON first
      try {
        const obj = JSON.parse(value);
        findTimestampFields(obj, '', fields);
        continue;
      } catch {
        // Not valid JSON, try CSV
      }
      
      // Try CSV format: detect timestamp patterns in comma-separated values
      const csvField = detectCsvTimestamp(value);
      if (csvField) {
        fields.set(csvField.path, csvField);
      }
    }

    return Array.from(fields.values());
  }, [previewMessages]);
  
  // Detect timestamp in CSV format value
  const detectCsvTimestamp = (value: string): DetectedField | null => {
    const parts = value.split(',');
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      
      // Check for datetime pattern with space separator: yyyy-MM-dd HH:mm:ss.SSS
      // This is the common CSV format
      const spaceDatePattern = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d{1,6})?)$/;
      if (spaceDatePattern.test(part)) {
        const date = new Date(part.replace(' ', 'T'));
        if (!isNaN(date.getTime())) {
          return {
            path: `csv_column_${i}`,
            format: 'iso8601_space',
            sampleValue: part,
          };
        }
      }
      
      // Check for ISO 8601 format with T separator: yyyy-MM-ddTHH:mm:ss.SSS
      const isoPattern = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z?)$/;
      if (isoPattern.test(part)) {
        const date = new Date(part);
        if (!isNaN(date.getTime())) {
          return {
            path: `csv_column_${i}`,
            format: 'iso8601',
            sampleValue: part,
          };
        }
      }
      
      // Check for Unix timestamp (ms) - 13 digits
      if (/^\d{13}$/.test(part)) {
        const ts = parseInt(part, 10);
        const now = Date.now();
        const tenYearsAgo = now - 10 * 365 * 24 * 60 * 60 * 1000;
        const tenYearsFromNow = now + 10 * 365 * 24 * 60 * 60 * 1000;
        if (ts > tenYearsAgo && ts < tenYearsFromNow) {
          return {
            path: `csv_column_${i}`,
            format: 'unix_ms',
            sampleValue: part,
          };
        }
      }
      
      // Check for Unix timestamp (sec) - 10 digits
      if (/^\d{10}$/.test(part)) {
        const ts = parseInt(part, 10) * 1000;
        const now = Date.now();
        const tenYearsAgo = now - 10 * 365 * 24 * 60 * 60 * 1000;
        const tenYearsFromNow = now + 10 * 365 * 24 * 60 * 60 * 1000;
        if (ts > tenYearsAgo && ts < tenYearsFromNow) {
          return {
            path: `csv_column_${i}`,
            format: 'unix_sec',
            sampleValue: part,
          };
        }
      }
    }
    
    return null;
  };

  // Recursively find timestamp fields in object
  const findTimestampFields = (
    obj: any,
    prefix: string,
    fields: Map<string, DetectedField>
  ) => {
    if (!obj || typeof obj !== 'object') return;

    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;
      
      // Check if this field looks like a timestamp
      const format = detectTimestampFormat(value);
      if (format !== 'unknown') {
        fields.set(path, {
          path,
          format,
          sampleValue: String(value),
        });
      }

      // Recurse into nested objects (but not arrays)
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        findTimestampFields(value, path, fields);
      }
    }
  };

  // Detect timestamp format of a value
  const detectTimestampFormat = (value: any): DetectedField['format'] => {
    if (typeof value === 'number') {
      // Check if it's a reasonable Unix timestamp
      const now = Date.now();
      const tenYearsAgo = now - 10 * 365 * 24 * 60 * 60 * 1000;
      const tenYearsFromNow = now + 10 * 365 * 24 * 60 * 60 * 1000;

      if (value > tenYearsAgo && value < tenYearsFromNow) {
        return 'unix_ms';
      }
      // Check for seconds (10 digits)
      const asMs = value * 1000;
      if (asMs > tenYearsAgo && asMs < tenYearsFromNow) {
        return 'unix_sec';
      }
    }

    if (typeof value === 'string') {
      // Try ISO 8601 format
      const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
      if (isoRegex.test(value)) {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return 'iso8601';
        }
      }
    }

    return 'unknown';
  };

  // Run auto-detection on mount
  useEffect(() => {
    if (previewMessages.length > 0 && detectedFields.length === 0 && !config.fieldPath) {
      setIsDetecting(true);
      const fields = detectTimestampFields();
      setDetectedFields(fields);
      setIsDetecting(false);

      // Auto-select first detected field
      if (fields.length > 0 && !config.fieldPath) {
        onChange({
          ...config,
          fieldPath: fields[0].path,
          format: fields[0].format,
        });
      }
    }
  }, [previewMessages]);

  // Handle field path change
  const handleFieldPathChange = (path: string) => {
    const detected = detectedFields.find(f => f.path === path);
    onChange({
      ...config,
      fieldPath: path,
      format: detected?.format || 'unknown',
    });
  };

  // Handle mode change
  const handleModeChange = (mode: TimestampMode) => {
    onChange({ ...config, mode });
  };

  // Handle fixed value change
  const handleFixedValueChange = (value: string) => {
    onChange({ ...config, fixedValue: value });
  };

  // Handle offset change
  const handleOffsetChange = (value: string) => {
    const offsetMs = parseInt(value, 10) || 0;
    onChange({ ...config, offsetMs });
  };

  // Generate preview of modified value
  const generatePreview = useCallback((originalValue: string): string => {
    if (!config.enabled || !config.fieldPath) return originalValue;

    // Handle CSV column path
    if (config.fieldPath.startsWith('csv_column_')) {
      const modified = modifyTimestamp(null, config.fieldPath, config, originalValue);
      return String(modified);
    }

    // Handle JSON path
    try {
      const obj = JSON.parse(originalValue);
      const modified = modifyTimestamp(obj, config.fieldPath, config);
      return JSON.stringify(modified, null, 2);
    } catch {
      return originalValue;
    }
  }, [config]);

  // Modify timestamp in object or CSV
  const modifyTimestamp = (obj: any, path: string, cfg: ValueTimestampConfig, originalValue?: string): any => {
    // Handle CSV column path (e.g., "csv_column_1")
    if (path.startsWith('csv_column_')) {
      if (!originalValue) return obj;
      
      const columnIndex = parseInt(path.replace('csv_column_', ''), 10);
      const parts = originalValue.split(',');
      
      if (columnIndex >= 0 && columnIndex < parts.length) {
        const newTimestamp = calculateNewTimestamp(parts[columnIndex].trim(), cfg);
        parts[columnIndex] = String(newTimestamp);
        return parts.join(',');
      }
      return originalValue;
    }
    
    // Handle JSON object path
    const parts = path.split('.');
    const newObj = { ...obj };
    let current: any = newObj;

    for (let i = 0; i < parts.length - 1; i++) {
      if (current[parts[i]] && typeof current[parts[i]] === 'object') {
        current[parts[i]] = { ...current[parts[i]] };
        current = current[parts[i]];
      }
    }

    const lastKey = parts[parts.length - 1];
    const originalTimestamp = current[lastKey];
    current[lastKey] = calculateNewTimestamp(originalTimestamp, cfg);

    return newObj;
  };

  // Calculate new timestamp based on mode
  const calculateNewTimestamp = (originalValue: any, cfg: ValueTimestampConfig): any => {
    let originalMs: number;

    // Parse original value to milliseconds
    if (typeof originalValue === 'number') {
      originalMs = cfg.format === 'unix_sec' ? originalValue * 1000 : originalValue;
    } else if (typeof originalValue === 'string') {
      originalMs = new Date(originalValue).getTime();
    } else {
      return originalValue;
    }

    let newMs: number;
    switch (cfg.mode) {
      case 'file':
        return originalValue;
      case 'current':
        newMs = Date.now();
        break;
      case 'fixed':
        if (typeof cfg.fixedValue === 'number') {
          newMs = cfg.fixedValue;
        } else if (typeof cfg.fixedValue === 'string') {
          const parsed = new Date(cfg.fixedValue).getTime();
          newMs = isNaN(parsed) ? originalMs : parsed;
        } else {
          newMs = originalMs;
        }
        break;
      case 'offset':
        newMs = originalMs + (cfg.offsetMs || 0);
        break;
      default:
        return originalValue;
    }

    // Format output according to original format
    switch (cfg.format) {
      case 'unix_ms':
        return newMs;
      case 'unix_sec':
        return Math.floor(newMs / 1000);
      case 'iso8601':
        return new Date(newMs).toISOString();
      case 'iso8601_space':
        // Format as yyyy-MM-dd HH:mm:ss.SSS (preserve original CSV format)
        return formatDateWithSpace(newMs);
      default:
        return newMs;
    }
  };
  
  // Format date as yyyy-MM-dd HH:mm:ss.SSS
  const formatDateWithSpace = (timestamp: number): string => {
    const date = new Date(timestamp);
    const pad = (n: number) => String(n).padStart(2, '0');
    const padMs = (n: number) => String(n).padStart(3, '0');
    
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
           `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${padMs(date.getMilliseconds())}`;
  };

  // Get first message for preview
  const previewMessage = useMemo(() => {
    return previewMessages[0];
  }, [previewMessages]);

  const previewOriginal = useMemo(() => {
    if (!previewMessage) return '';
    return typeof previewMessage.value === 'string' 
      ? previewMessage.value 
      : JSON.stringify(previewMessage.value, null, 2);
  }, [previewMessage]);

  const previewModified = useMemo(() => {
    return generatePreview(previewOriginal);
  }, [previewOriginal, generatePreview]);

  return (
    <div className="space-y-4">
      {/* Enable toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={config.enabled}
          onChange={(e) => onChange({ ...config, enabled: e.target.checked })}
          disabled={disabled}
          className="w-4 h-4 rounded border-input text-primary focus:ring-ring"
        />
        <span className="text-sm font-medium">
          {t('producer.fileMode.valueTimestamp.enable')}
        </span>
      </label>

      {config.enabled && (
        <>
          {/* Field path selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                {t('producer.fileMode.valueTimestamp.fieldPath')}
              </label>
              <button
                onClick={() => {
                  setIsDetecting(true);
                  const fields = detectTimestampFields();
                  setDetectedFields(fields);
                  setIsDetecting(false);
                }}
                disabled={disabled || isDetecting}
                className="text-xs flex items-center gap-1 text-primary hover:text-primary/80 disabled:opacity-50"
              >
                <Search className="w-3 h-3" />
                {isDetecting ? t('common.loading') : t('producer.fileMode.valueTimestamp.autoDetect')}
              </button>
            </div>

            {detectedFields.length > 0 ? (
              <div className="space-y-1">
                {detectedFields.map((field) => {
                  // Format display label for CSV columns
                  const displayLabel = field.path.startsWith('csv_column_')
                    ? `CSV Column ${parseInt(field.path.replace('csv_column_', ''), 10) + 1}`
                    : field.path;
                  
                  return (
                    <button
                      key={field.path}
                      onClick={() => !disabled && handleFieldPathChange(field.path)}
                      disabled={disabled}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-md border transition-colors ${
                        config.fieldPath === field.path
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'bg-background border-border hover:bg-muted'
                      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        {config.fieldPath === field.path && <Check className="w-4 h-4" />}
                        <code className="text-xs">{displayLabel}</code>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="px-1.5 py-0.5 bg-muted rounded">
                          {field.format === 'unix_ms' && 'Unix MS'}
                          {field.format === 'unix_sec' && 'Unix Sec'}
                          {field.format === 'iso8601' && 'ISO 8601'}
                          {field.format === 'iso8601_space' && 'DateTime'}
                        </span>
                        <span className="max-w-[100px] truncate">{field.sampleValue}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <input
                type="text"
                value={config.fieldPath}
                onChange={(e) => handleFieldPathChange(e.target.value)}
                disabled={disabled}
                placeholder={t('producer.fileMode.valueTimestamp.fieldPathPlaceholder')}
                className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              />
            )}

            {config.fieldPath && config.format === 'unknown' && (
              <div className="flex items-center gap-2 text-xs text-warning">
                <AlertCircle className="w-4 h-4" />
                {t('producer.fileMode.valueTimestamp.unknownFormat')}
              </div>
            )}
          </div>

          {/* Timestamp modification mode */}
          {config.fieldPath && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('producer.fileMode.valueTimestamp.modificationMode')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['file', 'current', 'fixed', 'offset'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => !disabled && handleModeChange(mode)}
                    disabled={disabled}
                    className={`px-3 py-2 text-sm rounded-md border transition-colors text-left ${
                      config.mode === mode
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-muted border-border'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="font-medium">
                      {t(`producer.fileMode.timestamp.mode_${mode}`)}
                    </div>
                    <div className="text-xs opacity-80 mt-0.5">
                      {t(`producer.fileMode.timestamp.mode_${mode}_desc`)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Fixed value input */}
          {config.mode === 'fixed' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('producer.fileMode.timestamp.fixedValue')}
              </label>
              <input
                type="text"
                value={config.fixedValue || ''}
                onChange={(e) => handleFixedValueChange(e.target.value)}
                disabled={disabled}
                placeholder={t('producer.fileMode.timestamp.fixedValuePlaceholder')}
                className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              />
              <p className="text-xs text-muted-foreground">
                {t('producer.fileMode.timestamp.fixedValueHint')}
              </p>
            </div>
          )}

          {/* Offset input */}
          {config.mode === 'offset' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('producer.fileMode.timestamp.offset')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={config.offsetMs || 0}
                  onChange={(e) => handleOffsetChange(e.target.value)}
                  disabled={disabled}
                  className="flex-1 px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {t('producer.fileMode.timestamp.milliseconds')}
                </span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: '-1h', value: -3600000 },
                  { label: '+1h', value: 3600000 },
                  { label: '-1d', value: -86400000 },
                  { label: '+1d', value: 86400000 },
                  { label: '-7d', value: -604800000 },
                  { label: '+7d', value: 604800000 },
                ].map(({ label, value }) => (
                  <button
                    key={label}
                    onClick={() => !disabled && handleOffsetChange(String(value))}
                    disabled={disabled}
                    className="px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded transition-colors disabled:opacity-50"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Preview toggle */}
          {config.fieldPath && previewMessage && (
            <div className="space-y-2">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
              >
                <Clock className="w-4 h-4" />
                {showPreview 
                  ? t('producer.fileMode.valueTimestamp.hidePreview')
                  : t('producer.fileMode.valueTimestamp.showPreview')
                }
              </button>

              {showPreview && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="space-y-1">
                    <div className="font-medium text-muted-foreground">
                      {t('producer.fileMode.valueTimestamp.original')}
                    </div>
                    <pre className="bg-muted p-2 rounded overflow-auto max-h-32">
                      {previewOriginal}
                    </pre>
                  </div>
                  <div className="space-y-1">
                    <div className="font-medium text-primary">
                      {t('producer.fileMode.valueTimestamp.modified')}
                    </div>
                    <pre className="bg-primary/5 p-2 rounded overflow-auto max-h-32 border border-primary/20">
                      {previewModified}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Info note */}
          <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
            <p className="font-medium mb-1">{t('producer.fileMode.valueTimestamp.note')}:</p>
            <p>{t('producer.fileMode.valueTimestamp.noteDesc')}</p>
          </div>
        </>
      )}
    </div>
  );
}
