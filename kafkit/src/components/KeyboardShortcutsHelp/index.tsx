import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, X } from 'lucide-react';

export function KeyboardShortcutsHelp() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        setIsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Ctrl + K', action: t('shortcuts.quickSearch', 'Quick search') },
    { key: 'Ctrl + R', action: t('shortcuts.refresh', 'Refresh') },
    { key: 'Ctrl + Enter', action: t('shortcuts.send', 'Send message') },
    { key: 'Esc', action: t('shortcuts.close', 'Close/Cancel') },
    { key: '?', action: t('shortcuts.help', 'Show shortcuts') },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg w-[400px] shadow-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            <h2 className="font-medium">{t('shortcuts.title', 'Keyboard Shortcuts')}</h2>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4">
          <div className="space-y-2">
            {shortcuts.map(({ key, action }) => (
              <div key={key} className="flex items-center justify-between py-2">
                <kbd className="px-2 py-1 bg-muted rounded text-sm font-mono border border-border">
                  {key}
                </kbd>
                <span className="text-sm text-muted-foreground">{action}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="px-4 py-3 border-t border-border bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">
            {t('shortcuts.tip', 'Press ? to toggle this help')}
          </p>
        </div>
      </div>
    </div>
  );
}
