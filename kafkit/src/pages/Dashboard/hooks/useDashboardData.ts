import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { ConsumerGroupInfo, PartitionLag } from '../../../types';
import type {
  DashboardConsumerGroup,
  LagDataPoint,
  UseDashboardDataReturn,
  HealthStatus,
} from '../../../types/dashboard';

const REFRESH_INTERVAL = 10000; // 10 seconds
const MAX_HISTORY_POINTS = 60; // 10 minutes of data (60 x 10s)

function calculateHealthStatus(totalLag: number): HealthStatus {
  if (totalLag >= 10000) return 'critical';
  if (totalLag >= 1000) return 'warning';
  return 'healthy';
}

function enrichGroupData(
  group: ConsumerGroupInfo,
  lagData: PartitionLag[]
): DashboardConsumerGroup {
  const totalLag = lagData.reduce((sum, p) => sum + p.lag, 0);
  const topics = [...new Set(lagData.map((p) => p.topic))];

  return {
    ...group,
    topics,
    totalLag,
    partitionLags: lagData,
    healthStatus: calculateHealthStatus(totalLag),
  };
}

export function useDashboardData(
  connectionId: string,
  autoRefresh: boolean
): UseDashboardDataReturn {
  const [state, setState] = useState<DashboardState>({
    groups: [],
    trendData: [],
    isLoading: true,
    error: null,
    lastUpdated: 0,
  });

  const isMounted = useRef(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoRefreshRef = useRef(autoRefresh);

  interface DashboardState {
    groups: DashboardConsumerGroup[];
    trendData: LagDataPoint[];
    isLoading: boolean;
    error: Error | null;
    lastUpdated: number;
  }

  const fetchData = useCallback(async (trigger: 'init' | 'auto' | 'manual' = 'auto') => {
    if (!connectionId) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    console.log(`[Dashboard] Fetch triggered by: ${trigger}`);

    try {
      // Only show loading spinner on initial load or manual refresh
      const showLoading = trigger === 'init' || trigger === 'manual';
      if (showLoading) {
        setState((prev) => ({ ...prev, isLoading: true }));
      }

      const groupList = await invoke<ConsumerGroupInfo[]>('list_consumer_groups', {
        connectionId,
      });

      const groupsWithLag = await Promise.all(
        groupList.map(async (group) => {
          try {
            const lagData = await invoke<PartitionLag[]>('get_consumer_lag', {
              connectionId,
              groupId: group.groupId,
            });
            return enrichGroupData(group, lagData);
          } catch (err) {
            console.error(`[Dashboard] Failed to fetch lag for ${group.groupId}:`, err);
            return enrichGroupData(group, []);
          }
        })
      );

      if (!isMounted.current) return;

      const timestamp = Date.now();
      const newDataPoints: LagDataPoint[] = groupsWithLag.map((g) => ({
        timestamp,
        groupId: g.groupId,
        lag: g.totalLag,
      }));

      setState((prev) => {
        const combined = [...prev.trendData, ...newDataPoints];
        const cutoff = timestamp - MAX_HISTORY_POINTS * REFRESH_INTERVAL;
        const filtered = combined.filter((p) => p.timestamp > cutoff);

        return {
          groups: groupsWithLag,
          trendData: filtered,
          isLoading: false,
          error: null,
          lastUpdated: timestamp,
        };
      });
    } catch (err) {
      console.error('[Dashboard] Failed to fetch dashboard data:', err);
      if (isMounted.current) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err : new Error(String(err)),
          isLoading: false,
        }));
      }
    }
  }, [connectionId]);

  // Sync autoRefresh ref
  useEffect(() => {
    autoRefreshRef.current = autoRefresh;
  }, [autoRefresh]);

  // Initial fetch on mount / connection change
  useEffect(() => {
    isMounted.current = true;
    fetchData('init');

    return () => {
      isMounted.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchData]);

  // Manage interval based on autoRefresh
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        fetchData('auto');
      }, REFRESH_INTERVAL);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoRefresh, fetchData]);

  // Visibility change handler
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else if (autoRefreshRef.current) {
        fetchData('auto');
        intervalRef.current = setInterval(() => fetchData('auto'), REFRESH_INTERVAL);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [fetchData]);

  const refresh = useCallback(async () => {
    await fetchData('manual');
  }, [fetchData]);

  return {
    ...state,
    refresh,
  };
}
