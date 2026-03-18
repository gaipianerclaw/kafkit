import { create } from 'zustand';
import type { Connection, ConnectionConfig, ConnectionSummary, ConnectionTestResult } from '../types';
import * as tauriService from '../services/tauriService';

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
      const connections = await tauriService.getConnections();
      set({ connections, isLoading: false });
    } catch (error) {
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
      return await tauriService.testConnection(config);
    } catch (error) {
      throw error;
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
