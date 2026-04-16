# Software Requirements Specification (SRS)

## Kafkit v1.0.6 - Consumer Monitoring Dashboard

> Version: 1.0.6  
> Date: 2026-04-15  
> Status: Phase 1 - Requirements Specification  
> Branch: feature/v1.0.6-consumer-monitoring

---

## 1. Introduction

### 1.1 Purpose

This document defines the software requirements specification for Kafkit v1.0.6, including:
1. Consumer Monitoring Dashboard feature
2. Windows 10 Installation Fix

This serves as the basis for technical design and development.

### 1.2 Scope

This version includes two main deliverables:
1. **Consumer Monitoring Dashboard**: Real-time consumer group lag monitoring within a single connection
2. **Windows 10 Installation Fix**: Resolve MSI installer failure on Windows 10 systems without WebView2

### 1.3 Definitions and Abbreviations

| Term | Definition |
|------|------------|
| Lag | Consumer lag, the difference between Log End Offset and Current Offset |
| Consumer Group | A group of consumers that share consumption of the same Topic |
| Partition Lag | Lag data for a single partition |
| TPS | Transactions Per Second (consumption rate in this context) |

---

## 2. Overall Description

### 2.1 Product Perspective

The Consumer Monitoring Dashboard is an enhancement to the Kafkit desktop client, building a real-time monitoring view on top of the existing backend `get_consumer_lag` API.

### 2.2 User Types

| User Type | Description | Use Case |
|-----------|-------------|----------|
| DevOps Engineer | Responsible for Kafka cluster operations | Monitor consumption lag, detect backlog early |
| Developer | Using Kafka for application development | Debug consumer performance issues |
| Tech Lead | Concerned with overall system health | View overall consumer group status |

### 2.3 Operating Environment

- Consistent with Kafkit v1.0.5
- Supports macOS 11+, Windows 10+, Linux

### 2.4 Constraints

- Single connection monitoring only, no cross-cluster support
- Data refresh interval fixed at 10 seconds
- Real-time query only, no historical data persistence
- Alerts displayed only in frontend UI, no system-level notifications

## 2.5 Assumptions and Dependencies

- Windows 10 installation fix requires Tauri bundler configuration changes
- Target users without WebView2 pre-installed should be able to install successfully

---

## 3. Functional Requirements

### 3.1 Feature Groups

| Feature Group | Description | Requirements |
|---------------|-------------|--------------|
| Dashboard | Consumer monitoring dashboard | FR-DASH-001 to FR-DASH-007 |
| Windows Fix | Windows 10 installation fix | FR-WIN-001 |

### 3.2 Dashboard Layout

```
┌─────────────────────────────────────────────────────────────┐
│                Consumer Monitoring Dashboard                 │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Total Groups │  │ Health Stats │  │ Total Lag    │      │
│  │     12       │  │   8/3/1      │  │    1.2M      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
├─────────────────────────────────────────────────────────────┤
│  [Lag Trend Chart - Line chart showing lag over time]       │
├─────────────────────────────────────────────────────────────┤
│  [Consumer Group List Table]                                │
│  ┌─────────────┬────────┬─────────┬───────┬────────┐        │
│  │ Group ID    │ Status │ Topics  │ Lag   │ Rate   │        │
│  ├─────────────┼────────┼─────────┼───────┼────────┤        │
│  │ order-group │ Healthy│ 3       │ 120   │ 500/s  │        │
│  │ user-group  │ Warning│ 2       │ 5,230 │ 50/s   │        │
│  │ log-group   │ Critical│ 1      │ 120K  │ 10/s   │        │
│  └─────────────┴────────┴─────────┴───────┴────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Detailed Functional Requirements

#### FR-DASH-001: Dashboard Entry Point

| Attribute | Description |
|-----------|-------------|
| **Requirement ID** | FR-001 |
| **Name** | Dashboard Page Entry |
| **Priority** | P0 |
| **Description** | Add a "Monitoring Dashboard" entry in the left navigation sidebar |
| **Input** | User clicks navigation menu item |
| **Output** | Load dashboard page |
| **Acceptance Criteria** | 1. Navigation shows "Monitoring Dashboard" option<br>2. Click navigates to dashboard page<br>3. Auto-fetch monitoring data on page load |

#### FR-DASH-002: Global Statistics Cards

| Attribute | Description |
|-----------|-------------|
| **Requirement ID** | FR-002 |
| **Name** | Global Statistics Display |
| **Priority** | P0 |
| **Description** | Display three stat cards at top: total consumer groups, health distribution, total lag |
| **Input** | Consumer group list and lag data |
| **Output** | Three statistics cards UI |
| **Acceptance Criteria** | 1. Total groups: count of all consumer groups<br>2. Health distribution: categorized by lag thresholds<br>3. Total lag: sum of all lags with auto unit conversion<br>4. Auto-refresh every 10 seconds |

**Health Status Thresholds:**

| Status | Lag Range | Color |
|--------|-----------|-------|
| Healthy | Lag < 1,000 | Green |
| Warning | 1,000 <= Lag < 10,000 | Yellow |
| Critical | Lag >= 10,000 | Red |

#### FR-DASH-003: Lag Trend Chart

| Attribute | Description |
|-----------|-------------|
| **Requirement ID** | FR-003 |
| **Name** | Lag Trend Visualization |
| **Priority** | P0 |
| **Description** | Display line chart showing lag trends for consumer groups over time |
| **Input** | Periodic consumer group lag data |
| **Output** | Line chart visualization |
| **Acceptance Criteria** | 1. Support up to 5 consumer group lines<br>2. Default show top 3 lag groups<br>3. Click legend to toggle visibility<br>4. X-axis: time (last 10 min, 10s intervals)<br>5. Y-axis: lag count with auto-scaling<br>6. Hover to show exact values |

#### FR-DASH-004: Consumer Group List

| Attribute | Description |
|-----------|-------------|
| **Requirement ID** | FR-004 |
| **Name** | Consumer Group Table |
| **Priority** | P0 |
| **Description** | Table showing all consumer groups with details |
| **Input** | Consumer group metadata and lag data |
| **Output** | Sortable and filterable data table |
| **Acceptance Criteria** | 1. Columns: Group ID, Status, Topics, Total Lag, Rate<br>2. Sort by lag count<br>3. Filter by status (All/Healthy/Warning/Critical)<br>4. Search by Group ID<br>5. Status color indicator per row<br>6. Expand row to show partition-level details |

#### FR-DASH-005: Partition-Level Details

| Attribute | Description |
|-----------|-------------|
| **Requirement ID** | FR-005 |
| **Name** | Partition Lag Details |
| **Priority** | P1 |
| **Description** | Expandable view showing per-topic-partition lag when clicking a group row |
| **Input** | Partition lag data for selected group |
| **Output** | Expanded table with partition details |
| **Acceptance Criteria** | 1. Show Topic, Partition, Current Offset, Log End Offset, Lag<br>2. Sort by lag descending<br>3. Highlight partitions with critical lag<br>4. Support collapse/expand |

#### FR-DASH-006: Auto Refresh Control

| Attribute | Description |
|-----------|-------------|
| **Requirement ID** | FR-006 |
| **Name** | Auto Refresh Toggle |
| **Priority** | P1 |
| **Description** | Allow users to enable/disable auto-refresh and show countdown |
| **Input** | User toggle action |
| **Output** | Refresh state change |
| **Acceptance Criteria** | 1. Toggle switch for auto-refresh<br>2. Countdown indicator (10s)<br>3. Manual refresh button<br>4. Pause refresh on page hidden, resume on visible |

#### FR-DASH-007: Empty and Error States

| Attribute | Description |
|-----------|-------------|
| **Requirement ID** | FR-007 |
| **Name** | Empty and Error State Handling |
| **Priority** | P1 |
| **Description** | Handle cases with no consumer groups or fetch errors |
| **Input** | Empty data or error response |
| **Output** | Appropriate UI state |
| **Acceptance Criteria** | 1. Empty state: friendly message when no consumer groups<br>2. Error state: error message with retry button<br>3. Loading state: skeleton or spinner during fetch |

### 3.3 Windows 10 Installation Fix

#### FR-WIN-001: Windows 10 MSI Installer WebView2 Handling

| Attribute | Description |
|-----------|-------------|
| **Requirement ID** | FR-WIN-001 |
| **Name** | Windows 10 MSI Installer Fix |
| **Priority** | P0 |
| **Description** | Fix MSI installer failure on Windows 10 systems that do not have WebView2 pre-installed or cannot download WebView2 bootstrapper |
| **Root Cause** | Tauri default bundler configuration attempts to download WebView2 bootstrapper during installation, which fails on some Windows 10 systems |
| **Solution** | Set `webviewInstallMode` to `skip` in Tauri bundler configuration |
| **Acceptance Criteria** | 1. MSI installer builds successfully with new configuration<br>2. MSI installs without error -1 on Windows 10 22H2<br>3. Application launches if WebView2 is present<br>4. Clear error message if WebView2 is missing<br>5. README updated with WebView2 prerequisite notes |

**Configuration Change:**

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

---

## 4. Non-Functional Requirements

### 4.1 Performance Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NF-PERF-001 | Dashboard page load time | < 2 seconds |
| NF-PERF-002 | Lag data fetch latency | < 3 seconds |
| NF-PERF-003 | Chart rendering performance | 60 FPS with 5 lines x 60 points |
| NF-PERF-004 | Memory usage for trend data | < 50MB for 10 minutes of data |

### 4.2 Usability Requirements

| ID | Requirement | Description |
|----|-------------|-------------|
| NF-USE-001 | Responsive Design | Dashboard adapts to window resizing |
| NF-USE-002 | Color Accessibility | Status colors distinguishable for color-blind users |
| NF-USE-003 | Number Formatting | Large numbers use K/M/B suffixes (e.g., 1.2M) |
| NF-USE-004 | Time Formatting | Relative time display (e.g., "Updated 5s ago") |

### 4.3 Compatibility Requirements

| ID | Requirement | Description |
|----|-------------|-------------|
| NF-COMP-001 | Browser Engine | Works with Tauri 2.x WebView2/webkit |
| NF-COMP-002 | Kafka Version | Compatible with Kafka 2.4+ |

---

## 5. Interface Requirements

### 5.1 Backend API

Use existing API - no backend changes required:

```typescript
// Existing APIs
invoke('list_consumer_groups', { connectionId: string }): Promise<ConsumerGroupInfo[]>
invoke('get_consumer_lag', { connectionId: string, groupId: string }): Promise<PartitionLag[]>
```

### 5.2 Frontend Data Models

```typescript
interface DashboardConsumerGroup {
  groupId: string;
  state: 'Stable' | 'PreparingRebalance' | 'CompletingRebalance' | 'Dead' | 'Unknown';
  memberCount: number;
  topics: string[];
  totalLag: number;
  partitionLags: PartitionLag[];
  healthStatus: 'healthy' | 'warning' | 'critical';
  // Calculated field
  consumeRate?: number; // messages per second
}

interface LagDataPoint {
  timestamp: number;
  groupId: string;
  lag: number;
}

interface DashboardState {
  groups: DashboardConsumerGroup[];
  trendData: LagDataPoint[]; // Last 10 minutes
  lastUpdated: number;
  isRefreshing: boolean;
  autoRefresh: boolean;
}
```

---

## 6. Acceptance Criteria Summary

| Feature | Criteria | Priority |
|---------|----------|----------|
| Dashboard Entry | Navigation works, page loads | P0 |
| Statistics Cards | Three cards display correct data | P0 |
| Trend Chart | Line chart renders, updates every 10s | P0 |
| Group List | Table displays, sorts, filters | P0 |
| Partition Details | Expandable rows show partition lag | P1 |
| Auto Refresh | Toggle works, countdown accurate | P1 |
| Error Handling | Graceful handling of empty/error states | P1 |
| Windows 10 Fix | MSI installs without WebView2 download error | P0 |

---

## 7. Open Issues

| Issue | Description | Resolution |
|-------|-------------|------------|
| CONSUME-RATE-001 | Consumption rate calculation requires offset delta over time | Calculate from trend data |

---

## 8. Revision History

| Date | Version | Author | Description |
|------|---------|--------|-------------|
| 2026-04-15 | 1.0 | AI Assistant | Initial SRS for v1.0.6 |
| 2026-04-15 | 1.1 | AI Assistant | Added Windows 10 installation fix (FR-WIN-001) |
