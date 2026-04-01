import { useTranslation } from 'react-i18next';
import { SendingStrategy, StrategyType } from './types';

interface StrategyConfigProps {
  strategy: SendingStrategy;
  onChange: (strategy: SendingStrategy) => void;
  disabled?: boolean;
}

const strategyTypes: { value: StrategyType; label: string; description: string }[] = [
  {
    value: 'immediate',
    label: 'producer.fileMode.strategy.immediate',
    description: 'producer.fileMode.strategy.immediateDesc',
  },
  {
    value: 'tps',
    label: 'producer.fileMode.strategy.tps',
    description: 'producer.fileMode.strategy.tpsDesc',
  },
  {
    value: 'interval',
    label: 'producer.fileMode.strategy.interval',
    description: 'producer.fileMode.strategy.intervalDesc',
  },
];

export function StrategyConfig({ strategy, onChange, disabled }: StrategyConfigProps) {
  const { t } = useTranslation();

  const handleTypeChange = (type: StrategyType) => {
    onChange({ type, config: {} });
  };

  const handleConfigChange = (key: string, value: any) => {
    onChange({
      ...strategy,
      config: { ...strategy.config, [key]: value },
    });
  };

  return (
    <div className="space-y-6">
      {/* Strategy type selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {strategyTypes.map(({ value, label, description }) => (
          <button
            key={value}
            onClick={() => !disabled && handleTypeChange(value)}
            disabled={disabled}
            className={`
              p-4 border rounded-lg text-left transition-colors
              ${strategy.type === value 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div className="font-medium">{t(label)}</div>
            <div className="text-sm text-muted-foreground mt-1">{t(description)}</div>
          </button>
        ))}
      </div>

      {/* Strategy-specific config */}
      <div className="border border-border rounded-lg p-4 bg-muted/30">
        {strategy.type === 'immediate' && (
          <p className="text-sm text-muted-foreground">
            {t('producer.fileMode.strategy.immediateNote')}
          </p>
        )}

        {strategy.type === 'tps' && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-2">
                {t('producer.fileMode.strategy.tpsLabel')}
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="1"
                  max="10000"
                  value={strategy.config.tps || 10}
                  onChange={(e) => handleConfigChange('tps', parseInt(e.target.value))}
                  disabled={disabled}
                  className="flex-1"
                />
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={strategy.config.tps || 10}
                  onChange={(e) => handleConfigChange('tps', parseInt(e.target.value) || 1)}
                  disabled={disabled}
                  className="w-20 px-2 py-1 bg-background border border-input rounded text-center"
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {t('producer.fileMode.strategy.tpsUnit')}
                </span>
              </div>
            </div>
          </div>
        )}

        {strategy.type === 'interval' && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-2">
                {t('producer.fileMode.strategy.intervalLabel')}
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  min="0.1"
                  max="3600"
                  step="0.1"
                  value={strategy.config.intervalSeconds || 1}
                  onChange={(e) => handleConfigChange('intervalSeconds', parseFloat(e.target.value) || 0.1)}
                  disabled={disabled}
                  className="w-24 px-2 py-1 bg-background border border-input rounded text-center"
                />
                <span className="text-sm text-muted-foreground">
                  {t('producer.fileMode.strategy.intervalUnit')}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
