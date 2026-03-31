import { Zap, Timer, Clock, Play } from 'lucide-react';
import { Input } from '../../../components/ui/Input';
import type { SendMode } from '../../../types/script';

interface StrategyConfigProps {
  mode: SendMode;
  targetTPS: number;
  intervalMs: number;
  cronExpression: string;
  maxMessages: number;
  maxDuration: number;
  onModeChange: (mode: SendMode) => void;
  onTargetTPSChange: (value: number) => void;
  onIntervalMsChange: (value: number) => void;
  onCronExpressionChange: (value: string) => void;
  onMaxMessagesChange: (value: number) => void;
  onMaxDurationChange: (value: number) => void;
  disabled?: boolean;
}

const strategies = [
  { mode: 'immediate' as SendMode, label: 'Immediate', icon: Play, desc: 'Send once immediately' },
  { mode: 'tps' as SendMode, label: 'TPS Control', icon: Zap, desc: 'Control message rate' },
  { mode: 'interval' as SendMode, label: 'Interval', icon: Timer, desc: 'Fixed time intervals' },
  { mode: 'cron' as SendMode, label: 'Cron', icon: Clock, desc: 'Cron schedule' },
];

export function StrategyConfig({
  mode,
  targetTPS,
  intervalMs,
  cronExpression,
  maxMessages,
  maxDuration,
  onModeChange,
  onTargetTPSChange,
  onIntervalMsChange,
  onCronExpressionChange,
  onMaxMessagesChange,
  onMaxDurationChange,
  disabled
}: StrategyConfigProps) {
  return (
    <div className="space-y-4">
      {/* Mode Selection */}
      <div className="grid grid-cols-4 gap-3">
        {strategies.map(({ mode: m, label, icon: Icon, desc }) => (
          <button
            key={m}
            onClick={() => onModeChange(m)}
            disabled={disabled}
            className={`p-3 rounded-lg border text-left transition-all ${
              mode === m 
                ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                : 'border-border hover:border-primary/50 hover:bg-muted/50'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Icon className={`w-5 h-5 mb-2 ${mode === m ? 'text-primary' : 'text-muted-foreground'}`} />
            <div className={`text-sm font-medium ${mode === m ? 'text-primary' : ''}`}>{label}</div>
            <div className="text-xs text-muted-foreground">{desc}</div>
          </button>
        ))}
      </div>

      {/* Config Fields */}
      <div className="grid grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
        {mode === 'tps' && (
          <div>
            <label className="text-xs font-medium mb-1 block text-muted-foreground">Target TPS</label>
            <Input
              type="number"
              min={1}
              max={10000}
              value={targetTPS}
              onChange={e => onTargetTPSChange(parseInt(e.target.value) || 1000)}
              disabled={disabled}
            />
            <div className="text-xs text-muted-foreground mt-1">1 - 10000</div>
          </div>
        )}

        {mode === 'interval' && (
          <div>
            <label className="text-xs font-medium mb-1 block text-muted-foreground">Interval (ms)</label>
            <Input
              type="number"
              min={1}
              max={3600000}
              value={intervalMs}
              onChange={e => onIntervalMsChange(parseInt(e.target.value) || 1000)}
              disabled={disabled}
            />
            <div className="text-xs text-muted-foreground mt-1">1ms - 1hr</div>
          </div>
        )}

        {mode === 'cron' && (
          <div className="col-span-2">
            <label className="text-xs font-medium mb-1 block text-muted-foreground">Cron Expression</label>
            <Input
              value={cronExpression}
              onChange={e => onCronExpressionChange(e.target.value)}
              disabled={disabled}
              placeholder="*/5 * * * * *"
            />
            <div className="text-xs text-muted-foreground mt-1">Seconds Minutes Hours Day Month Week</div>
          </div>
        )}

        <div>
          <label className="text-xs font-medium mb-1 block text-muted-foreground">Max Messages</label>
          <Input
            type="number"
            min={0}
            value={maxMessages}
            onChange={e => onMaxMessagesChange(parseInt(e.target.value) || 0)}
            disabled={disabled}
          />
          <div className="text-xs text-muted-foreground mt-1">0 = unlimited</div>
        </div>

        <div>
          <label className="text-xs font-medium mb-1 block text-muted-foreground">Max Duration (min)</label>
          <Input
            type="number"
            min={0}
            value={maxDuration}
            onChange={e => onMaxDurationChange(parseInt(e.target.value) || 0)}
            disabled={disabled}
          />
          <div className="text-xs text-muted-foreground mt-1">0 = unlimited</div>
        </div>
      </div>
    </div>
  );
}
