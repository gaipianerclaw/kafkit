import { describe, it, expect, beforeEach } from 'vitest';
import { useConnectionStore } from '../../stores/connectionStore';
import type { ConnectionConfig } from '../../types';

// Reset store before each test
beforeEach(() => {
  const store = useConnectionStore.getState();
  store.setActiveConnection(null);
  store.clearError();
});

describe('connectionStore', () => {
  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = useConnectionStore.getState();
      expect(state.connections).toEqual([]);
      expect(state.activeConnection).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('setActiveConnection', () => {
    it('should set active connection', () => {
      const store = useConnectionStore.getState();
      store.setActiveConnection('test-id');
      expect(useConnectionStore.getState().activeConnection).toBe('test-id');
    });

    it('should clear active connection', () => {
      const store = useConnectionStore.getState();
      store.setActiveConnection('test-id');
      store.setActiveConnection(null);
      expect(useConnectionStore.getState().activeConnection).toBeNull();
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      // Note: In real scenario, error would be set by failed async action
      // This tests the clearError action exists
      const store = useConnectionStore.getState();
      store.clearError();
      expect(useConnectionStore.getState().error).toBeNull();
    });
  });
});

// Integration test example for async actions
describe('connectionStore async actions', () => {
  const mockConfig: ConnectionConfig = {
    name: 'Test Connection',
    bootstrapServers: 'localhost:9092',
    auth: { type: 'none' },
    security: { protocol: 'PLAINTEXT' }
  };

  // These tests would require mocking the Tauri API
  it('should have fetchConnections action', () => {
    const store = useConnectionStore.getState();
    expect(typeof store.fetchConnections).toBe('function');
  });

  it('should have createConnection action', () => {
    const store = useConnectionStore.getState();
    expect(typeof store.createConnection).toBe('function');
  });

  it('should have testConnection action', () => {
    const store = useConnectionStore.getState();
    expect(typeof store.testConnection).toBe('function');
  });
});
