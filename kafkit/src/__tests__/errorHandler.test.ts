import { describe, it, expect } from 'vitest';
import {
  parseKafkaError,
  getErrorSeverity,
  formatErrorForDisplay,
  shouldShowMemoryWarning,
  shouldForceMemoryCleanup,
  MEMORY_WARNING_THRESHOLD,
  MEMORY_LIMIT_THRESHOLD,
} from '../utils/errorHandler';

describe('Error Handler', () => {
  describe('parseKafkaError', () => {
    it('should parse NetworkException', () => {
      const error = new Error('NetworkException: Connection refused');
      const result = parseKafkaError(error);
      expect(result.code).toBe('NetworkException');
      expect(result.retryable).toBe(true);
    });

    it('should parse UnknownTopicOrPartition', () => {
      const error = new Error('UnknownTopicOrPartition: Topic not found');
      const result = parseKafkaError(error);
      expect(result.code).toBe('UnknownTopicOrPartition');
      expect(result.retryable).toBe(false);
    });

    it('should parse TimeoutException', () => {
      const error = new Error('TimeoutException: Request timed out');
      const result = parseKafkaError(error);
      expect(result.code).toBe('TimeoutException');
      expect(result.retryable).toBe(true);
    });

    it('should handle connection refused error', () => {
      const error = new Error('ECONNREFUSED: Connection refused');
      const result = parseKafkaError(error);
      expect(result.code).toBe('ConnectionRefused');
    });

    it('should handle SSL error', () => {
      const error = new Error('SSLHandshakeFailed: certificate verify failed');
      const result = parseKafkaError(error);
      expect(result.code).toBe('SSLHandshakeFailed');
    });

    it('should handle unknown error', () => {
      const error = new Error('Some random error');
      const result = parseKafkaError(error);
      expect(result.code).toBe('Unknown');
    });

    it('should handle non-Error input', () => {
      const result = parseKafkaError('string error');
      expect(result.code).toBe('Unknown');
    });
  });

  describe('getErrorSeverity', () => {
    it('should return info for UnknownTopicOrPartition', () => {
      expect(getErrorSeverity('UnknownTopicOrPartition')).toBe('info');
    });

    it('should return warning for TimeoutException', () => {
      expect(getErrorSeverity('TimeoutException')).toBe('warning');
    });

    it('should return warning for NotLeaderForPartition', () => {
      expect(getErrorSeverity('NotLeaderForPartition')).toBe('warning');
    });

    it('should return error for other errors', () => {
      expect(getErrorSeverity('NetworkException')).toBe('error');
      expect(getErrorSeverity('AuthorizationFailed')).toBe('error');
    });
  });

  describe('formatErrorForDisplay', () => {
    it('should format error with translation', () => {
      const mockT = (key: string) => {
        const translations: Record<string, string> = {
          'common.error': 'Error',
          'errors.kafka.NetworkException': 'Network connection failed',
        };
        return translations[key] || key;
      };

      const error = new Error('NetworkException: test');
      const result = formatErrorForDisplay(error, mockT);

      expect(result.title).toBe('Error');
      expect(result.message).toBe('Network connection failed');
      expect(result.retryable).toBe(true);
    });
  });

  describe('Memory thresholds', () => {
    it('should show warning at threshold', () => {
      expect(shouldShowMemoryWarning(MEMORY_WARNING_THRESHOLD)).toBe(true);
      expect(shouldShowMemoryWarning(MEMORY_WARNING_THRESHOLD - 1)).toBe(false);
    });

    it('should force cleanup at threshold', () => {
      expect(shouldForceMemoryCleanup(MEMORY_LIMIT_THRESHOLD)).toBe(true);
      expect(shouldForceMemoryCleanup(MEMORY_LIMIT_THRESHOLD - 1)).toBe(false);
    });
  });
});
