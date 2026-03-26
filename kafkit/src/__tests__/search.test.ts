import { describe, it, expect } from 'vitest';
import { parseSearchQuery, matchSearch, validateSearchQuery } from '../utils/search';

describe('Search Utils', () => {
  describe('parseSearchQuery', () => {
    it('should parse simple keyword', () => {
      const result = parseSearchQuery('error');
      expect(result.terms).toHaveLength(1);
      expect(result.terms[0]).toEqual({
        value: 'error',
        negated: false,
        exact: false,
      });
    });

    it('should parse exact phrase', () => {
      const result = parseSearchQuery('"payment failed"');
      expect(result.terms).toHaveLength(1);
      expect(result.terms[0]).toEqual({
        value: 'payment failed',
        negated: false,
        exact: true,
      });
    });

    it('should parse negated term', () => {
      const result = parseSearchQuery('-retry');
      expect(result.terms).toHaveLength(1);
      expect(result.terms[0]).toEqual({
        value: 'retry',
        negated: true,
        exact: false,
      });
    });

    it('should parse field filter', () => {
      const result = parseSearchQuery('user:admin');
      expect(result.filters).toHaveLength(1);
      expect(result.filters[0]).toEqual({
        field: 'user',
        operator: 'eq',
        value: 'admin',
        negated: false,
      });
    });

    it('should parse comparison operator', () => {
      const result = parseSearchQuery('offset:>1000');
      expect(result.filters[0]).toEqual({
        field: 'offset',
        operator: 'gt',
        value: '1000',
        negated: false,
      });
    });

    it('should parse multiple terms and filters', () => {
      const result = parseSearchQuery('error user:admin -retry offset:>1000');
      expect(result.terms).toHaveLength(2); // error, -retry
      expect(result.filters).toHaveLength(2); // user:admin, offset:>1000
    });
  });

  describe('matchSearch', () => {
    const testItem = {
      key: 'user-123',
      value: 'Login successful',
      offset: '1000',
      partition: '0',
    };

    it('should match simple keyword', () => {
      const query = parseSearchQuery('Login');
      expect(matchSearch(testItem, query, ['key', 'value'])).toBe(true);
    });

    it('should not match non-existing keyword', () => {
      const query = parseSearchQuery('error');
      expect(matchSearch(testItem, query, ['key', 'value'])).toBe(false);
    });

    it('should match field filter', () => {
      const query = parseSearchQuery('key:user-123');
      expect(matchSearch(testItem, query, ['key', 'value'])).toBe(true);
    });

    it('should match comparison operator', () => {
      const query = parseSearchQuery('offset:>500');
      expect(matchSearch(testItem, query, ['key', 'value', 'offset'])).toBe(true);
    });

    it('should exclude negated term', () => {
      const query = parseSearchQuery('user -admin');
      const item = { key: 'user-admin', value: '' };
      expect(matchSearch(item, query, ['key'])).toBe(false);
    });

    it('should match exact phrase', () => {
      const query = parseSearchQuery('"Login successful"');
      expect(matchSearch(testItem, query, ['key', 'value'])).toBe(true);
    });
  });

  describe('validateSearchQuery', () => {
    it('should validate simple query', () => {
      const result = validateSearchQuery('keyword');
      expect(result.valid).toBe(true);
    });

    it('should validate complex query', () => {
      const result = validateSearchQuery('user:admin offset:>1000');
      expect(result.valid).toBe(true);
    });

    it('should invalidate invalid regex', () => {
      const result = validateSearchQuery('value:regex:[invalid/');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid regex');
    });
  });
});
