import { Key, Shuffle, Repeat, Lock, Hash, Code } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import { Input } from '../../../components/ui/Input';
import type { KeyStrategy, KeyStrategyType } from '../../../types/script';

interface KeyStrategyPanelProps {
  strategy: KeyStrategy;
  onChange: (strategy: KeyStrategy) => void;
  disabled?: boolean;
}

interface StrategyOption {
  type: KeyStrategyType;
  icon: ReactNode;
}

export function KeyStrategyPanel({ strategy, onChange, disabled }: KeyStrategyPanelProps) {
  const { t } = useTranslation();

  const strategies: StrategyOption[] = [
    { type: 'roundrobin', icon: <Repeat className="w-4 h-4" /> },
    { type: 'random', icon: <Shuffle className="w-4 h-4" /> },
    { type: 'fixed', icon: <Lock className="w-4 h-4" /> },
    { type: 'hash', icon: <Hash className="w-4 h-4" /> },
    { type: 'custom', icon: <Code className="w-4 h-4" /> },
  ];

  const handleTypeChange = (type: KeyStrategyType) => {
    onChange({ ...strategy, type });
  };

  return (
    <div className="border rounded-lg overflow-hidden shadow-sm">
      <div className="bg-muted px-4 py-3 border-b">
        <span className="text-sm font-medium flex items-center gap-2">
          <Key className="w-4 h-4" />
          {t('producer.script.keyStrategy')}
        </span>
      </div>
      
      <div className="p-4 space-y-4">
        {/* Strategy Options */}
        <div className="space-y-1">
          {strategies.map(({ type, icon }) => (
            <label
              key={type}
              className={`flex items-center gap-3 p-2.5 rounded-md cursor-pointer transition-colors ${
                strategy.type === type
                  ? 'bg-primary/10'
                  : 'hover:bg-muted/50'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input
                type="radio"
                name="keyStrategy"
                value={type}
                checked={strategy.type === type}
                onChange={() => handleTypeChange(type)}
                disabled={disabled}
                className="sr-only"
              />
              <div className={`${strategy.type === type ? 'text-primary' : 'text-muted-foreground'}`}>
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${strategy.type === type ? 'text-primary' : ''}`}>
                  {t(`producer.script.keyStrategies.${type}.title`)}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {t(`producer.script.keyStrategies.${type}.desc`)}
                </div>
              </div>
            </label>
          ))}
        </div>

        {/* Strategy-specific config */}
        <div className="pt-3 border-t space-y-3">
          {strategy.type === 'fixed' && (
            <div>
              <label className="text-xs font-medium mb-1.5 block text-muted-foreground">
                {t('producer.key')}
              </label>
              <Input
                value={strategy.fixedKey || ''}
                onChange={e => onChange({ ...strategy, fixedKey: e.target.value })}
                placeholder="Enter key value"
                disabled={disabled}
              />
            </div>
          )}
          
          {strategy.type === 'roundrobin' && (
            <div>
              <label className="text-xs font-medium mb-1.5 block text-muted-foreground">
                Partition Count
              </label>
              <Input
                type="number"
                min={1}
                max={100}
                value={strategy.partitionCount || 3}
                onChange={e => onChange({ ...strategy, partitionCount: parseInt(e.target.value) || 3 })}
                disabled={disabled}
              />
            </div>
          )}
          
          {strategy.type === 'custom' && (
            <div>
              <label className="text-xs font-medium mb-1.5 block text-muted-foreground">
                Custom Script
              </label>
              <textarea
                value={strategy.script || 'function generateKey(ctx) {\n  return ctx.uuid();\n}'}
                onChange={e => onChange({ ...strategy, script: e.target.value })}
                disabled={disabled}
                className="w-full h-28 text-xs font-mono p-3 rounded-md border border-input bg-background resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="function generateKey(ctx) { ... }"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Must define generateKey(ctx) function
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
