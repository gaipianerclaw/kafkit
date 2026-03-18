import { describe, it, expect } from 'vitest';

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format offset number with locale
 */
export function formatOffset(offset: number): string {
  return offset.toLocaleString();
}

/**
 * Validate Kafka topic name
 */
export function isValidTopicName(name: string): boolean {
  if (!name || name.length === 0 || name.length > 249) return false;
  if (name === '.' || name === '..') return false;
  // Valid characters: alphanumeric, ., _, -
  return /^[a-zA-Z0-9._-]+$/.test(name);
}

/**
 * Parse bootstrap servers string to array
 */
export function parseBootstrapServers(servers: string): string[] {
  return servers.split(',').map(s => s.trim()).filter(s => s.length > 0);
}

/**
 * Format timestamp to locale string
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

describe('Formatter Utilities', () => {
  describe('formatBytes', () => {
    it('formats 0 bytes', () => {
      expect(formatBytes(0)).toBe('0 B');
    });

    it('formats bytes to KB', () => {
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1536)).toBe('1.5 KB');
    });

    it('formats bytes to MB', () => {
      expect(formatBytes(1024 * 1024)).toBe('1 MB');
    });

    it('formats bytes to GB', () => {
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
    });
  });

  describe('formatOffset', () => {
    it('formats small numbers', () => {
      expect(formatOffset(100)).toBe('100');
    });

    it('formats large numbers with locale', () => {
      expect(formatOffset(1000000)).toContain('000');
    });
  });

  describe('isValidTopicName', () => {
    it('accepts valid names', () => {
      expect(isValidTopicName('test-topic')).toBe(true);
      expect(isValidTopicName('test_topic')).toBe(true);
      expect(isValidTopicName('test.topic')).toBe(true);
      expect(isValidTopicName('TestTopic123')).toBe(true);
    });

    it('rejects invalid names', () => {
      expect(isValidTopicName('')).toBe(false);
      expect(isValidTopicName('.')).toBe(false);
      expect(isValidTopicName('..')).toBe(false);
      expect(isValidTopicName('test topic')).toBe(false);
      expect(isValidTopicName('test@topic')).toBe(false);
    });

    it('rejects names that are too long', () => {
      expect(isValidTopicName('a'.repeat(250))).toBe(false);
    });
  });

  describe('parseBootstrapServers', () => {
    it('parses single server', () => {
      expect(parseBootstrapServers('localhost:9092')).toEqual(['localhost:9092']);
    });

    it('parses multiple servers', () => {
      const result = parseBootstrapServers('host1:9092,host2:9092');
      expect(result).toEqual(['host1:9092', 'host2:9092']);
    });

    it('handles whitespace', () => {
      const result = parseBootstrapServers(' host1:9092 , host2:9092 ');
      expect(result).toEqual(['host1:9092', 'host2:9092']);
    });

    it('filters empty strings', () => {
      expect(parseBootstrapServers('host1:9092,,host2:9092')).toEqual(['host1:9092', 'host2:9092']);
    });
  });

  describe('formatTimestamp', () => {
    it('formats valid timestamp', () => {
      const timestamp = Date.now();
      const result = formatTimestamp(timestamp);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('truncate', () => {
    it('returns original string if short enough', () => {
      expect(truncate('hello', 10)).toBe('hello');
    });

    it('truncates long string', () => {
      expect(truncate('hello world', 8)).toBe('hello...');
    });

    it('handles exact length', () => {
      expect(truncate('hello', 5)).toBe('hello');
    });
  });
});
