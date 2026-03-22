import { describe, it, expect, beforeEach } from 'vitest';
import * as mockService from '../services/mockTauriService';
import type { ConnectionConfig } from '../../types';

describe('Mock Tauri Service', () => {
  describe('Connection Management', () => {
    it('should return mock connections', async () => {
      const connections = await mockService.getConnections();
      expect(connections.length).toBeGreaterThan(0);
      expect(connections[0].name).toBe('EC2 Kafka (Mock)');
    });

    it('should test connection for ec2-dmz-kafka-01', async () => {
      const config: ConnectionConfig = {
        name: 'Test',
        bootstrapServers: 'ec2-dmz-kafka-01:9092',
        auth: { type: 'none' },
        security: { protocol: 'PLAINTEXT' },
      };
      
      const result = await mockService.testConnection(config);
      expect(result.success).toBe(true);
      expect(result.message).toContain('连接成功');
    });

    it('should fail for unknown servers', async () => {
      const config: ConnectionConfig = {
        name: 'Test',
        bootstrapServers: 'unknown:9092',
        auth: { type: 'none' },
        security: { protocol: 'PLAINTEXT' },
      };
      
      const result = await mockService.testConnection(config);
      expect(result.success).toBe(false);
    });
  });

  describe('Topic Management', () => {
    it('should return mock topics', async () => {
      const topics = await mockService.listTopics('mock-1');
      expect(topics.length).toBeGreaterThan(0);
      expect(topics.some(t => t.name === 'user-events')).toBe(true);
    });

    it('should get topic detail', async () => {
      const detail = await mockService.getTopicDetail('mock-1', 'user-events');
      expect(detail.name).toBe('user-events');
      expect(detail.partitions.length).toBe(3);
      expect(detail.configs.length).toBeGreaterThan(0);
    });
  });

  describe('Message Operations', () => {
    it('should fetch mock messages', async () => {
      const result = await mockService.fetchMessages('mock-1', 'user-events', 0, 0, 10);
      expect(result.messages.length).toBe(10);
      expect(result.total).toBe(10);
      expect(result.messages[0].value).toContain('Mock message');
    });

    it('should produce mock message', async () => {
      const result = await mockService.produceMessage('mock-1', 'user-events', {
        value: 'test message',
      });
      expect(result.partition).toBeGreaterThanOrEqual(0);
      expect(result.offset).toBeGreaterThan(0);
    });
  });

  describe('Consumer Groups', () => {
    it('should return mock consumer groups', async () => {
      const groups = await mockService.listConsumerGroups('mock-1');
      expect(groups.length).toBeGreaterThan(0);
      expect(groups.some(g => g.groupId === 'user-service')).toBe(true);
    });

    it('should return mock lag data', async () => {
      const lag = await mockService.getConsumerLag('mock-1', 'user-service');
      expect(lag.length).toBeGreaterThan(0);
      expect(lag[0]).toHaveProperty('topic');
      expect(lag[0]).toHaveProperty('lag');
    });
  });
});
