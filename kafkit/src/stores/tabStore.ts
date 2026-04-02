/**
 * Tab Store - Manage multiple consumer/producer tabs
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TabType = 'topic-preview' | 'consumer' | 'producer';

export interface Tab {
  id: string;
  type: TabType;
  topic: string;
  connectionId: string;
  title: string;
  isActive: boolean;
  isDirty?: boolean;
  createdAt: number;
  config?: {
    consumerGroup?: string;
    producerMode?: 'single' | 'batch' | 'scheduled' | 'file';
  };
}

export interface TabState {
  tabs: Tab[];
  activeTabId: string | null;
  
  // Actions
  addTab: (type: TabType, topic: string, connectionId: string, config?: Tab['config']) => string;
  closeTab: (id: string) => void;
  activateTab: (id: string | null) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  updateTabConfig: (id: string, config: Partial<Tab['config']>) => void;
  updateTabTitle: (id: string, title: string) => void;
  setTabDirty: (id: string, isDirty: boolean) => void;
  closeAllTabs: () => void;
  closeOtherTabs: (id: string) => void;
  closeTabsToRight: (id: string) => void;
  getTabById: (id: string) => Tab | undefined;
  findExistingTab: (type: TabType, topic: string, connectionId: string) => Tab | undefined;
  convertTab: (id: string, newType: 'consumer' | 'producer') => void;
}

// Generate unique tab ID
const generateTabId = () => `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Generate default tab title
const generateTabTitle = (type: TabType, topic: string): string => {
  const typeLabel = {
    'topic-preview': '预览',
    'consumer': '消费',
    'producer': '生产',
  }[type];
  return `${topic} ${typeLabel}`;
};

export const useTabStore = create<TabState>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeTabId: null,

      addTab: (type, topic, connectionId, config) => {
        const { tabs } = get();
        
        // Check if tab already exists
        const existingTab = tabs.find(
          t => t.type === type && t.topic === topic && t.connectionId === connectionId
        );
        
        if (existingTab) {
          // Activate existing tab
          set({
            tabs: tabs.map(t => ({
              ...t,
              isActive: t.id === existingTab.id
            })),
            activeTabId: existingTab.id
          });
          return existingTab.id;
        }

        // Check tab limit (max 10)
        if (tabs.length >= 10) {
          alert('最多只能打开 10 个标签页，请先关闭部分标签');
          return '';
        }

        // Create new tab
        const newTab: Tab = {
          id: generateTabId(),
          type,
          topic,
          connectionId,
          title: generateTabTitle(type, topic),
          isActive: true,
          isDirty: false,
          createdAt: Date.now(),
          config
        };

        set({
          tabs: [...tabs.map(t => ({ ...t, isActive: false })), newTab],
          activeTabId: newTab.id
        });

        return newTab.id;
      },

      closeTab: (id) => {
        const { tabs, activeTabId } = get();
        const tabIndex = tabs.findIndex(t => t.id === id);
        
        if (tabIndex === -1) return;

        const newTabs = tabs.filter(t => t.id !== id);
        
        // If closing active tab, activate another one
        let newActiveId = activeTabId;
        if (activeTabId === id) {
          if (newTabs.length > 0) {
            // Prefer left tab, then right
            const newActiveIndex = Math.min(tabIndex, newTabs.length - 1);
            newActiveId = newTabs[newActiveIndex].id;
            newTabs[newActiveIndex].isActive = true;
          } else {
            newActiveId = null;
          }
        }

        set({ tabs: newTabs, activeTabId: newActiveId });
      },

      activateTab: (id) => {
        const { tabs } = get();
        set({
          tabs: tabs.map(t => ({
            ...t,
            isActive: t.id === id
          })),
          activeTabId: id
        });
      },

      reorderTabs: (fromIndex, toIndex) => {
        const { tabs } = get();
        const newTabs = [...tabs];
        const [removed] = newTabs.splice(fromIndex, 1);
        newTabs.splice(toIndex, 0, removed);
        set({ tabs: newTabs });
      },

      updateTabConfig: (id, config) => {
        const { tabs } = get();
        set({
          tabs: tabs.map(t =>
            t.id === id ? { ...t, config: { ...t.config, ...config } } : t
          )
        });
      },

      updateTabTitle: (id, title) => {
        const { tabs } = get();
        set({
          tabs: tabs.map(t => (t.id === id ? { ...t, title } : t))
        });
      },

      setTabDirty: (id, isDirty) => {
        const { tabs } = get();
        set({
          tabs: tabs.map(t => (t.id === id ? { ...t, isDirty } : t))
        });
      },

      closeAllTabs: () => {
        set({ tabs: [], activeTabId: null });
      },

      closeOtherTabs: (id) => {
        const { tabs } = get();
        const keepTab = tabs.find(t => t.id === id);
        if (!keepTab) return;
        
        set({
          tabs: [{ ...keepTab, isActive: true }],
          activeTabId: id
        });
      },

      closeTabsToRight: (id) => {
        const { tabs, activeTabId } = get();
        const tabIndex = tabs.findIndex(t => t.id === id);
        if (tabIndex === -1) return;

        const newTabs = tabs.slice(0, tabIndex + 1);
        
        // Ensure active tab is still valid
        const isActiveTabClosed = !newTabs.find(t => t.id === activeTabId);
        if (isActiveTabClosed && newTabs.length > 0) {
          newTabs[newTabs.length - 1].isActive = true;
          set({ tabs: newTabs, activeTabId: newTabs[newTabs.length - 1].id });
        } else {
          set({ tabs: newTabs });
        }
      },

      getTabById: (id) => {
        return get().tabs.find(t => t.id === id);
      },

      findExistingTab: (type, topic, connectionId) => {
        return get().tabs.find(
          t => t.type === type && t.topic === topic && t.connectionId === connectionId
        );
      },

      convertTab: (id, newType) => {
        const { tabs } = get();
        set({
          tabs: tabs.map(t => {
            if (t.id !== id) return t;
            return {
              ...t,
              type: newType,
              title: generateTabTitle(newType, t.topic),
              config: {}
            };
          })
        });
      }
    }),
    {
      name: 'kafkit-tabs',
      partialize: (state) => ({ 
        tabs: state.tabs.map(t => ({
          ...t,
          isActive: false // Don't persist active state
        })),
        activeTabId: null
      })
    }
  )
);
