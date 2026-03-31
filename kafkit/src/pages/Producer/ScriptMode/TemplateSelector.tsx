import { useState } from 'react';
import { ChevronDown, ChevronRight, FileCode, Cpu, ShoppingCart, ScrollText, TrendingUp, Activity, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import type { ScriptTemplate } from '../../../types/script';

interface TemplateSelectorProps {
  templates: ScriptTemplate[];
  selectedId: string;
  onSelect: (template: ScriptTemplate) => void;
}

const categoryIcons: Record<string, ReactNode> = {
  iot: <Cpu className="w-4 h-4" />,
  ecommerce: <ShoppingCart className="w-4 h-4" />,
  log: <ScrollText className="w-4 h-4" />,
  finance: <TrendingUp className="w-4 h-4" />,
  social: <MessageSquare className="w-4 h-4" />,
  system: <Activity className="w-4 h-4" />,
};

// Map template id to i18n key
const templateKeyMap: Record<string, string> = {
  'iot-sensor': 'iotSensor',
  'ecommerce-order': 'ecommerceOrder',
  'log-stream': 'logStream',
  'stock-ticker': 'stockTicker',
  'user-activity': 'userActivity',
  'metric-stream': 'metricStream',
  'social-feed': 'socialFeed',
  'transaction': 'transaction',
};

export function TemplateSelector({ templates, selectedId, onSelect }: TemplateSelectorProps) {
  const { t } = useTranslation();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['iot']));
  
  // Group templates by category
  const grouped = templates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, ScriptTemplate[]>);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const getTemplateName = (template: ScriptTemplate): string => {
    const key = templateKeyMap[template.id];
    if (key && template.nameKey) {
      return t(template.nameKey);
    }
    return template.name || template.id;
  };

  const getTemplateDesc = (template: ScriptTemplate): string => {
    const key = templateKeyMap[template.id];
    if (key && template.descriptionKey) {
      return t(template.descriptionKey);
    }
    return template.description || '';
  };

  return (
    <div className="border rounded-lg overflow-hidden shadow-sm">
      <div className="bg-muted px-4 py-3 border-b">
        <span className="text-sm font-medium flex items-center gap-2">
          <FileCode className="w-4 h-4" />
          {t('producer.script.templates')}
        </span>
      </div>
      
      <div className="max-h-[320px] overflow-y-auto">
        {Object.entries(grouped).map(([category, categoryTemplates]) => (
          <div key={category} className="border-b last:border-b-0">
            <button
              onClick={() => toggleCategory(category)}
              className="w-full px-4 py-2.5 flex items-center gap-2 hover:bg-muted/50 transition-colors text-left"
            >
              {expandedCategories.has(category) ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
              {categoryIcons[category]}
              <span className="text-sm font-medium">
                {t(`producer.script.templateCategories.${category}`)}
              </span>
              <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {categoryTemplates.length}
              </span>
            </button>
            
            {expandedCategories.has(category) && (
              <div className="bg-muted/20">
                {categoryTemplates.map(template => (
                  <button
                    key={template.id}
                    onClick={() => onSelect(template)}
                    className={`w-full px-4 py-2.5 pl-10 text-left text-sm transition-colors ${
                      selectedId === template.id
                        ? 'bg-primary/10 text-primary border-l-2 border-primary'
                        : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground border-l-2 border-transparent'
                    }`}
                  >
                    <div className="font-medium truncate">{getTemplateName(template)}</div>
                    <div className="text-xs opacity-70 truncate mt-0.5">
                      {getTemplateDesc(template)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        
        {templates.length === 0 && (
          <div className="px-4 py-6 text-sm text-muted-foreground text-center">
            No templates available
          </div>
        )}
      </div>
    </div>
  );
}
