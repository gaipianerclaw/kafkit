import { describe, it, expect } from 'vitest';
import {
  getFileInfo,
  parseCsvHeaders,
  parseCsvRow,
  readFilePreview,
} from '../../pages/Producer/FileMode/streamFileParser';

describe('streamFileParser', () => {
  describe('getFileInfo', () => {
    it('should format small file size correctly', () => {
      const file = new File(['test'], 'test.jsonl', { type: 'application/json' });
      const info = getFileInfo(file);
      
      expect(info.size).toBe(4);
      expect(info.sizeFormatted).toBe('4 Bytes');
      expect(info.isLarge).toBe(false);
    });

    it('should detect large files (>100MB)', () => {
      // Create a mock file with size > 100MB
      const largeContent = new Array(1024 * 1024).fill('x').join(''); // 1MB content
      const file = new File([largeContent], 'large.jsonl', { type: 'application/json' });
      Object.defineProperty(file, 'size', { value: 101 * 1024 * 1024 });
      
      const info = getFileInfo(file);
      expect(info.isLarge).toBe(true);
      expect(info.sizeFormatted).toBe('101 MB');
    });

    it('should format KB correctly', () => {
      const content = new Array(1024).fill('x').join('');
      const file = new File([content], 'test.jsonl', { type: 'application/json' });
      
      const info = getFileInfo(file);
      expect(info.sizeFormatted).toBe('1 KB');
    });
  });

  describe('parseCsvHeaders', () => {
    it('should parse comma-separated headers', () => {
      const line = 'key,value,timestamp,partition';
      const headers = parseCsvHeaders(line);
      
      expect(headers).toEqual(['key', 'value', 'timestamp', 'partition']);
    });

    it('should parse tab-separated headers', () => {
      const line = 'key\tvalue\ttimestamp';
      const headers = parseCsvHeaders(line);
      
      expect(headers).toEqual(['key', 'value', 'timestamp']);
    });

    it('should trim quotes from headers', () => {
      const line = '"key","value","timestamp"';
      const headers = parseCsvHeaders(line);
      
      expect(headers).toEqual(['key', 'value', 'timestamp']);
    });
  });

  describe('readFilePreview', () => {
    it('should preview JSON Array format', async () => {
      const jsonArray = JSON.stringify([
        { key: 'k1', value: 'v1', partition: 0 },
        { key: 'k2', value: 'v2', partition: 1 },
        { key: 'k3', value: 'v3', partition: 0 },
      ]);
      const file = new File([jsonArray], 'test.json', { type: 'application/json' });
      
      const preview = await readFilePreview(file, 'json');
      
      expect(preview.messages).toHaveLength(3);
      expect(preview.totalLines).toBe(3);
      expect(preview.errors).toHaveLength(0);
      expect(preview.messages[0].key).toBe('k1');
      expect(preview.messages[0].value).toBe('v1');
    });

    it('should handle truncated JSON Array with incomplete last object', async () => {
      // Simulate a truncated JSON array where the last object is cut off mid-string
      const fullArray = [
        { key: 'k1', value: 'complete value 1' },
        { key: 'k2', value: 'complete value 2' },
        { key: 'k3', value: 'this will be truncated' },
      ];
      const jsonText = JSON.stringify(fullArray);
      // Truncate at a position that cuts a string value
      const truncatedText = jsonText.slice(0, jsonText.indexOf('this will be') + 5);
      
      const file = new File([truncatedText], 'truncated.json', { type: 'application/json' });
      
      const preview = await readFilePreview(file, 'json');
      
      // Should still parse the first two complete objects
      expect(preview.messages.length).toBeGreaterThanOrEqual(2);
      expect(preview.messages[0].key).toBe('k1');
      expect(preview.messages[1].key).toBe('k2');
    });

    it('should handle large JSON Array', async () => {
      const largeArray = Array.from({ length: 150 }, (_, i) => ({
        key: `key${i}`,
        value: `value${i}`,
      }));
      const jsonArray = JSON.stringify(largeArray);
      const file = new File([jsonArray], 'large.json', { type: 'application/json' });
      
      const preview = await readFilePreview(file, 'json');
      
      expect(preview.messages.length).toBeLessThanOrEqual(100); // PREVIEW_LINES limit
      expect(preview.hasMore).toBe(true);
    });

    it('should handle JSON Lines format', async () => {
      const jsonl = [
        JSON.stringify({ key: 'k1', value: 'v1' }),
        JSON.stringify({ key: 'k2', value: 'v2' }),
        JSON.stringify({ key: 'k3', value: 'v3' }),
      ].join('\n');
      const file = new File([jsonl], 'test.jsonl', { type: 'application/json' });
      
      const preview = await readFilePreview(file, 'jsonl');
      
      expect(preview.messages).toHaveLength(3);
      expect(preview.errors).toHaveLength(0);
    });

    it('should preview CSV format with key/value columns', async () => {
      const csv = [
        'partition,offset,timestamp,key,value',
        '0,1136577072,"2026-03-31T08:28:12.012Z","","{\"grouping_version\": \"363.3\"}"',
        '1,1136577073,"2026-03-31T08:28:12.052Z","mykey","{\"data\": \"test\"}"',
      ].join('\n');
      const file = new File([csv], 'test.csv', { type: 'text/csv' });
      
      const preview = await readFilePreview(file, 'csv');
      
      expect(preview.messages).toHaveLength(2);
      expect(preview.errors).toHaveLength(0);
      expect(preview.totalLines).toBe(2);
      
      // First row - key is empty, value should be the JSON string
      expect(preview.messages[0].key).toBe('');
      expect(preview.messages[0].value).toContain('grouping_version');
      
      // Second row - key is "mykey"
      expect(preview.messages[1].key).toBe('mykey');
      expect(preview.messages[1].value).toContain('data');
    });
  });

  describe('parseCsvRow', () => {
    it('should parse CSV row with headers', () => {
      const headers = ['key', 'value', 'partition'];
      const line = 'user1,"{""name"":""test""}",0';
      const row = parseCsvRow(line, headers);
      
      expect(row._raw?.key).toBe('user1');
      expect(row._raw?.partition).toBe('0');
      expect(row._raw?.value).toContain('name');
      expect(row._raw?.value).toContain('test');
    });

    it('should handle quoted values with commas', () => {
      const headers = ['key', 'value'];
      const line = 'key1,"{""nested"":""value""}"';
      const row = parseCsvRow(line, headers);
      
      expect(row._raw?.key).toBe('key1');
    });

    it('should handle tab-separated values', () => {
      const headers = ['key', 'value', 'timestamp'];
      const line = 'key1\tvalue1\t123456';
      const row = parseCsvRow(line, headers);
      
      expect(row._raw).toEqual({
        key: 'key1',
        value: 'value1',
        timestamp: '123456',
      });
    });

    it('should handle missing values', () => {
      const headers = ['key', 'value', 'optional'];
      const line = 'key1,value1';
      const row = parseCsvRow(line, headers);
      
      expect(row._raw?.optional).toBe('');
    });
  });
});
