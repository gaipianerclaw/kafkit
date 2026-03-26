import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { HelpCircle, X } from 'lucide-react';
import { createPortal } from 'react-dom';

export function SearchHelp() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ top: 0, right: 0 });

  // 计算面板位置
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [isOpen]);

  // 点击外部关闭
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded"
        title={t('search.help', 'Search Help')}
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {isOpen && createPortal(
        <div 
          className="fixed w-[400px] max-w-[90vw] bg-card border border-border rounded-lg shadow-2xl z-[9999]"
          style={{ top: position.top, right: position.right }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="font-medium">{t('search.syntax', 'Search Syntax')}</h3>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="p-4 space-y-4 text-sm max-h-[60vh] overflow-y-auto">
            {/* 基础搜索 */}
            <div>
              <h4 className="font-medium mb-2 text-primary">{t('search.basic', 'Basic Search')}</h4>
              <div className="space-y-1.5 text-muted-foreground">
                <div className="flex items-center gap-3">
                  <code className="px-2 py-1 bg-muted rounded font-mono text-xs">keyword</code>
                  <span>{t('search.keywordDesc', 'Search in all fields')}</span>
                </div>
                <div className="flex items-center gap-3">
                  <code className="px-2 py-1 bg-muted rounded font-mono text-xs">&quot;exact phrase&quot;</code>
                  <span>{t('search.exactDesc', 'Exact match')}</span>
                </div>
                <div className="flex items-center gap-3">
                  <code className="px-2 py-1 bg-muted rounded font-mono text-xs">-exclude</code>
                  <span>{t('search.excludeDesc', 'Exclude term')}</span>
                </div>
              </div>
            </div>

            {/* 字段过滤 */}
            <div>
              <h4 className="font-medium mb-2 text-primary">{t('search.filters', 'Field Filters')}</h4>
              <div className="space-y-1.5 text-muted-foreground">
                <div className="flex items-center gap-3">
                  <code className="px-2 py-1 bg-muted rounded font-mono text-xs">key:value</code>
                  <span>{t('search.keyFilter', 'Filter by key')}</span>
                </div>
                <div className="flex items-center gap-3">
                  <code className="px-2 py-1 bg-muted rounded font-mono text-xs">offset:&gt;1000</code>
                  <span>{t('search.offsetFilter', 'Offset greater than')}</span>
                </div>
                <div className="flex items-center gap-3">
                  <code className="px-2 py-1 bg-muted rounded font-mono text-xs">partition:0</code>
                  <span>{t('search.partitionFilter', 'Specific partition')}</span>
                </div>
              </div>
            </div>

            {/* 示例 */}
            <div>
              <h4 className="font-medium mb-2 text-primary">{t('search.examples', 'Examples')}</h4>
              <div className="space-y-1.5 text-xs text-muted-foreground bg-muted/50 p-3 rounded">
                <code className="block font-mono">user:admin action:login</code>
                <code className="block font-mono">status:error -retry</code>
                <code className="block font-mono">offset:&gt;1000000 partition:0</code>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
