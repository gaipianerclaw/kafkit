import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Send, FileJson, Clock, Code } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { useConnectionStore } from '../../stores';
import { useTranslation } from 'react-i18next';
import { SingleMode } from './SingleMode';
import { BatchMode } from './BatchMode';
import { ScheduledMode } from './ScheduledMode';
import { ScriptMode } from './ScriptMode';

export function ProducerPage() {
  const navigate = useNavigate();
  const { topic } = useParams();
  const { activeConnection } = useConnectionStore();
  const { t } = useTranslation();
  
  const [mode, setMode] = useState<'single' | 'batch' | 'scheduled' | 'script'>('single');
  const [format, setFormat] = useState<'json' | 'text' | 'csv'>('text');

  const decodedTopic = topic ? decodeURIComponent(topic) : '';

  if (!activeConnection) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">{t('producer.noConnection')}</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => navigate('/main/connections')}
          >
            {t('producer.goToConnections')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="h-14 border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" onClick={() => navigate('/main/topics')} className="mr-2">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-lg font-semibold">{t('producer.title')}: {decodedTopic}</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Format Selector (hide in script mode) */}
          {mode !== 'script' && (
            <Select
              value={format}
              onChange={e => setFormat(e.target.value as typeof format)}
              options={[
                { value: 'text', label: t('producer.formats.text') },
                { value: 'json', label: t('producer.formats.json') },
                { value: 'csv', label: t('producer.formats.csv') },
              ]}
              className="w-32"
            />
          )}
          
          {/* Mode Tabs */}
          <div className="flex bg-muted rounded-lg p-1">
            <button
              onClick={() => setMode('single')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1 ${
                mode === 'single' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              {t('producer.singleMode')}
            </button>
            <button
              onClick={() => setMode('batch')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1 ${
                mode === 'batch' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileJson className="w-3.5 h-3.5" />
              {t('producer.batchMode')}
            </button>
            <button
              onClick={() => setMode('scheduled')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1 ${
                mode === 'scheduled' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              {t('producer.scheduledMode')}
            </button>
            <button
              onClick={() => setMode('script')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1 ${
                mode === 'script' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              {t('producer.scriptMode')}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto min-h-0">
        <div className="max-w-7xl mx-auto">
          {mode === 'single' && (
            <SingleMode 
              connection={activeConnection} 
              topic={decodedTopic} 
              format={format}
            />
          )}
          {mode === 'batch' && (
            <BatchMode 
              connection={activeConnection} 
              topic={decodedTopic}
              format={format}
            />
          )}
          {mode === 'scheduled' && (
            <ScheduledMode 
              connection={activeConnection} 
              topic={decodedTopic}
              format={format}
            />
          )}
          {mode === 'script' && (
            <ScriptMode 
              connection={activeConnection} 
              topic={decodedTopic}
            />
          )}
        </div>
      </div>
    </div>
  );
}
