import { create } from 'zustand';
import type { Connection, ConnectionConfig, ConnectionSummary, ConnectionTestResult } from '../types';

// 检测是否在 Tauri 环境中
const isTauri = () => {
  return typeof window !== 'undefined' && !!(window as any).__TAURI__;
};

// 动态导入服务（避免在浏览器环境中加载 Tauri API）
const getService = async () => {
  if (isTauri()) {
    return import('../services/tauriService');
  } else {
    return import('../services/mockTauriService');
  }
};

interface ConnectionState {
  connections: ConnectionSummary[];
  activeConnection: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchConnections: () => Promise<void>;
  setActiveConnection: (id: string | null) => void;
  createConnection: (config: ConnectionConfig) => Promise<Connection>;
  updateConnection: (id: string, config: ConnectionConfig) => Promise<Connection>;
  deleteConnection: (id: string) => Promise<void>;
  testConnection: (config: ConnectionConfig) => Promise<ConnectionTestResult>;
  clearError: () => void;
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  connections: [],
  activeConnection: null,
  isLoading: false,
  error: null,

  fetchConnections: async () => {
    set({ isLoading: true, error: null });
    try {
      const tauriService = await getService();
      const connections = await tauriService.getConnections();
      set({ connections, isLoading: false });
    } catch (error) {
      console.error('[Kafkit] Failed to fetch connections:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch connections',
        isLoading: false 
      });
    }
  },

  setActiveConnection: (id) => {
    set({ activeConnection: id });
  },

  createConnection: async (config) => {
    set({ isLoading: true, error: null });
    try {
      const tauriService = await getService();
      const connection = await tauriService.createConnection(config);
      await get().fetchConnections();
      set({ isLoading: false });
      return connection;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create connection',
        isLoading: false 
      });
      throw error;
    }
  },

  updateConnection: async (id, config) => {
    set({ isLoading: true, error: null });
    try {
      const tauriService = await getService();
      const connection = await tauriService.updateConnection(id, config);
      await get().fetchConnections();
      set({ isLoading: false });
      return connection;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update connection',
        isLoading: false 
      });
      throw error;
    }
  },

  deleteConnection: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const tauriService = await getService();
      await tauriService.deleteConnection(id);
      if (get().activeConnection === id) {
        set({ activeConnection: null });
      }
      await get().fetchConnections();
      set({ isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete connection',
        isLoading: false 
      });
      throw error;
    }
  },

  testConnection: async (config) => {
    try {
      const tauriService = await getService();
      return await tauriService.testConnection(config);
    } catch (error) {
      throw error;
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
