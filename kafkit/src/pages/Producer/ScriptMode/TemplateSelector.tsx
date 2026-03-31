import { useState } from 'react';
import { ChevronDown, ChevronRight, FileCode, Cpu, ShoppingCart, ScrollText, TrendingUp, Activity, MessageSquare } from 'lucide-react';
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

const categoryLabels: Record<string, string> = {
  iot: 'IoT & Sensors',
  ecommerce: 'E-commerce',
  log: 'Logs & Events',
  finance: 'Finance',
  social: 'Social Media',
  system: 'System Metrics',
};

export function TemplateSelector({ templates, selectedId, onSelect }: TemplateSelectorProps) {
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

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-muted px-3 py-2 border-b">
        <span className="text-sm font-medium flex items-center gap-2">
          <FileCode className="w-4 h-4" />
          Templates
        </span>
      </div>
      
      <div className="max-h-[300px] overflow-y-auto">
        {Object.entries(grouped).map(([category, categoryTemplates]) => (
          <div key={category} className="border-b last:border-b-0">
            <button
              onClick={() => toggleCategory(category)}
              className="w-full px-3 py-2 flex items-center gap-2 hover:bg-muted/50 transition-colors text-left"
            >
              {expandedCategories.has(category) ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
              {categoryIcons[category]}
              <span className="text-sm font-medium">{categoryLabels[category] || category}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {categoryTemplates.length}
              </span>
            </button>
            
            {expandedCategories.has(category) && (
              <div className="bg-muted/30">
                {categoryTemplates.map(template => (
                  <button
                    key={template.id}
                    onClick={() => onSelect(template)}
                    className={`w-full px-3 py-2 pl-9 text-left text-sm transition-colors ${
                      selectedId === template.id
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <div className="font-medium">{template.name}</div>
                    <div className="text-xs opacity-70 truncate">
                      {template.description}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        
        {templates.length === 0 && (
          <div className="px-3 py-4 text-sm text-muted-foreground text-center">
            No templates available
          </div>
        )}
      </div>
    </div>
  );
}
