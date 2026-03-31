import { useState, useRef, useCallback, useEffect } from 'react';
import { Play, Pause, Square, Eye, Settings, Zap, Clock, Timer, Terminal, AlertCircle } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useTranslation } from 'react-i18next';
import { ScriptEditor } from './ScriptEditor';
import { TemplateSelector } from './TemplateSelector';
import { KeyStrategyPanel } from './KeyStrategyPanel';
import { MonitorPanel } from './MonitorPanel';
import { getScriptEngine } from '../../../services/script/ScriptEngine';
import type { 
  SendTask, 
  KeyStrategy, 
  ScriptMessage,
  ScriptTemplate,
  ScriptContext
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
  const { t } = useTranslation();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'script' | 'preview'>('script');
  
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [engineReady, setEngineReady] = useState(false);
  
  // Script context state (for persistence across executions)
  const scriptStateRef = useRef<Record<string, any>>({});
  const messageIndexRef = useRef(0);
  
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

  // Initialize script engine
  useEffect(() => {
    const initEngine = async () => {
      try {
        await getScriptEngine();
        setEngineReady(true);
      } catch (error) {
        console.error('Failed to initialize script engine:', error);
        setPreviewError('Script engine initialization failed');
      }
    };
    
    initEngine();
  }, []);

  // Handle template selection
  const handleSelectTemplate = (template: ScriptTemplate) => {
    setScript(template.script);
    setKeyStrategy(template.defaultKeyStrategy);
    setSelectedTemplate(template.id);
    // Reset preview when template changes
    setPreview(null);
    scriptStateRef.current = {};
    messageIndexRef.current = 0;
  };

  // Create script context
  const createScriptContext = useCallback((): ScriptContext => {
    return {
      index: messageIndexRef.current,
      state: scriptStateRef.current,
      timestamp: Date.now(),
      // These will be injected by the engine, but we define the interface here
      random: () => 0,
      randomFloat: () => 0,
      uuid: () => '',
      now: () => '',
      hash: () => '',
      base64: () => '',
      faker: {
        name: () => '',
        email: () => '',
        phone: () => '',
        address: () => '',
        company: () => '',
        lorem: () => ''
      }
    };
  }, []);

  // Generate preview data
  const generatePreview = useCallback(async () => {
    if (!engineReady) {
      setPreviewError('Script engine not ready');
      return;
    }

    setIsGenerating(true);
    setPreviewError(null);
    
    try {
      const engine = await getScriptEngine();
      const context = createScriptContext();
      
      const result = await engine.executeScript(script, context);
      
      // Update state for next execution
      scriptStateRef.current = context.state;
      messageIndexRef.current = context.index + 1;
      
      setPreview(result);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'Script execution failed');
      setPreview(null);
    } finally {
      setIsGenerating(false);
    }
  }, [engineReady, script, createScriptContext]);

  // Handle tab switch - auto generate preview when switching to preview tab
  const handleTabSwitch = useCallback((tab: 'script' | 'preview') => {
    setActiveTab(tab);
    if (tab === 'preview') {
      generatePreview();
    }
  }, [generatePreview]);

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
    if (!engineReady) {
      setPreviewError('Script engine not ready');
      return;
    }

    abortRef.current = false;
    pauseRef.current = false;
    setIsRunning(true);
    setIsPaused(false);
    
    // Reset stats and state
    statsRef.current = {
      sentCount: 0,
      successCount: 0,
      failedCount: 0,
      startTime: Date.now(),
      errorLog: []
    };
    scriptStateRef.current = {};
    messageIndexRef.current = 0;
    
    const engine = await getScriptEngine();
    
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
        
        try {
          // Generate message using script
          const context = createScriptContext();
          const messages = await engine.executeScript(script, context);
          
          // Handle single message or array
          const messageArray = Array.isArray(messages) ? messages : [messages];
          
          // Update state
          scriptStateRef.current = context.state;
          messageIndexRef.current = context.index + messageArray.length;
          
          // TODO: Send messages to Kafka
          // For now just count them
          statsRef.current.sentCount += messageArray.length;
          statsRef.current.successCount += messageArray.length;
          
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
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Script execution failed';
          statsRef.current.failedCount++;
          statsRef.current.errorLog.push({
            timestamp: Date.now(),
            message: errorMsg
          });
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

  // Render preview content
  const renderPreviewContent = () => {
    if (!engineReady) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Initializing script engine...</span>
        </div>
      );
    }

    if (isGenerating) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">{t('common.loading')}</span>
        </div>
      );
    }

    if (previewError) {
      return (
        <div className="flex items-start gap-3 text-red-600 p-4">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-medium">{t('producer.script.previewPanel.error')}</div>
            <div className="text-sm mt-1">{previewError}</div>
          </div>
        </div>
      );
    }

    if (preview) {
      return (
        <div className="space-y-4">
          {Array.isArray(preview) ? (
            <div className="text-sm text-muted-foreground">
              {t('producer.script.previewPanel.generatedCount', { count: preview.length })}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              {t('producer.script.previewPanel.generatedMsg')}
            </div>
          )}
          
          {(Array.isArray(preview) ? preview : [preview]).map((msg, idx) => (
            <div key={idx} className="bg-background rounded-lg p-4 border shadow-sm">
              <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                Message {idx + 1}
              </div>
              <div className="space-y-2">
                <div className="flex gap-3">
                  <span className="text-xs font-medium text-muted-foreground w-16">Key:</span>
                  <span className="text-sm font-mono text-primary bg-primary/5 px-2 py-0.5 rounded">
                    {msg.key || 'null'}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground w-16 inline-block">Value:</span>
                  <pre className="mt-2 p-3 bg-muted/50 rounded-lg font-mono text-xs overflow-x-auto">
                    {msg.value !== undefined && msg.value !== null
                      ? (typeof msg.value === 'object' 
                          ? JSON.stringify(msg.value, null, 2) 
                          : String(msg.value))
                      : JSON.stringify(msg, null, 2)}
                  </pre>
                </div>
                {msg.headers && Object.keys(msg.headers).length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground w-16 inline-block">Headers:</span>
                    <pre className="mt-2 p-3 bg-muted/50 rounded-lg font-mono text-xs overflow-x-auto">
                      {JSON.stringify(msg.headers, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <Eye className="w-8 h-8 opacity-30" />
        </div>
        <div className="text-center">
          <p className="font-medium">{t('producer.script.previewPanel.emptyTitle')}</p>
          <p className="text-sm mt-1">{t('producer.script.previewPanel.emptyDesc')}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Main Layout: Left Sidebar + Right Content */}
      <div className="grid grid-cols-12 gap-5">
        {/* Left Sidebar */}
        <div className="col-span-3 space-y-5">
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
        <div className="col-span-9 space-y-5">
          {/* Editor/Preview Tabs */}
          <div className="border rounded-lg overflow-hidden shadow-sm">
            {/* Tab Header */}
            <div className="bg-muted px-4 py-2 border-b flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleTabSwitch('script')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                    activeTab === 'script'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <Terminal className="w-4 h-4" />
                  {t('producer.script.editor')}
                </button>
                <button
                  onClick={() => handleTabSwitch('preview')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                    activeTab === 'preview'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  {t('producer.script.preview')}
                </button>
              </div>
            </div>
            
            {/* Tab Content */}
            <div className="h-[450px]">
              {activeTab === 'script' ? (
                <ScriptEditor
                  value={script}
                  onChange={setScript}
                  height="450px"
                />
              ) : (
                <div className="h-full overflow-auto p-4 bg-muted/20">
                  {renderPreviewContent()}
                </div>
              )}
            </div>
          </div>
          
          {/* Send Strategy */}
          <div className="border rounded-lg p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <Settings className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t('producer.script.sendStrategy')}</span>
            </div>
            
            {/* Mode Selection */}
            <div className="grid grid-cols-4 gap-3 mb-5">
              <button
                onClick={() => setSendMode('immediate')}
                disabled={isRunning}
                className={`p-4 rounded-lg border text-left transition-all ${
                  sendMode === 'immediate' 
                    ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                    : 'border-border hover:border-primary/50 hover:bg-muted/30'
                } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Zap className={`w-5 h-5 mb-2 ${sendMode === 'immediate' ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className={`text-sm font-medium ${sendMode === 'immediate' ? 'text-primary' : ''}`}>
                  {t('producer.script.strategies.immediate.title')}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {t('producer.script.strategies.immediate.desc')}
                </div>
              </button>
              
              <button
                onClick={() => setSendMode('tps')}
                disabled={isRunning}
                className={`p-4 rounded-lg border text-left transition-all ${
                  sendMode === 'tps' 
                    ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                    : 'border-border hover:border-primary/50 hover:bg-muted/30'
                } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Settings className={`w-5 h-5 mb-2 ${sendMode === 'tps' ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className={`text-sm font-medium ${sendMode === 'tps' ? 'text-primary' : ''}`}>
                  {t('producer.script.strategies.tps.title')}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {t('producer.script.strategies.tps.desc')}
                </div>
              </button>
              
              <button
                onClick={() => setSendMode('interval')}
                disabled={isRunning}
                className={`p-4 rounded-lg border text-left transition-all ${
                  sendMode === 'interval' 
                    ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                    : 'border-border hover:border-primary/50 hover:bg-muted/30'
                } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Timer className={`w-5 h-5 mb-2 ${sendMode === 'interval' ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className={`text-sm font-medium ${sendMode === 'interval' ? 'text-primary' : ''}`}>
                  {t('producer.script.strategies.interval.title')}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {t('producer.script.strategies.interval.desc')}
                </div>
              </button>
              
              <button
                onClick={() => setSendMode('cron')}
                disabled={isRunning}
                className={`p-4 rounded-lg border text-left transition-all ${
                  sendMode === 'cron' 
                    ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                    : 'border-border hover:border-primary/50 hover:bg-muted/30'
                } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Clock className={`w-5 h-5 mb-2 ${sendMode === 'cron' ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className={`text-sm font-medium ${sendMode === 'cron' ? 'text-primary' : ''}`}>
                  {t('producer.script.strategies.cron.title')}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {t('producer.script.strategies.cron.desc')}
                </div>
              </button>
            </div>
            
            {/* Strategy-specific config */}
            <div className="bg-muted/30 rounded-lg p-4 mb-5">
              <div className="grid grid-cols-4 gap-4">
                {sendMode === 'tps' && (
                  <div>
                    <label className="text-xs font-medium mb-1.5 block text-muted-foreground">
                      {t('producer.script.fields.targetTPS')}
                    </label>
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
                    <label className="text-xs font-medium mb-1.5 block text-muted-foreground">
                      {t('producer.script.fields.interval')}
                    </label>
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
                    <label className="text-xs font-medium mb-1.5 block text-muted-foreground">
                      {t('producer.script.fields.cronExpression')}
                    </label>
                    <Input
                      value={cronExpression}
                      onChange={e => setCronExpression(e.target.value)}
                      disabled={isRunning}
                      placeholder="*/5 * * * * *"
                    />
                  </div>
                )}
                
                {/* Max Messages & Max Duration - Same row */}
                <div>
                  <label className="text-xs font-medium mb-1.5 block text-muted-foreground">
                    {t('producer.script.fields.maxMessages')}
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={maxMessages}
                    onChange={e => setMaxMessages(parseInt(e.target.value) || 0)}
                    disabled={isRunning}
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    {t('producer.script.fields.unlimited')}
                  </div>
                </div>
                
                <div>
                  <label className="text-xs font-medium mb-1.5 block text-muted-foreground">
                    {t('producer.script.fields.maxDuration')}
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={maxDuration}
                    onChange={e => setMaxDuration(parseInt(e.target.value) || 0)}
                    disabled={isRunning}
                  />
                </div>
              </div>
            </div>
            
            {/* Control Buttons */}
            <div className="flex justify-end gap-3">
              {!isRunning ? (
                <Button onClick={startExecution} size="md" disabled={!engineReady}>
                  <Play className="w-4 h-4 mr-2" />
                  {t('producer.script.start')}
                </Button>
              ) : isPaused ? (
                <Button onClick={resumeExecution} size="md">
                  <Play className="w-4 h-4 mr-2" />
                  {t('producer.script.resume')}
                </Button>
              ) : (
                <Button variant="outline" onClick={pauseExecution} size="md">
                  <Pause className="w-4 h-4 mr-2" />
                  {t('producer.script.pause')}
                </Button>
              )}
              
              {isRunning && (
                <Button variant="destructive" onClick={stopExecution} size="md">
                  <Square className="w-4 h-4 mr-2" />
                  {t('producer.script.stop')}
                </Button>
              )}
            </div>
          </div>
          
          {/* Monitor Panel */}
          <MonitorPanel 
            task={task}
            isRunning={isRunning}
          />
        </div>
      </div>
    </div>
  );
}
