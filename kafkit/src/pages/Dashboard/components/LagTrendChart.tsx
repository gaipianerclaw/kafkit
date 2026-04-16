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
  CartesianGrid,
} from 'recharts';
import { formatNumber, formatTime } from '../../../utils/formatters';
import type { LagDataPoint, ChartDataPoint } from '../../../types/dashboard';

interface LagTrendChartProps {
  data: LagDataPoint[];
}

const COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
  '#ec4899', // pink-500
  '#6366f1', // indigo-500
  '#84cc16', // lime-500
];

function getGroupColor(index: number): string {
  return COLORS[index % COLORS.length];
}

// Custom tooltip to avoid z-index issues and improve styling
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: number;
}) {
  if (!active || !payload || payload.length === 0) return null;

  // Sort by value desc
  const sorted = [...payload].sort((a, b) => b.value - a.value);

  return (
    <div
      className="rounded-lg border bg-card px-3 py-2 shadow-lg"
      style={{ zIndex: 9999 }}
    >
      <p className="mb-1 text-xs font-medium text-muted-foreground">
        {label ? formatTime(label) : ''}
      </p>
      <div className="space-y-0.5">
        {sorted.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2 text-xs">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="max-w-[180px] truncate" title={entry.name}>
              {entry.name}
            </span>
            <span className="ml-auto font-mono font-medium">
              {formatNumber(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LagTrendChart({ data }: LagTrendChartProps) {
  const { t } = useTranslation();
  const [hiddenGroups, setHiddenGroups] = useState<Set<string>>(new Set());

  const allGroups = useMemo(() => {
    const groupMaxLag = new Map<string, number>();
    data.forEach((point) => {
      const current = groupMaxLag.get(point.groupId) || 0;
      groupMaxLag.set(point.groupId, Math.max(current, point.lag));
    });

    return Array.from(groupMaxLag.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([groupId]) => groupId);
  }, [data]);

  const chartData = useMemo(() => {
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
        <LineChart
          data={chartData}
          margin={{ top: 36, right: 16, bottom: 24, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
          <XAxis
            dataKey="timestamp"
            tickFormatter={(ts) => formatTime(ts as number)}
            type="number"
            domain={['dataMin', 'dataMax']}
            tick={{ fontSize: 11 }}
            stroke="hsl(var(--muted-foreground))"
          />
          <YAxis
            tickFormatter={(val) => formatNumber(val as number)}
            tick={{ fontSize: 11 }}
            width={56}
            stroke="hsl(var(--muted-foreground))"
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            align="center"
            height={36}
            iconType="circle"
            wrapperStyle={{
              cursor: 'pointer',
              fontSize: '11px',
              paddingBottom: '8px',
            }}
            onClick={(e) => handleLegendClick(e.value as string)}
          />
          {allGroups.map((groupId, index) => (
            <Line
              key={groupId}
              type="monotone"
              dataKey={groupId}
              stroke={getGroupColor(index)}
              strokeWidth={hiddenGroups.has(groupId) ? 0 : 2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              hide={hiddenGroups.has(groupId)}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
