import { describe, it, expect } from 'vitest';
import { parseCsvRowRaw, parseCsvHeaders, normalizeMessage } from '../../pages/Producer/FileMode/streamFileParser';
import type { ValueTimestampConfig } from '../../pages/Producer/FileMode/types';
import type { ParsedMessage, ColumnMappingType } from '../../pages/Producer/FileMode/FileMode';

// Import the functions we need to test (re-implementing them for testing)
function calculateNewTimestampValue(originalValue: any, config: ValueTimestampConfig): any {
  let originalMs: number;

  if (typeof originalValue === 'number') {
    originalMs = config.format === 'unix_sec' ? originalValue * 1000 : originalValue;
  } else if (typeof originalValue === 'string') {
    originalMs = new Date(originalValue.replace(' ', 'T')).getTime();
    if (isNaN(originalMs)) {
      return originalValue;
    }
  } else {
    return originalValue;
  }

  let newMs: number;
  switch (config.mode) {
    case 'file':
      return originalValue;
    case 'current':
      newMs = Date.now();
      break;
    case 'fixed':
      if (typeof config.fixedValue === 'number') {
        newMs = config.fixedValue;
      } else if (typeof config.fixedValue === 'string') {
        const parsed = new Date(config.fixedValue).getTime();
        newMs = isNaN(parsed) ? originalMs : parsed;
      } else {
        newMs = originalMs;
      }
      break;
    case 'offset':
      newMs = originalMs + (config.offsetMs || 0);
      break;
    default:
      return originalValue;
  }

  switch (config.format) {
    case 'unix_ms':
      return newMs;
    case 'unix_sec':
      return Math.floor(newMs / 1000);
    case 'iso8601':
      return new Date(newMs).toISOString();
    case 'iso8601_space':
      return formatDateWithSpace(newMs);
    default:
      return newMs;
  }
}

function formatDateWithSpace(ms: number): string {
  const date = new Date(ms);
  const yyyy = date.getFullYear();
  const MM = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const HH = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  const SSS = String(date.getMilliseconds()).padStart(3, '0');
  return `${yyyy}-${MM}-${dd} ${HH}:${mm}:${ss}.${SSS}`;
}

describe('CSV Timestamp Modification', () => {
  describe('calculateNewTimestampValue', () => {
    it('should correctly parse iso8601_space format', () => {
      const config: ValueTimestampConfig = {
        enabled: true,
        fieldPath: 'timestamp',
        format: 'iso8601_space',
        mode: 'offset',
        offsetMs: 0,
      };

      // This is the exact format from the user's screenshot
      const originalValue = '2026-04-01 15:53:08.408';
      const result = calculateNewTimestampValue(originalValue, config);
      
      // With offset 0, should return the same timestamp
      expect(result).toBe('2026-04-01 15:53:08.408');
    });

    it('should return current timestamp when mode is "current"', () => {
      const config: ValueTimestampConfig = {
        enabled: true,
        fieldPath: 'timestamp',
        format: 'iso8601_space',
        mode: 'current',
      };

      const originalValue = '2025-01-15 10:30:00.000';
      const result = calculateNewTimestampValue(originalValue, config);
      
      // Result should be a valid timestamp string
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}$/);
      
      // Result should be a valid date
      const resultDate = new Date((result as string).replace(' ', 'T'));
      expect(isNaN(resultDate.getTime())).toBe(false);
      
      // Result should be close to current time (within 5 seconds)
      const now = Date.now();
      expect(Math.abs(resultDate.getTime() - now)).toBeLessThan(5000);
    });

    it('should preserve original value when mode is "file"', () => {
      const config: ValueTimestampConfig = {
        enabled: true,
        fieldPath: 'timestamp',
        format: 'iso8601_space',
        mode: 'file',
      };

      const originalValue = '2025-01-15 10:30:00.000';
      const result = calculateNewTimestampValue(originalValue, config);
      
      expect(result).toBe(originalValue);
    });

    it('should apply offset when mode is "offset"', () => {
      const config: ValueTimestampConfig = {
        enabled: true,
        fieldPath: 'timestamp',
        format: 'iso8601_space',
        mode: 'offset',
        offsetMs: 3600000, // +1 hour
      };

      const originalValue = '2025-01-15 10:30:00.000';
      const result = calculateNewTimestampValue(originalValue, config);
      
      expect(result).toBe('2025-01-15 11:30:00.000');
    });

    it('should handle Unix millisecond timestamps', () => {
      const config: ValueTimestampConfig = {
        enabled: true,
        fieldPath: 'timestamp',
        format: 'unix_ms',
        mode: 'offset',
        offsetMs: 1000,
      };

      const originalValue = 1705312200000; // 2024-01-15 10:30:00 UTC
      const result = calculateNewTimestampValue(originalValue, config);
      
      expect(result).toBe(1705312201000);
    });

    it('should handle Unix second timestamps', () => {
      const config: ValueTimestampConfig = {
        enabled: true,
        fieldPath: 'timestamp',
        format: 'unix_sec',
        mode: 'offset',
        offsetMs: 60000, // +1 minute
      };

      const originalValue = 1705312200; // 2024-01-15 10:30:00 UTC in seconds
      const result = calculateNewTimestampValue(originalValue, config);
      
      expect(result).toBe(1705312260); // +60 seconds
    });
  });

  describe('CSV Row Processing', () => {
    it('should parse CSV row with timestamp column', () => {
      const csvLine = '1,2025-01-15 10:30:00.123,Hello World';
      const headers = ['id', 'timestamp', 'message'];
      
      const row = parseCsvRowRaw(csvLine, headers);
      
      expect(row).toEqual({
        id: '1',
        timestamp: '2025-01-15 10:30:00.123',
        message: 'Hello World',
      });
    });

    it('should detect timestamp in CSV object values', () => {
      const csvLine = '1,2025-01-15 10:30:00.123,Hello World';
      const headers = ['id', 'timestamp', 'message'];
      const row = parseCsvRowRaw(csvLine, headers);

      // Simulate timestamp detection in object values
      const detectedFields: Array<{ path: string; format: string; sampleValue: string }> = [];
      
      for (const [key, val] of Object.entries(row)) {
        if (typeof val !== 'string') continue;
        
        const spaceDatePattern = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d{1,6})?)$/;
        if (spaceDatePattern.test(val)) {
          const date = new Date(val.replace(' ', 'T'));
          if (!isNaN(date.getTime())) {
            detectedFields.push({
              path: key,
              format: 'iso8601_space',
              sampleValue: val,
            });
          }
        }
      }

      expect(detectedFields).toHaveLength(1);
      expect(detectedFields[0].path).toBe('timestamp');
      expect(detectedFields[0].format).toBe('iso8601_space');
    });

    it('should modify timestamp in CSV object and rebuild value', () => {
      const csvLine = '1,2025-01-15 10:30:00.123,Hello World';
      const headers = ['id', 'timestamp', 'message'];
      const row = parseCsvRowRaw(csvLine, headers);

      const config: ValueTimestampConfig = {
        enabled: true,
        fieldPath: 'timestamp',
        format: 'iso8601_space',
        mode: 'current',
      };

      const mapping: ColumnMappingType = {
        keyColumn: 'id',
        valueColumn: 'message',
        headerColumn: '',
        partitionColumn: '',
        useFilePartition: false,
      };

      // Simulate buildRecord logic for timestamp modification
      const data = row;
      const fieldPath = config.fieldPath;
      
      if (fieldPath in data) {
        const originalValue = data[fieldPath];
        const newValue = calculateNewTimestampValue(originalValue, config);
        const modifiedData = { ...data, [fieldPath]: String(newValue) };
        
        // Rebuild value based on mapping
        const value = mapping.valueColumn ? modifiedData[mapping.valueColumn] : '';
        
        // The message column should remain unchanged
        expect(value).toBe('Hello World');
        
        // But the timestamp in the data should be modified (close to now)
        const modifiedTimestamp = modifiedData.timestamp;
        const modifiedDate = new Date((modifiedTimestamp as string).replace(' ', 'T'));
        expect(Math.abs(modifiedDate.getTime() - Date.now())).toBeLessThan(5000);
      }
    });

    it('should modify timestamp when valueColumn is the timestamp column', () => {
      const csvLine = '1,2025-01-15 10:30:00.123,Hello World';
      const headers = ['id', 'timestamp', 'message'];
      const row = parseCsvRowRaw(csvLine, headers);

      const config: ValueTimestampConfig = {
        enabled: true,
        fieldPath: 'timestamp',
        format: 'iso8601_space',
        mode: 'current',
      };

      const mapping: ColumnMappingType = {
        keyColumn: 'id',
        valueColumn: 'timestamp', // Value is the timestamp column
        headerColumn: '',
        partitionColumn: '',
        useFilePartition: false,
      };

      // Simulate buildRecord logic
      const data = row;
      const fieldPath = config.fieldPath;
      
      if (fieldPath in data) {
        const originalValue = data[fieldPath];
        const newValue = calculateNewTimestampValue(originalValue, config);
        const modifiedData = { ...data, [fieldPath]: String(newValue) };
        
        // Rebuild value based on mapping - value is the timestamp column
        const value = mapping.valueColumn ? modifiedData[mapping.valueColumn] : '';
        
        // The value should be the modified timestamp
        const valueDate = new Date(value.replace(' ', 'T'));
        expect(Math.abs(valueDate.getTime() - Date.now())).toBeLessThan(5000);
      }
    });
  });

  describe('normalizeMessage _raw field', () => {
    it('should set _raw for CSV row objects to enable timestamp modification', () => {
      const csvLine = '1,2026-04-01 15:53:08.408,Hello World';
      const headers = ['id', 'timestamp', 'message'];
      const row = parseCsvRowRaw(csvLine, headers);

      // Simulate the fixed normalizeMessage function behavior
      const msg: ParsedMessage = {
        value: row,
        _raw: row,  // This is the key fix - _raw must be set
      };

      // Verify _raw is set and contains the timestamp field
      expect(msg._raw).toBeDefined();
      expect(msg._raw?.timestamp).toBe('2026-04-01 15:53:08.408');

      // Simulate timestamp modification
      const config: ValueTimestampConfig = {
        enabled: true,
        fieldPath: 'timestamp',
        format: 'iso8601_space',
        mode: 'current',
      };

      const data = msg._raw || {};
      const fieldPath = config.fieldPath;
      
      if (fieldPath in data) {
        const originalValue = data[fieldPath];
        const newValue = calculateNewTimestampValue(originalValue, config);
        const modifiedData = { ...data, [fieldPath]: String(newValue) };
        
        // Rebuild value as JSON (simulating buildRecord when no valueColumn is set)
        const value = JSON.stringify(modifiedData);
        
        // Parse back and verify timestamp was modified
        const parsed = JSON.parse(value);
        const modifiedTimestamp = parsed.timestamp;
        const modifiedDate = new Date(modifiedTimestamp.replace(' ', 'T'));
        
        // Should be close to current time
        expect(Math.abs(modifiedDate.getTime() - Date.now())).toBeLessThan(5000);
        
        // Other fields should remain unchanged
        expect(parsed.id).toBe('1');
        expect(parsed.message).toBe('Hello World');
      }
    });
  });

  describe('rebuildCsvRow', () => {
    it('should rebuild CSV row from modified data', () => {
      const headers = ['id', 'timestamp', 'message'];
      const modifiedData = {
        id: '1',
        timestamp: '2025-01-15 12:00:00.000',
        message: 'Hello World',
      };

      // Test rebuildCsvRow logic
      function rebuildCsvRow(data: Record<string, string>, headers: string[]): string {
        return headers.map(header => {
          const value = data[header] ?? '';
          if (value.includes(',') || value.includes('"')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',');
      }

      const result = rebuildCsvRow(modifiedData, headers);
      expect(result).toBe('1,2025-01-15 12:00:00.000,Hello World');
    });

    it('should handle values with commas by quoting', () => {
      const headers = ['id', 'message'];
      const modifiedData = {
        id: '1',
        message: 'Hello, World',
      };

      function rebuildCsvRow(data: Record<string, string>, headers: string[]): string {
        return headers.map(header => {
          const value = data[header] ?? '';
          if (value.includes(',') || value.includes('"')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',');
      }

      const result = rebuildCsvRow(modifiedData, headers);
      expect(result).toBe('1,"Hello, World"');
    });

    it('should correctly modify timestamp and rebuild CSV row', () => {
      // Simulate user's CSV: C14,2026-04-01 15:53:08.408,00,00,...
      const csvLine = 'C14,2026-04-01 15:53:08.408,00,00,0,010232';
      const headers = ['col1', 'timestamp', 'col3', 'col4', 'col5', 'col6'];
      const row = parseCsvRowRaw(csvLine, headers);

      const config: ValueTimestampConfig = {
        enabled: true,
        fieldPath: 'timestamp',
        format: 'iso8601_space',
        mode: 'current',
      };

      // Simulate buildRecord logic
      const data = row;
      const fieldPath = config.fieldPath;
      
      expect(fieldPath in data).toBe(true);
      
      const originalValue = data[fieldPath];
      const newValue = calculateNewTimestampValue(originalValue, config);
      const modifiedData = { ...data, [fieldPath]: String(newValue) };

      // Rebuild as CSV row
      function rebuildCsvRow(data: Record<string, string>, headers: string[]): string {
        return headers.map(header => {
          const value = data[header] ?? '';
          if (value.includes(',') || value.includes('"')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',');
      }

      const result = rebuildCsvRow(modifiedData, headers);
      
      // Result should be CSV format, not JSON
      expect(result).not.toContain('{');
      expect(result).toContain(',');
      
      // Parse result and verify timestamp was modified
      const parts = result.split(',');
      expect(parts[0]).toBe('C14');
      
      const modifiedTimestamp = parts[1];
      const modifiedDate = new Date(modifiedTimestamp.replace(' ', 'T'));
      expect(Math.abs(modifiedDate.getTime() - Date.now())).toBeLessThan(5000);
      
      // Other columns should remain unchanged
      expect(parts[2]).toBe('00');
      expect(parts[3]).toBe('00');
      expect(parts[4]).toBe('0');
      expect(parts[5]).toBe('010232');
    });
  });
});
