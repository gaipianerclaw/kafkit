import type { ReactNode } from 'react';
import { Key, Shuffle, Repeat, Lock, Hash, Code } from 'lucide-react';
import { Input } from '../../../components/ui/Input';
import type { KeyStrategy, KeyStrategyType } from '../../../types/script';

interface KeyStrategyPanelProps {
  strategy: KeyStrategy;
  onChange: (strategy: KeyStrategy) => void;
  disabled?: boolean;
}

const strategies: { type: KeyStrategyType; label: string; icon: ReactNode; description: string }[] = [
  {
    type: 'roundrobin',
    label: 'Round Robin',
    icon: <Repeat className="w-4 h-4" />,
    description: 'Cycle through partitions evenly'
  },
  {
    type: 'random',
    label: 'Random',
    icon: <Shuffle className="w-4 h-4" />,
    description: 'Random partition selection'
  },
  {
    type: 'fixed',
    label: 'Fixed Key',
    icon: <Lock className="w-4 h-4" />,
    description: 'Use a constant key value'
  },
  {
    type: 'hash',
    label: 'Hash',
    icon: <Hash className="w-4 h-4" />,
    description: 'Hash-based distribution'
  },
  {
    type: 'custom',
    label: 'Custom Script',
    icon: <Code className="w-4 h-4" />,
    description: 'Define your own key logic'
  },
];

export function KeyStrategyPanel({ strategy, onChange, disabled }: KeyStrategyPanelProps) {
  const handleTypeChange = (type: KeyStrategyType) => {
    onChange({ ...strategy, type });
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-muted px-3 py-2 border-b">
        <span className="text-sm font-medium flex items-center gap-2">
          <Key className="w-4 h-4" />
          Key Strategy
        </span>
      </div>
      
      <div className="p-3 space-y-3">
        {/* Strategy Options */}
        <div className="space-y-1">
          {strategies.map(({ type, label, icon, description }) => (
            <label
              key={type}
              className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
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
                  {label}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {description}
                </div>
              </div>
            </label>
          ))}
        </div>

        {/* Strategy-specific config */}
        <div className="pt-2 border-t">
          {strategy.type === 'fixed' && (
            <div>
              <label className="text-xs font-medium mb-1 block">Fixed Key Value</label>
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
              <label className="text-xs font-medium mb-1 block">Partition Count</label>
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
              <label className="text-xs font-medium mb-1 block">Custom Key Script</label>
              <textarea
                value={strategy.script || 'function generateKey(ctx) {\n  return ctx.uuid();\n}'}
                onChange={e => onChange({ ...strategy, script: e.target.value })}
                disabled={disabled}
                className="w-full h-24 text-xs font-mono p-2 rounded-md border border-input bg-background resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="function generateKey(ctx) { ... }"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Must define generateKey(ctx) function
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
