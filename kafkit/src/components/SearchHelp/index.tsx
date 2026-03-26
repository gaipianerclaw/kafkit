import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HelpCircle, X } from 'lucide-react';

export function SearchHelp() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded"
        title={t('search.help', 'Search Help')}
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[400px] bg-card border border-border rounded-lg shadow-lg z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="font-medium">{t('search.syntax', 'Search Syntax')}</h3>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="p-4 space-y-4 text-sm">
            {/* 基础搜索 */}
            <div>
              <h4 className="font-medium mb-2 text-primary">{t('search.basic', 'Basic Search')}</h4>
              <div className="space-y-1 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <code className="px-1.5 py-0.5 bg-muted rounded">keyword</code>
                  <span>{t('search.keywordDesc', 'Search in all fields')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="px-1.5 py-0.5 bg-muted rounded">&quot;exact phrase&quot;</code>
                  <span>{t('search.exactDesc', 'Exact match')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="px-1.5 py-0.5 bg-muted rounded">-exclude</code>
                  <span>{t('search.excludeDesc', 'Exclude term')}</span>
                </div>
              </div>
            </div>

            {/* 字段过滤 */}
            <div>
              <h4 className="font-medium mb-2 text-primary">{t('search.filters', 'Field Filters')}</h4>
              <div className="space-y-1 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <code className="px-1.5 py-0.5 bg-muted rounded">key:value</code>
                  <span>{t('search.keyFilter', 'Filter by key')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="px-1.5 py-0.5 bg-muted rounded">offset:&gt;1000</code>
                  <span>{t('search.offsetFilter', 'Offset greater than')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="px-1.5 py-0.5 bg-muted rounded">partition:0</code>
                  <span>{t('search.partitionFilter', 'Specific partition')}</span>
                </div>
              </div>
            </div>

            {/* 示例 */}
            <div>
              <h4 className="font-medium mb-2 text-primary">{t('search.examples', 'Examples')}</h4>
              <div className="space-y-1 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                <code>user:admin action:login</code>
                <br />
                <code>status:error -retry</code>
                <br />
                <code>offset:&gt;1000000 partition:0</code>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
