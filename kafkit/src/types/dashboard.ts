/**
 * Dashboard types for consumer monitoring
 */

import type { ConsumerGroupInfo, PartitionLag } from './index';

export type HealthStatus = 'healthy' | 'warning' | 'critical';

export interface DashboardConsumerGroup extends ConsumerGroupInfo {
  topics: string[];
  totalLag: number;
  partitionLags: PartitionLag[];
  healthStatus: HealthStatus;
  consumeRate?: number; // messages per second
}

export interface LagDataPoint {
  timestamp: number;
  groupId: string;
  lag: number;
}

export interface ChartDataPoint {
  timestamp: number;
  [groupId: string]: number | string;
}

export interface DashboardStats {
  totalGroups: number;
  healthy: number;
  warning: number;
  critical: number;
  totalLag: number;
}

export interface SortConfig {
  key: 'groupId' | 'state' | 'totalLag' | 'memberCount';
  direction: 'asc' | 'desc';
}

export interface DashboardState {
  groups: DashboardConsumerGroup[];
  trendData: LagDataPoint[];
  isLoading: boolean;
  error: Error | null;
  lastUpdated: number;
}

export interface UseDashboardDataReturn extends DashboardState {
  refresh: () => Promise<void>;
}
