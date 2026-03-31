import { useState, useRef, useCallback, useEffect } from 'react';
import { Play, Pause, Square, Eye, Sparkles, Zap, Clock, Timer, Settings } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { ScriptEditor } from './ScriptEditor';
import { TemplateSelector } from './TemplateSelector';
import { KeyStrategyPanel } from './KeyStrategyPanel';
import { PreviewPanel } from './PreviewPanel';
import { MonitorPanel } from './MonitorPanel';
import type { 
  SendTask, 
  KeyStrategy, 
  ScriptMessage,
  ScriptTemplate 
} from '../../../types/script';

// 内置模板
import { templates } from '../../../services/script/templates';

interface ScriptModeProps {
  connection: any;
  topic: string;
}

// 默认脚本
const defaultScript = `function generate(ctx) {
  // Generate a simple message with UUID key
  return {
    key: ctx.uuid(),
    value: {
      id: ctx.index,
      message: "Hello from Kafkit Script Mode",
      timestamp: ctx.now()
    }
  };
}`;

export function ScriptMode({ connection: _connection, topic: _topic }: ScriptModeProps) {
  
  // Editor state
  const [script, setScript] = useState(defaultScript);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  
  // Key strategy state
  const [keyStrategy, setKeyStrategy] = useState<KeyStrategy>({
    type: 'roundrobin',
    partitionCount: 3
  });
  
  // Send config state
  const [sendMode, setSendMode] = useState<'immediate' | 'tps' | 'interval' | 'cron'>('immediate');
  const [targetTPS, setTargetTPS] = useState(1000);
  const [intervalMs, setIntervalMs] = useState(1000);
  const [cronExpression, setCronExpression] = useState('*/5 * * * * *');
  const [maxMessages, setMaxMessages] = useState(0);
  const [maxDuration, setMaxDuration] = useState(0);
  
  // Execution state
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [task, setTask] = useState<SendTask | null>(null);
  
  // Preview state
  const [preview, setPreview] = useState<ScriptMessage | ScriptMessage[] | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  
  // Refs for execution control
  const abortRef = useRef(false);
  const pauseRef = useRef(false);
  const statsRef = useRef({
    sentCount: 0,
    successCount: 0,
    failedCount: 0,
    startTime: 0,
    errorLog: [] as { timestamp: number; message: string }[]
  });

  // Handle template selection
  const handleSelectTemplate = (template: ScriptTemplate) => {
    setScript(template.script);
    setKeyStrategy(template.defaultKeyStrategy);
    setSelectedTemplate(template.id);
  };

  // Handle preview
  const handlePreview = async () => {
    setPreviewError(null);
    setPreview(null);
    
    try {
      // TODO: Implement script execution using QuickJS
      // For now, show a mock preview
      const mockMessage: ScriptMessage = {
        key: `key-${Date.now()}`,
        value: {
          id: 0,
          message: "Preview output (QuickJS not yet integrated)",
          timestamp: new Date().toISOString()
        }
      };
      setPreview(mockMessage);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Stop execution
  const stopExecution = useCallback(() => {
    abortRef.current = true;
    pauseRef.current = false;
    setIsRunning(false);
    setIsPaused(false);
  }, []);

  // Pause execution
  const pauseExecution = useCallback(() => {
    pauseRef.current = true;
    setIsPaused(true);
  }, []);

  // Resume execution
  const resumeExecution = useCallback(() => {
    pauseRef.current = false;
    setIsPaused(false);
  }, []);

  // Start execution
  const startExecution = async () => {
    abortRef.current = false;
    pauseRef.current = false;
    setIsRunning(true);
    setIsPaused(false);
    
    // Reset stats
    statsRef.current = {
      sentCount: 0,
      successCount: 0,
      failedCount: 0,
      startTime: Date.now(),
      errorLog: []
    };
    
    // TODO: Implement actual execution logic
    // This is a placeholder that simulates execution
    
    const runLoop = async () => {
      while (!abortRef.current) {
        if (pauseRef.current) {
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        }
        
        // Check limits
        if (maxMessages > 0 && statsRef.current.sentCount >= maxMessages) {
          break;
        }
        if (maxDuration > 0 && Date.now() - statsRef.current.startTime >= maxDuration * 60 * 1000) {
          break;
        }
        
        // Simulate sending
        await new Promise(resolve => setTimeout(resolve, 10));
        statsRef.current.sentCount++;
        statsRef.current.successCount++;
        
        // Update task state for UI
        setTask({
          id: 'task-1',
          status: 'running',
          config: {
            mode: sendMode,
            script,
            keyStrategy,
            targetTPS,
            intervalMs,
            cronExpression,
            maxMessages,
            maxDurationMs: maxDuration * 60 * 1000
          },
          sentCount: statsRef.current.sentCount,
          successCount: statsRef.current.successCount,
          failedCount: statsRef.current.failedCount,
          startTime: statsRef.current.startTime,
          errors: statsRef.current.errorLog,
          currentTPS: Math.round(statsRef.current.sentCount / ((Date.now() - statsRef.current.startTime) / 1000))
        });
        
        // Rate limiting based on mode
        if (sendMode === 'tps') {
          await new Promise(resolve => setTimeout(resolve, 1000 / targetTPS));
        } else if (sendMode === 'interval') {
          await new Promise(resolve => setTimeout(resolve, intervalMs));
        }
      }
      
      setIsRunning(false);
      setIsPaused(false);
    };
    
    runLoop();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current = true;
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* Main Layout: Left Sidebar + Right Content */}
      <div className="grid grid-cols-12 gap-4">
        {/* Left Sidebar */}
        <div className="col-span-3 space-y-4">
          {/* Template Selector */}
          <TemplateSelector
            templates={templates}
            selectedId={selectedTemplate}
            onSelect={handleSelectTemplate}
          />
          
          {/* Key Strategy */}
          <KeyStrategyPanel
            strategy={keyStrategy}
            onChange={setKeyStrategy}
            disabled={isRunning}
          />
        </div>
        
        {/* Right Content */}
        <div className="col-span-9 space-y-4">
          {/* Script Editor */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted px-3 py-2 border-b flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                JavaScript Editor
              </span>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handlePreview} disabled={isRunning}>
                  <Eye className="w-4 h-4 mr-1" />
                  Preview
                </Button>
              </div>
            </div>
            <ScriptEditor
              value={script}
              onChange={setScript}
              height="300px"
            />
          </div>
          
          {/* Send Strategy */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-4 h-4" />
              <span className="text-sm font-medium">Sending Strategy</span>
            </div>
            
            <div className="grid grid-cols-4 gap-4 mb-4">
              <button
                onClick={() => setSendMode('immediate')}
                disabled={isRunning}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  sendMode === 'immediate' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <Zap className="w-4 h-4 mb-2" />
                <div className="text-sm font-medium">Immediate</div>
                <div className="text-xs text-muted-foreground">Send once</div>
              </button>
              
              <button
                onClick={() => setSendMode('tps')}
                disabled={isRunning}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  sendMode === 'tps' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <Settings className="w-4 h-4 mb-2" />
                <div className="text-sm font-medium">TPS Control</div>
                <div className="text-xs text-muted-foreground">Rate limited</div>
              </button>
              
              <button
                onClick={() => setSendMode('interval')}
                disabled={isRunning}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  sendMode === 'interval' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <Timer className="w-4 h-4 mb-2" />
                <div className="text-sm font-medium">Interval</div>
                <div className="text-xs text-muted-foreground">Fixed delay</div>
              </button>
              
              <button
                onClick={() => setSendMode('cron')}
                disabled={isRunning}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  sendMode === 'cron' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <Clock className="w-4 h-4 mb-2" />
                <div className="text-sm font-medium">Cron</div>
                <div className="text-xs text-muted-foreground">Scheduled</div>
              </button>
            </div>
            
            {/* Strategy-specific config */}
            <div className="grid grid-cols-4 gap-4">
              {sendMode === 'tps' && (
                <div>
                  <label className="text-xs font-medium mb-1 block">Target TPS</label>
                  <Input
                    type="number"
                    min={1}
                    max={10000}
                    value={targetTPS}
                    onChange={e => setTargetTPS(parseInt(e.target.value) || 1000)}
                    disabled={isRunning}
                  />
                </div>
              )}
              
              {sendMode === 'interval' && (
                <div>
                  <label className="text-xs font-medium mb-1 block">Interval (ms)</label>
                  <Input
                    type="number"
                    min={1}
                    max={3600000}
                    value={intervalMs}
                    onChange={e => setIntervalMs(parseInt(e.target.value) || 1000)}
                    disabled={isRunning}
                  />
                </div>
              )}
              
              {sendMode === 'cron' && (
                <div className="col-span-2">
                  <label className="text-xs font-medium mb-1 block">Cron Expression (seconds)</label>
                  <Input
                    value={cronExpression}
                    onChange={e => setCronExpression(e.target.value)}
                    disabled={isRunning}
                    placeholder="*/5 * * * * *"
                  />
                </div>
              )}
              
              <div>
                <label className="text-xs font-medium mb-1 block">Max Messages (0=unlimited)</label>
                <Input
                  type="number"
                  min={0}
                  value={maxMessages}
                  onChange={e => setMaxMessages(parseInt(e.target.value) || 0)}
                  disabled={isRunning}
                />
              </div>
              
              <div>
                <label className="text-xs font-medium mb-1 block">Max Duration (min)</label>
                <Input
                  type="number"
                  min={0}
                  value={maxDuration}
                  onChange={e => setMaxDuration(parseInt(e.target.value) || 0)}
                  disabled={isRunning}
                />
              </div>
            </div>
            
            {/* Control Buttons */}
            <div className="flex justify-end gap-2 mt-4">
              {!isRunning ? (
                <Button onClick={startExecution}>
                  <Play className="w-4 h-4 mr-2" />
                  Start
                </Button>
              ) : isPaused ? (
                <Button onClick={resumeExecution}>
                  <Play className="w-4 h-4 mr-2" />
                  Resume
                </Button>
              ) : (
                <Button variant="outline" onClick={pauseExecution}>
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </Button>
              )}
              
              {isRunning && (
                <Button variant="destructive" onClick={stopExecution}>
                  <Square className="w-4 h-4 mr-2" />
                  Stop
                </Button>
              )}
            </div>
          </div>
          
          {/* Preview & Monitor */}
          <div className="grid grid-cols-2 gap-4">
            <PreviewPanel 
              preview={preview} 
              error={previewError}
            />
            <MonitorPanel 
              task={task}
              isRunning={isRunning}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
