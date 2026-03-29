import { create } from 'zustand';
import type { Connection, ConnectionConfig, ConnectionSummary, ConnectionTestResult } from '../types';
import { MonitorService } from '../services/monitor';

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

interface ConnectionHealth {
  status: 'healthy' | 'unhealthy' | 'checking';
  lastCheck: number;
  error?: string;
}

interface ConnectionState {
  connections: ConnectionSummary[];
  activeConnection: string | null;
  isLoading: boolean;
  error: string | null;
  connectionHealth: Map<string, ConnectionHealth>;
  healthCheckTimer: ReturnType<typeof setInterval> | null;
  
  // Actions
  fetchConnections: () => Promise<void>;
  setActiveConnection: (id: string | null) => void;
  createConnection: (config: ConnectionConfig) => Promise<Connection>;
  updateConnection: (id: string, config: ConnectionConfig) => Promise<Connection>;
  deleteConnection: (id: string) => Promise<void>;
  testConnection: (config: ConnectionConfig) => Promise<ConnectionTestResult>;
  clearError: () => void;
  checkConnectionHealth: (connectionId: string) => Promise<boolean>;
  startHealthCheck: () => void;
  stopHealthCheck: () => void;
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  connections: [],
  activeConnection: null,
  isLoading: false,
  error: null,
  connectionHealth: new Map(),
  healthCheckTimer: null,

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
    console.log(`[ConnectionStore] Setting active connection: ${id}`);
    set({ activeConnection: id });
    
    // 启动或停止健康检查
    if (id) {
      get().startHealthCheck();
      // 延迟一点执行第一次检查，确保状态已更新
      setTimeout(() => {
        console.log(`[ConnectionStore] Initial health check for ${id}`);
        get().checkConnectionHealth(id);
      }, 100);
    } else {
      get().stopHealthCheck();
    }
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

  checkConnectionHealth: async (connectionId: string) => {
    const state = get();
    const connection = state.connections.find(c => c.id === connectionId);
    if (!connection) {
      console.log(`[HealthCheck] Connection ${connectionId} not found`);
      return false;
    }

    console.log(`[HealthCheck] Checking connection: ${connection.name} (${connectionId})`);

    try {
      // 更新为检查中状态
      const newHealth = new Map(state.connectionHealth);
      newHealth.set(connectionId, { status: 'checking', lastCheck: Date.now() });
      set({ connectionHealth: newHealth });

      // 使用 testConnection 检查连接健康
      const result = await get().testConnection({
        name: connection.name,
        bootstrapServers: connection.bootstrapServers.join(','),
        auth: { type: 'none' },
        security: { protocol: 'PLAINTEXT' }
      });

      console.log(`[HealthCheck] Result for ${connection.name}: success=${result.success}, message=${result.message}`);

      const isHealthy = result.success;
      const monitor = MonitorService.getInstance();
      
      if (!isHealthy) {
        console.log(`[HealthCheck] Reporting UNHEALTHY for ${connection.name}`);
        monitor.reportConnectionStatus(connectionId, false, result.message);
      } else {
        console.log(`[HealthCheck] Reporting HEALTHY for ${connection.name}`);
        monitor.reportConnectionStatus(connectionId, true);
      }

      // 更新健康状态
      const updatedHealth = new Map(get().connectionHealth);
      updatedHealth.set(connectionId, {
        status: isHealthy ? 'healthy' : 'unhealthy',
        lastCheck: Date.now(),
        error: isHealthy ? undefined : result.message
      });
      set({ connectionHealth: updatedHealth });

      return isHealthy;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection check failed';
      console.log(`[HealthCheck] Exception for ${connection.name}: ${errorMessage}`);
      
      // 报告连接断开
      const monitor = MonitorService.getInstance();
      monitor.reportConnectionStatus(connectionId, false, errorMessage);

      // 更新健康状态
      const updatedHealth = new Map(get().connectionHealth);
      updatedHealth.set(connectionId, {
        status: 'unhealthy',
        lastCheck: Date.now(),
        error: errorMessage
      });
      set({ connectionHealth: updatedHealth });

      return false;
    }
  },

  startHealthCheck: () => {
    const state = get();
    if (state.healthCheckTimer) {
      console.log('[ConnectionStore] Health check already running');
      return;
    }

    console.log('[ConnectionStore] Starting health check (interval: 10s)');
    
    // 每 10 秒检查一次活跃连接的健康状态（方便测试）
    const timer = setInterval(() => {
      const { activeConnection } = get();
      if (activeConnection) {
        console.log(`[ConnectionStore] Periodic health check for ${activeConnection}`);
        get().checkConnectionHealth(activeConnection);
      }
    }, 10000); // 10秒间隔，方便测试

    set({ healthCheckTimer: timer });
  },

  stopHealthCheck: () => {
    const state = get();
    if (state.healthCheckTimer) {
      clearInterval(state.healthCheckTimer);
      set({ healthCheckTimer: null });
      console.log('[ConnectionStore] Health check stopped');
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
