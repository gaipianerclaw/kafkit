import { describe, it, expect } from 'vitest';
import { formatNumber, formatNumberExact, formatTime, formatTimeAgo, formatDuration } from '../formatters';

describe('formatNumber', () => {
  it('should format small numbers correctly', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(100)).toBe('100');
    expect(formatNumber(999)).toBe('999');
  });

  it('should format thousands with K suffix', () => {
    expect(formatNumber(1000)).toBe('1.0K');
    expect(formatNumber(1500)).toBe('1.5K');
    expect(formatNumber(999999)).toBe('1000.0K');
  });

  it('should format millions with M suffix', () => {
    expect(formatNumber(1000000)).toBe('1.0M');
    expect(formatNumber(1500000)).toBe('1.5M');
    expect(formatNumber(999999999)).toBe('1000.0M');
  });

  it('should format billions with B suffix', () => {
    expect(formatNumber(1000000000)).toBe('1.0B');
    expect(formatNumber(2500000000)).toBe('2.5B');
  });

  it('should handle negative numbers', () => {
    expect(formatNumber(-1000)).toBe('-1.0K');
    expect(formatNumber(-1500000)).toBe('-1.5M');
  });
});

describe('formatNumberExact', () => {
  it('should format numbers with locale separators', () => {
    expect(formatNumberExact(1000)).toBe('1,000');
    expect(formatNumberExact(1000000)).toBe('1,000,000');
    expect(formatNumberExact(1234567)).toBe('1,234,567');
  });
});

describe('formatTime', () => {
  it('should format timestamp to time string', () => {
    const timestamp = new Date('2024-01-15T14:30:45').getTime();
    const result = formatTime(timestamp);
    expect(result).toMatch(/14:30:45/);
  });
});

describe('formatTimeAgo', () => {
  it('should return "just now" for recent timestamps', () => {
    const now = Date.now();
    expect(formatTimeAgo(now)).toBe('just now');
    expect(formatTimeAgo(now - 3000)).toBe('just now');
  });

  it('should return seconds for timestamps within a minute', () => {
    const now = Date.now();
    expect(formatTimeAgo(now - 10000)).toBe('10s ago');
    expect(formatTimeAgo(now - 45000)).toBe('45s ago');
  });

  it('should return minutes for timestamps within an hour', () => {
    const now = Date.now();
    expect(formatTimeAgo(now - 120000)).toBe('2m ago');
    expect(formatTimeAgo(now - 3540000)).toBe('59m ago');
  });

  it('should return hours for timestamps within a day', () => {
    const now = Date.now();
    expect(formatTimeAgo(now - 7200000)).toBe('2h ago');
    expect(formatTimeAgo(now - 82800000)).toBe('23h ago');
  });

  it('should return days for older timestamps', () => {
    const now = Date.now();
    expect(formatTimeAgo(now - 86400000)).toBe('1d ago');
    expect(formatTimeAgo(now - 172800000)).toBe('2d ago');
  });
});

describe('formatDuration', () => {
  it('should format seconds', () => {
    expect(formatDuration(5000)).toBe('5s');
    expect(formatDuration(59000)).toBe('59s');
  });

  it('should format minutes and seconds', () => {
    expect(formatDuration(60000)).toBe('1m 0s');
    expect(formatDuration(90000)).toBe('1m 30s');
    expect(formatDuration(3540000)).toBe('59m 0s');
  });

  it('should format hours and minutes', () => {
    expect(formatDuration(3600000)).toBe('1h 0m');
    expect(formatDuration(5400000)).toBe('1h 30m');
    expect(formatDuration(7200000)).toBe('2h 0m');
  });
});
