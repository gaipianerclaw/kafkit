# Technical Design Document (TDD)

## Kafkit v1.0.6 - Consumer Monitoring Dashboard & Windows 10 Fix

> **Version**: 1.0.6  
> **Date**: 2026-04-15  
> **Status**: Phase 2 - Technical Design  
> **Branch**: feature/v1.0.6-consumer-monitoring

---

## 1. Overview

### 1.1 Design Goals

1. Dashboard: Real-time consumer lag visualization with minimal performance impact
2. Windows Fix: Simple configuration change to resolve installer issues
3. Maintainability: Clean component architecture, reusable hooks

### 1.2 Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + Tailwind CSS |
| Charts | Recharts (lightweight, React-friendly) |
| State | React Hooks + Context (no new state library) |
| Backend | Existing Rust services (no changes) |
| Build | Tauri 2.x |

---

## 2. Component Architecture

### 2.1 Dashboard Page Structure

```
src/pages/Dashboard/
├── index.tsx                    # Main dashboard page
├── components/
│   ├── StatCards.tsx           # FR-DASH-002: Global statistics
│   ├── LagTrendChart.tsx       # FR-DASH-003: Line chart
│   ├── ConsumerGroupTable.tsx  # FR-DASH-004: Main table
│   ├── PartitionDetail.tsx     # FR-DASH-005: Expandable row
│   ├── RefreshControl.tsx      # FR-DASH-006: Auto refresh toggle
│   └── EmptyState.tsx          # FR-DASH-007: Empty/error states
└── hooks/
    ├── useDashboardData.ts     # Data fetching and polling logic
    └── useLagHistory.ts        # Trend data management (10min window)
```

### 2.2 Component Responsibilities

| Component | Props | Description |
|-----------|-------|-------------|
| DashboardPage | - | Main container, orchestrates layout |
| StatCards | groups | Three stat cards with health calculation |
| LagTrendChart | data | Recharts line chart, top 3 groups |
| ConsumerGroupTable | groups, isLoading, error | Sortable/filterable table |
| PartitionDetail | partitions | Expanded view showing per-partition lag |
| RefreshControl | autoRefresh, lastUpdated | Toggle + countdown + manual refresh |
| EmptyState | - | Friendly message when no data |

---

## 3. State Management Design

### 3.1 State Structure

```typescript
// Dashboard state (local to page)
interface DashboardState {
  groups: DashboardConsumerGroup[];
  trendData: LagDataPoint[];
  isLoading: boolean;
  error: Error | null;
  lastUpdated: number;
  autoRefresh: boolean;
  sortConfig: { key: string; direction: 'asc' | 'desc' };
  filterStatus: 'all' | 'healthy' | 'warning' | 'critical';
  searchQuery: string;
  expandedGroup: string | null;
}
```

### 3.2 Custom Hooks

#### useDashboardData Hook

```typescript
interface UseDashboardDataReturn {
  groups: DashboardConsumerGroup[];
  trendData: LagDataPoint[];
  isLoading: boolean;
  error: Error | null;
  lastUpdated: number;
  refresh: () => Promise<void>;
}

function useDashboardData(
  connectionId: string,
  autoRefresh: boolean,
  interval: number = 10000
): UseDashboardDataReturn
```

**Key Implementation Points:**

1. Initial fetch on mount
2. Interval-based polling when autoRefresh is true
3. Parallel fetching of lag data for all groups
4. Visibility change handling (pause when hidden)

#### useLagHistory Hook

```typescript
function useLagHistory(maxPoints: number = 60) {
  const [history, setHistory] = useState<LagDataPoint[]>([]);
  
  const addDataPoint = useCallback((groups: DashboardConsumerGroup[]) => {
    const timestamp = Date.now();
    const newPoints = groups.map(g => ({
      timestamp,
      groupId: g.groupId,
      lag: g.totalLag,
    }));
    
    setHistory(prev => {
      const combined = [...prev, ...newPoints];
      const cutoff = timestamp - (maxPoints * 10000);
      return combined.filter(p => p.timestamp > cutoff);
    });
  }, [maxPoints]);
  
  return { history, addDataPoint };
}
```

---

## 4. Data Flow

### 4.1 Data Flow Diagram

```
Tauri Bridge (Rust API)
         |
         v
useDashboardData (Hook)
         |
         +---> useLagHistory (Hook)
         |
         v
Dashboard Page
         |
         +---> StatCards
         +---> LagTrendChart
         +---> ConsumerGroupTable
                   +---> PartitionDetail (expanded)
```

### 4.2 Polling Strategy

| Aspect | Implementation |
|--------|---------------|
| Interval | 10 seconds (configurable) |
| Initial Load | Immediate on page mount |
| Visibility | Pause when tab hidden, resume on visible |
| Error Handling | Continue polling on error, show error state |
| Cleanup | Clear interval on unmount |

### 4.3 Data Transformation

```typescript
// Enrich raw API data with calculated fields
function enrichGroupData(
  group: ConsumerGroupInfo,
  lagData: PartitionLag[]
): DashboardConsumerGroup {
  const totalLag = lagData.reduce((sum, p) => sum + p.lag, 0);
  
  return {
    groupId: group.groupId,
    state: group.state,
    memberCount: group.memberCount,
    topics: [...new Set(lagData.map(p => p.topic))],
    totalLag,
    partitionLags: lagData,
    healthStatus: calculateHealthStatus(totalLag),
    consumeRate: undefined, // Calculated from trend data
  };
}

function calculateHealthStatus(totalLag: number): HealthStatus {
  if (totalLag >= 10000) return 'critical';
  if (totalLag >= 1000) return 'warning';
  return 'healthy';
}
```

---

## 5. Chart Library Selection

### 5.1 Comparison

| Library | Pros | Cons | Decision |
|---------|------|------|----------|
| Recharts | React-native, lightweight, customizable | Fewer features than D3 | Selected |
| Chart.js | Feature-rich, good performance | Requires wrapper | Alternative |
| Victory | React-native, animations | Larger bundle | Overkill |
| D3 | Maximum flexibility | Steep learning curve | Overkill |

### 5.2 Recharts Implementation

```bash
npm install recharts
```

```typescript
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function LagTrendChart({ data }: { data: ChartDataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <XAxis dataKey="timestamp" tickFormatter={formatTime} />
        <YAxis tickFormatter={formatNumber} />
        <Tooltip 
          labelFormatter={(ts) => formatFullTime(ts)}
          formatter={(val) => [formatNumber(val as number), 'Lag']}
        />
        <Legend />
        {visibleGroups.map(group => (
          <Line 
            key={group}
            type="monotone"
            dataKey={group}
            stroke={getGroupColor(group)}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
```

---

## 6. Windows 10 Fix (FR-WIN-001)

### 6.1 Problem Analysis

Tauri 2.x default Windows bundler configuration attempts to download WebView2 bootstrapper during MSI installation. This fails on Windows 10 systems without internet access or with restrictive firewall settings.

### 6.2 Solution

Set `webviewInstallMode` to `skip` in Tauri configuration.

### 6.3 Configuration Change

File: `kafkit/src-tauri/tauri.conf.json`

```json
{
  "bundle": {
    "windows": {
      "webviewInstallMode": {
        "type": "skip"
      }
    }
  }
}
```

### 6.4 Alternative Options

| Mode | Description | Use Case |
|------|-------------|----------|
| skip | Skip WebView2 installation | Users have WebView2 pre-installed |
| embedBootstrapper | Include bootstrapper in MSI | Offline installation |
| downloadBootstrapper | Download at install time | Default (problematic) |
| fixedRuntime | Include fixed WebView2 version | Maximum compatibility |

### 6.5 Documentation Update

Add to README.md Windows section:

```markdown
### Windows Prerequisites

- Windows 10 1809+ or Windows 11
- WebView2 Runtime (usually pre-installed on Windows 11)
  - Download from: https://developer.microsoft.com/en-us/microsoft-edge/webview2/
```

---

## 7. File Structure

### 7.1 New Files

```
kafkit/src/
├── pages/
│   └── Dashboard/
│       ├── index.tsx
│       ├── components/
│       │   ├── StatCards.tsx
│       │   ├── LagTrendChart.tsx
│       │   ├── ConsumerGroupTable.tsx
│       │   ├── PartitionDetail.tsx
│       │   ├── RefreshControl.tsx
│       │   └── EmptyState.tsx
│       └── hooks/
│           ├── useDashboardData.ts
│           └── useLagHistory.ts
├── types/
│   └── dashboard.ts          # Dashboard-specific types
└── utils/
    └── formatters.ts         # Number/time formatters
```

### 7.2 Modified Files

```
kafkit/src-tauri/
└── tauri.conf.json           # Windows bundler config

kafkit/src/
├── components/
│   └── layout/
│       └── Sidebar.tsx       # Add dashboard nav item
├── App.tsx                   # Add dashboard route
└── types/
    └── index.ts              # Export dashboard types

README.md                      # Add WebView2 prerequisite
```

---

## 8. Performance Considerations

### 8.1 Optimizations

| Area | Strategy |
|------|----------|
| Re-renders | React.memo for table rows, useMemo for calculations |
| Chart updates | Batch updates, smooth transitions disabled for performance |
| Data fetching | Parallel lag fetching for all groups |
| Memory | Limit trend data to 60 points (10 minutes) |
| Polling | Pause when tab not visible |

### 8.2 Memory Budget

| Component | Estimated Memory |
|-----------|-----------------|
| Trend data (60 points x 5 groups) | ~50KB |
| Consumer group list (100 groups) | ~500KB |
| Chart rendering | ~10MB |
| Total | < 20MB |

---

## 9. Error Handling

### 9.1 Error Types

| Error | Handling |
|-------|----------|
| Connection lost | Show error banner, continue polling |
| API timeout | Show partial data with warning |
| No consumer groups | Show empty state with help text |
| Lag fetch failed | Show group without lag data |

### 9.2 Error UI States

```typescript
// Error state component
function ErrorState({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <AlertTriangle className="w-12 h-12 text-yellow-500" />
      <h3 className="mt-4 text-lg font-medium">Failed to load dashboard</h3>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      <Button onClick={onRetry} className="mt-4">Retry</Button>
    </div>
  );
}
```

---

## 10. Testing Strategy

### 10.1 Unit Tests

| Component | Test Cases |
|-----------|-----------|
| StatCards | Health calculation, number formatting |
| useDashboardData | Polling behavior, error handling |
| useLagHistory | Sliding window, data point addition |
| formatters | Number suffixes (K/M), time formatting |

### 10.2 Integration Tests

- Dashboard page renders with mock data
- Auto-refresh toggle works correctly
- Filtering and sorting functionality
- Expandable rows show partition details

---

## 11. Revision History

| Date | Version | Author | Description |
|------|---------|--------|-------------|
| 2026-04-15 | 1.0 | AI Assistant | Initial TDD for v1.0.6 |
