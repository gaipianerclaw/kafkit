import { describe, it, expect } from 'vitest';
import { detectFormat, parseFile } from '../../pages/Producer/FileMode/fileParser';

describe('fileParser', () => {
  describe('detectFormat', () => {
    it('should detect JSON Lines from .jsonl extension', () => {
      const result = detectFormat('data.jsonl', '{"key":"value"}');
      expect(result).toBe('jsonl');
    });

    it('should detect JSON Lines from .ndjson extension', () => {
      const result = detectFormat('data.ndjson', '{"key":"value"}');
      expect(result).toBe('jsonl');
    });

    it('should detect CSV from .csv extension', () => {
      const result = detectFormat('data.csv', 'key,value\n1,test');
      expect(result).toBe('csv');
    });

    it('should detect TSV from .tsv extension', () => {
      const result = detectFormat('data.tsv', 'key\tvalue\n1\ttest');
      expect(result).toBe('csv');
    });

    it('should detect JSON Array from .json extension', () => {
      const result = detectFormat('data.json', '[{"key":"value"}]');
      expect(result).toBe('json');
    });

    it('should detect CSV from content with commas', () => {
      const result = detectFormat('data.txt', 'key,value,other\n1,2,3');
      expect(result).toBe('csv');
    });

    it('should detect JSON Lines from JSON content', () => {
      const result = detectFormat('data.txt', '{"id":1,"name":"test"}');
      expect(result).toBe('jsonl');
    });

    it('should detect JSON Array from array content', () => {
      const result = detectFormat('data.txt', '[{"id":1},{"id":2}]');
      expect(result).toBe('json');
    });
  });

  describe('parseFile - JSON Lines', () => {
    it('should parse JSON Lines format', () => {
      const content = '{"key":"k1","value":"v1"}\n{"key":"k2","value":"v2"}';
      const result = parseFile(content, 'jsonl');
      
      expect(result.messages).toHaveLength(2);
      expect(result.totalLines).toBe(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should skip empty lines in JSON Lines', () => {
      const content = '{"key":"k1"}\n\n{"key":"k2"}\n';
      const result = parseFile(content, 'jsonl');
      
      expect(result.messages).toHaveLength(2);
    });

    it('should report invalid JSON lines as errors', () => {
      const content = '{"key":"valid"}\ninvalid json\n{"key":"valid2"}';
      const result = parseFile(content, 'jsonl');
      
      expect(result.messages).toHaveLength(2);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('parseFile - JSON Array', () => {
    it('should parse JSON Array format', () => {
      const content = '[{"key":"k1"},{"key":"k2"}]';
      const result = parseFile(content, 'json');
      
      expect(result.messages).toHaveLength(2);
      expect(result.totalLines).toBe(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle single JSON object', () => {
      const content = '{"key":"value"}';
      const result = parseFile(content, 'json');
      
      expect(result.messages).toHaveLength(1);
      expect(result.totalLines).toBe(1);
    });

    it('should handle empty array', () => {
      const content = '[]';
      const result = parseFile(content, 'json');
      
      expect(result.messages).toHaveLength(0);
      expect(result.totalLines).toBe(0);
    });
  });

  describe('parseFile - CSV', () => {
    it('should parse CSV format with header', () => {
      const content = 'key,value\nk1,v1\nk2,v2';
      const result = parseFile(content, 'csv');
      
      expect(result.messages).toHaveLength(2);
      expect(result.totalLines).toBe(2);
      expect(result.errors).toHaveLength(0);
      
      // Check first message has raw data
      expect(result.messages[0]._raw).toBeDefined();
      expect(result.messages[0]._raw?.key).toBe('k1');
      expect(result.messages[0]._raw?.value).toBe('v1');
    });

    it('should parse TSV format', () => {
      const content = 'key\tvalue\nk1\tv1';
      const result = parseFile(content, 'csv');
      
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]._raw?.key).toBe('k1');
    });

    it('should handle CSV with quoted values', () => {
      const content = 'key,value\n"k,ey","v,alue"';
      const result = parseFile(content, 'csv');
      
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]._raw?.key).toBe('k,ey');
    });
  });
});
