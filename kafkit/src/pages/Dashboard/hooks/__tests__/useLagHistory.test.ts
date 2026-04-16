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

  it('should add data with different timestamps', () => {
    const { result } = renderHook(() => useLagHistory({ maxPoints: 10 }));

    // Add multiple data points
    act(() => {
      result.current.addDataPoint([{ ...mockGroup, totalLag: 100 }]);
    });

    act(() => {
      result.current.addDataPoint([{ ...mockGroup, totalLag: 200 }]);
    });

    act(() => {
      result.current.addDataPoint([{ ...mockGroup, totalLag: 300 }]);
    });

    expect(result.current.history).toHaveLength(3);
    expect(result.current.history[0].lag).toBe(100);
    expect(result.current.history[1].lag).toBe(200);
    expect(result.current.history[2].lag).toBe(300);
  });
});
