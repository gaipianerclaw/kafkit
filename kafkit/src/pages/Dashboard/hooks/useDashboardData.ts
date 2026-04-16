import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { 
  ConsumerGroupInfo, 
  PartitionLag 
} from '../../../types';
import type { 
  DashboardConsumerGroup, 
  LagDataPoint, 
  UseDashboardDataReturn,
  HealthStatus 
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

  // Use ref to track mounted state
  const isMounted = useRef(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  interface DashboardState {
    groups: DashboardConsumerGroup[];
    trendData: LagDataPoint[];
    isLoading: boolean;
    error: Error | null;
    lastUpdated: number;
  }

  const fetchData = useCallback(async () => {
    if (!connectionId) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      setState((prev) => ({ ...prev, isLoading: prev.groups.length === 0 }));

      // 1. Fetch all consumer groups
      console.log('[Dashboard] Fetching consumer groups for connection:', connectionId);
      const groupList = await invoke<ConsumerGroupInfo[]>('list_consumer_groups', {
        connectionId,
      });
      console.log('[Dashboard] Received groups:', groupList.length, groupList);

      // 2. Fetch lag for each group (parallel)
      const groupsWithLag = await Promise.all(
        groupList.map(async (group) => {
          try {
            const lagData = await invoke<PartitionLag[]>('get_consumer_lag', {
              connectionId,
              groupId: group.groupId,
            });
            console.log(`[Dashboard] Lag for ${group.groupId}:`, lagData.length, lagData);
            return enrichGroupData(group, lagData);
          } catch (err) {
            console.error(`[Dashboard] Failed to fetch lag for ${group.groupId}:`, err);
            // Return group with zero lag on error
            return enrichGroupData(group, []);
          }
        })
      );

      if (!isMounted.current) return;

      // 3. Update trend data
      const timestamp = Date.now();
      const newDataPoints: LagDataPoint[] = groupsWithLag.map((g) => ({
        timestamp,
        groupId: g.groupId,
        lag: g.totalLag,
      }));

      setState((prev) => {
        const combined = [...prev.trendData, ...newDataPoints];
        // Keep only last MAX_HISTORY_POINTS timestamps
        const cutoff = timestamp - (MAX_HISTORY_POINTS * REFRESH_INTERVAL);
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
      console.error('Failed to fetch dashboard data:', err);
      if (isMounted.current) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err : new Error(String(err)),
          isLoading: false,
        }));
      }
    }
  }, [connectionId]);

  // Initial fetch and auto-refresh
  useEffect(() => {
    isMounted.current = true;
    
    fetchData();

    if (autoRefresh) {
      intervalRef.current = setInterval(fetchData, REFRESH_INTERVAL);
    }

    return () => {
      isMounted.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchData, autoRefresh]);

  // Visibility change handler (pause when hidden)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else if (autoRefresh) {
        fetchData();
        intervalRef.current = setInterval(fetchData, REFRESH_INTERVAL);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [autoRefresh, fetchData]);

  return {
    ...state,
    refresh: fetchData,
  };
}
