import { useState, useCallback } from 'react';
import type { DashboardConsumerGroup, LagDataPoint } from '../../../types/dashboard';

const REFRESH_INTERVAL = 10000; // 10 seconds

interface UseLagHistoryOptions {
  maxPoints?: number;
}

export function useLagHistory(options: UseLagHistoryOptions = {}) {
  const { maxPoints = 60 } = options;
  const [history, setHistory] = useState<LagDataPoint[]>([]);

  const addDataPoint = useCallback((groups: DashboardConsumerGroup[]) => {
    const timestamp = Date.now();
    const newPoints: LagDataPoint[] = groups.map((g) => ({
      timestamp,
      groupId: g.groupId,
      lag: g.totalLag,
    }));

    setHistory((prev) => {
      const combined = [...prev, ...newPoints];
      // Keep only last maxPoints timestamps
      const cutoff = timestamp - maxPoints * REFRESH_INTERVAL;
      return combined.filter((p) => p.timestamp > cutoff);
    });
  }, [maxPoints]);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return {
    history,
    addDataPoint,
    clearHistory,
  };
}
