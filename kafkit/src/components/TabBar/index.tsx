/**
 * TabBar - Multi-tab navigation bar for consumers and producers
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { Plus, Home } from 'lucide-react';

import { useTabStore } from '../../stores';
import { TabItem } from './TabItem';
import { useTranslation } from 'react-i18next';

interface TabBarProps {
  onNewTab: () => void;
}

export function TabBar({ onNewTab }: TabBarProps) {
  const { t } = useTranslation();
  const { tabs, activeTabId, activateTab, closeTab, reorderTabs, closeOtherTabs, closeTabsToRight } = useTabStore();
  // const { activeConnection } = useConnectionStore();
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    tabId: string;
  } | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  // Use draggedIndex to avoid unused variable warning while keeping for future use
  void draggedIndex;
  const tabBarRef = useRef<HTMLDivElement>(null);

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  const handleContextMenu = useCallback((e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      tabId
    });
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.setData('text/plain', String(index));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, _index: number) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (dragIndex !== dropIndex && !isNaN(dragIndex)) {
      reorderTabs(dragIndex, dropIndex);
    }
    setDraggedIndex(null);
  }, [reorderTabs]);

  const handleContextMenuAction = (action: 'close' | 'closeOthers' | 'closeToRight') => {
    if (!contextMenu) return;
    
    switch (action) {
      case 'close':
        closeTab(contextMenu.tabId);
        break;
      case 'closeOthers':
        closeOtherTabs(contextMenu.tabId);
        break;
      case 'closeToRight':
        closeTabsToRight(contextMenu.tabId);
        break;
    }
    setContextMenu(null);
  };

  const goHome = () => {
    // Deactivate current tab to show Topic panel workspace, but keep all tabs open
    activateTab(null);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+W: Close current tab
      if (e.ctrlKey && e.key === 'w') {
        e.preventDefault();
        if (activeTabId) {
          closeTab(activeTabId);
        }
      }
      // Ctrl+T: New tab
      if (e.ctrlKey && e.key === 't') {
        e.preventDefault();
        onNewTab();
      }
      // Ctrl+Tab: Next tab
      if (e.ctrlKey && e.key === 'Tab') {
        e.preventDefault();
        const currentIndex = tabs.findIndex(t => t.id === activeTabId);
        const nextIndex = (currentIndex + 1) % tabs.length;
        if (tabs[nextIndex]) {
          activateTab(tabs[nextIndex].id);
        }
      }
      // Ctrl+Shift+Tab: Previous tab
      if (e.ctrlKey && e.shiftKey && e.key === 'Tab') {
        e.preventDefault();
        const currentIndex = tabs.findIndex(t => t.id === activeTabId);
        const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        if (tabs[prevIndex]) {
          activateTab(tabs[prevIndex].id);
        }
      }
      // Ctrl+1-9: Jump to tab
      if (e.ctrlKey && e.key >= '1' && e.key <= '9') {
        const index = parseInt(e.key, 10) - 1;
        if (tabs[index]) {
          activateTab(tabs[index].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tabs, activeTabId, closeTab, activateTab, onNewTab]);

  return (
    <>
      <div 
        ref={tabBarRef}
        className="flex items-center h-10 bg-muted/30 border-b border-border overflow-hidden"
      >
        {/* Home Button */}
        <button
          onClick={goHome}
          className="flex-shrink-0 flex items-center justify-center w-10 h-full hover:bg-muted/50 transition-colors border-r border-border/50"
          title={t('nav.home')}
        >
          <Home className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Tab List */}
        <div className="flex-1 flex items-center overflow-x-auto scrollbar-hide">
          {tabs.map((tab, index) => (
            <TabItem
              key={tab.id}
              tab={tab}
              isActive={tab.id === activeTabId}
              onActivate={() => activateTab(tab.id)}
              onClose={() => closeTab(tab.id)}
              onContextMenu={(e) => handleContextMenu(e, tab.id)}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              index={index}
            />
          ))}
        </div>

        {/* New Tab Button */}
        <button
          onClick={onNewTab}
          className="flex-shrink-0 flex items-center justify-center w-10 h-full hover:bg-muted/50 transition-colors border-l border-border/50"
          title="新建标签页 (Ctrl+T)"
        >
          <Plus className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-popover border border-border rounded-md shadow-lg py-1 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => handleContextMenuAction('close')}
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors"
          >
            关闭标签页
          </button>
          <button
            onClick={() => handleContextMenuAction('closeOthers')}
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors"
          >
            关闭其他标签页
          </button>
          <button
            onClick={() => handleContextMenuAction('closeToRight')}
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors"
          >
            关闭右侧标签页
          </button>
        </div>
      )}
    </>
  );
}
