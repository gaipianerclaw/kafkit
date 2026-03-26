import { useEffect, useCallback } from 'react';

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: () => void;
  description?: string;
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // 如果正在输入框中输入，不触发快捷键
    const target = event.target as HTMLElement;
    if (target instanceof HTMLInputElement || 
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target.isContentEditable) {
      return;
    }

    for (const shortcut of shortcuts) {
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatch = !!shortcut.ctrl === (event.ctrlKey || event.metaKey);
      const shiftMatch = !!shortcut.shift === event.shiftKey;
      const altMatch = !!shortcut.alt === event.altKey;

      if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
        event.preventDefault();
        event.stopPropagation();
        console.log(`[KeyboardShortcut] Triggered: ${shortcut.description || shortcut.key}`);
        shortcut.handler();
        return;
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    console.log('[KeyboardShortcut] Registered shortcuts:', shortcuts.map(s => s.description || s.key));
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// 常用快捷键配置
export const commonShortcuts = {
  refresh: { key: 'r', ctrl: true, description: 'Refresh' },
  search: { key: 'k', ctrl: true, description: 'Quick search' },
  escape: { key: 'Escape', description: 'Close/Cancel' },
  create: { key: 'n', ctrl: true, description: 'Create new' },
  save: { key: 's', ctrl: true, description: 'Save' },
};
