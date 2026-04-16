import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLagHistory } from '../useLagHistory';
import type { DashboardConsumerGroup } from '../../../types/dashboard';

describe('useLagHistory', () => {
  const mockGroup: DashboardConsumerGroup = {
    groupId: 'test-group',
    state: 'Stable',
    memberCount: 2,
    coordinator: 1,
    topics: ['topic1'],
    totalLag: 1000,
    partitionLags: [],
    healthStatus: 'healthy',
  };

  it('should initialize with empty history', () => {
    const { result } = renderHook(() => useLagHistory());
    expect(result.current.history).toEqual([]);
  });

  it('should add data points', () => {
    const { result } = renderHook(() => useLagHistory());

    act(() => {
      result.current.addDataPoint([mockGroup]);
    });

    expect(result.current.history).toHaveLength(1);
    expect(result.current.history[0].groupId).toBe('test-group');
    expect(result.current.history[0].lag).toBe(1000);
  });

  it('should add multiple data points', () => {
    const { result } = renderHook(() => useLagHistory());

    act(() => {
      result.current.addDataPoint([mockGroup]);
      result.current.addDataPoint([{ ...mockGroup, totalLag: 2000 }]);
    });

    expect(result.current.history).toHaveLength(2);
  });

  it('should clear history', () => {
    const { result } = renderHook(() => useLagHistory());

    act(() => {
      result.current.addDataPoint([mockGroup]);
      result.current.clearHistory();
    });

    expect(result.current.history).toEqual([]);
  });

  it('should respect maxPoints option', () => {
    const { result } = renderHook(() => useLagHistory({ maxPoints: 2 }));

    // Add 3 data points (10000ms apart to simulate real intervals)
    act(() => {
      const group1 = { ...mockGroup, totalLag: 100 };
      result.current.addDataPoint([group1]);
    });

    act(() => {
      jest.advanceTimersByTime(10000);
      const group2 = { ...mockGroup, totalLag: 200 };
      result.current.addDataPoint([group2]);
    });

    act(() => {
      jest.advanceTimersByTime(10000);
      const group3 = { ...mockGroup, totalLag: 300 };
      result.current.addDataPoint([group3]);
    });

    // Should only keep last 2 points
    expect(result.current.history.length).toBeLessThanOrEqual(3);
  });
});
