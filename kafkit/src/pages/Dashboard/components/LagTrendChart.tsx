import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatNumber, formatTime } from '../../../utils/formatters';
import type { LagDataPoint, DashboardConsumerGroup, ChartDataPoint } from '../../../types/dashboard';

interface LagTrendChartProps {
  data: LagDataPoint[];
  groups?: DashboardConsumerGroup[];
}

// Color palette for chart lines
const COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
];

function getGroupColor(index: number): string {
  return COLORS[index % COLORS.length];
}

export function LagTrendChart({ data }: LagTrendChartProps) {
  const { t } = useTranslation();
  const [hiddenGroups, setHiddenGroups] = useState<Set<string>>(new Set());

  // Get top 5 groups by max lag for default display
  const topGroups = useMemo(() => {
    const groupMaxLag = new Map<string, number>();
    data.forEach((point) => {
      const current = groupMaxLag.get(point.groupId) || 0;
      groupMaxLag.set(point.groupId, Math.max(current, point.lag));
    });

    return Array.from(groupMaxLag.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([groupId]) => groupId);
  }, [data]);

  // Transform data for Recharts
  const chartData = useMemo(() => {
    // Group by timestamp
    const byTimestamp = new Map<number, ChartDataPoint>();
    
    data.forEach((point) => {
      if (!byTimestamp.has(point.timestamp)) {
        byTimestamp.set(point.timestamp, { timestamp: point.timestamp });
      }
      const entry = byTimestamp.get(point.timestamp)!;
      entry[point.groupId] = point.lag;
    });

    return Array.from(byTimestamp.values()).sort((a, b) => a.timestamp - b.timestamp);
  }, [data]);

  const handleLegendClick = (groupId: string) => {
    setHiddenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  if (data.length === 0) {
    return (
      <div className="h-full min-h-[200px] flex items-center justify-center bg-card rounded-lg border border-dashed">
        <p className="text-muted-foreground text-sm">{t('dashboard.chart.noData')}</p>
      </div>
    );
  }

  return (
    <div className="h-full min-h-[200px] bg-card rounded-lg border p-4">
      <h3 className="text-sm font-medium mb-2">{t('dashboard.chart.title')}</h3>
      <ResponsiveContainer width="100%" height="85%" minHeight={160}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <XAxis
            dataKey="timestamp"
            tickFormatter={(ts) => formatTime(ts as number)}
            type="number"
            domain={['dataMin', 'dataMax']}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            tickFormatter={(val) => formatNumber(val as number)}
            tick={{ fontSize: 12 }}
            width={60}
          />
          <Tooltip
            labelFormatter={(ts) => formatTime(ts as number)}
            formatter={(val, name) => [formatNumber(val as number), name as string]}
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px',
            }}
          />
          <Legend
            onClick={(e) => handleLegendClick(e.value as string)}
            wrapperStyle={{ cursor: 'pointer' }}
          />
          {topGroups.map((groupId, index) => (
            <Line
              key={groupId}
              type="monotone"
              dataKey={groupId}
              stroke={getGroupColor(index)}
              strokeWidth={2}
              dot={false}
              hide={hiddenGroups.has(groupId)}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
