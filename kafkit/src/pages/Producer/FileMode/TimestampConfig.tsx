/**
 * File Mode - Timestamp Configuration Component
 * Allows users to customize message timestamps when sending from file
 */

import { useTranslation } from 'react-i18next';
import { TimestampConfig as TimestampConfigType } from './types';

interface TimestampConfigProps {
  config: TimestampConfigType;
  onChange: (config: TimestampConfigType) => void;
  disabled?: boolean;
}

export function TimestampConfig({ config, onChange, disabled }: TimestampConfigProps) {
  const { t } = useTranslation();

  const handleModeChange = (mode: TimestampConfigType['mode']) => {
    onChange({ ...config, mode });
  };

  const handleFixedValueChange = (value: string) => {
    onChange({ ...config, fixedValue: value });
  };

  const handleOffsetChange = (value: string) => {
    const offsetMs = parseInt(value, 10) || 0;
    onChange({ ...config, offsetMs });
  };

  return (
    <div className="space-y-4">
      {/* Mode Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          {t('producer.fileMode.timestamp.mode')}
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

      {/* Fixed Value Input */}
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

      {/* Offset Input */}
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
          <p className="text-xs text-muted-foreground">
            {t('producer.fileMode.timestamp.offsetHint')}
          </p>
          {/* Quick offset buttons */}
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

      {/* Current timestamp preview */}
      {config.mode === 'current' && (
        <div className="p-3 bg-muted rounded-md">
          <div className="text-sm font-medium mb-1">
            {t('producer.fileMode.timestamp.preview')}
          </div>
          <div className="text-sm text-muted-foreground font-mono">
            {new Date().toISOString()}
          </div>
        </div>
      )}

      {/* Info text */}
      <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
        <p className="font-medium mb-1">{t('producer.fileMode.timestamp.note')}:</p>
        <p>{t('producer.fileMode.timestamp.noteDesc')}</p>
      </div>
    </div>
  );
}
