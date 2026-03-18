// Utility function tests
import { describe, it, expect } from 'vitest';

// Mock utility functions that might be used in the app
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatOffset(offset: number): string {
  return offset.toLocaleString();
}

function isValidTopicName(name: string): boolean {
  // Kafka topic name validation
  if (!name || name.length === 0 || name.length > 249) return false;
  if (name === '.' || name === '..') return false;
  // Valid characters: alphanumeric, ., _, -
  return /^[a-zA-Z0-9._-]+$/.test(name);
}

function parseBootstrapServers(servers: string): string[] {
  return servers.split(',').map(s => s.trim()).filter(s => s.length > 0);
}

describe('Utility Functions', () => {
  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 B');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1024 * 1024)).toBe('1 MB');
      expect(formatBytes(1536)).toBe('1.5 KB');
    });
  });

  describe('formatOffset', () => {
    it('should format offset with locale', () => {
      expect(formatOffset(1000)).toBe('1,000');
      expect(formatOffset(1000000)).toBe('1,000,000');
    });
  });

  describe('isValidTopicName', () => {
    it('should validate correct topic names', () => {
      expect(isValidTopicName('test-topic')).toBe(true);
      expect(isValidTopicName('test_topic')).toBe(true);
      expect(isValidTopicName('test.topic')).toBe(true);
      expect(isValidTopicName('TestTopic123')).toBe(true);
    });

    it('should reject invalid topic names', () => {
      expect(isValidTopicName('')).toBe(false);
      expect(isValidTopicName('.')).toBe(false);
      expect(isValidTopicName('..')).toBe(false);
      expect(isValidTopicName('test topic')).toBe(false);
      expect(isValidTopicName('test@topic')).toBe(false);
    });
  });

  describe('parseBootstrapServers', () => {
    it('should parse single server', () => {
      expect(parseBootstrapServers('localhost:9092')).toEqual(['localhost:9092']);
    });

    it('should parse multiple servers', () => {
      expect(parseBootstrapServers('host1:9092, host2:9092')).toEqual(['host1:9092', 'host2:9092']);
    });

    it('should handle extra spaces', () => {
      expect(parseBootstrapServers('  host1:9092  ,  host2:9092  ')).toEqual(['host1:9092', 'host2:9092']);
    });
  });
});
