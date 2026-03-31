# Kafkit v1.0.4 Release Notes

## 🚀 What's New

### 🔔 Alert Center
Real-time monitoring system for your Kafka cluster:
- **Consumer Lag Monitoring**: Automatically detects high consumer lag with configurable thresholds
- **Connection Health Checks**: Monitors connection status and alerts on disconnections
- **Smart Notifications**: Desktop notifications with deduplication and cooldown periods
- **Alert Management**: View, filter, and acknowledge alerts in the Alert Center UI
- **Statistics Dashboard**: Track total, active, warning, error, and resolved alerts

### 📜 Virtual Scrolling
Massive performance improvements for message consumption:
- **100k+ Message Support**: Smooth scrolling even with huge message volumes
- **Dynamic Row Heights**: Handles expanded/collapsed message states
- **Automatic Measurement**: Uses ResizeObserver for accurate height calculations
- **Syntax Highlighting**: JSON, Avro, Protobuf, and CSV formatting
- **Smart Truncation**: Long strings are truncated with expand/collapse controls
- **Schema Registry Integration**: Automatic schema detection and display

### 📄 Topic List Pagination
Better handling of large topic lists:
- **Configurable Page Sizes**: Choose between 10, 20, 50, or 100 topics per page
- **Smart Page Navigation**: Shows relevant page numbers with ellipsis for large lists
- **Item Statistics**: Displays "Showing X-Y of Z items"
- **Client-side Pagination**: Fast navigation without server round-trips

### ⏳ Consumer Page Loading States
Improved user experience:
- **Loading Indicators**: Start button shows loading state while topic info loads
- **Disabled Controls**: Prevents starting consumption before topic details are ready
- **Error Handling**: Clear messages when topic info fails to load

### 🌍 Internationalization
Complete i18n coverage:
- **New Translation Keys**: Added for all v1.0.4 features
- **Supported Languages**: Chinese (zh-CN) and English (en-US)
- **Pagination Labels**: "Showing X-Y of Z items", "per page" controls
- **Monitor Labels**: Alert center, severity levels, action buttons

### 🧪 Testing
Improved test coverage:
- **143 Tests Passing**: Up from 132 in v1.0.3
- **Pagination Tests**: 11 new component tests
- **Monitor Tests**: Comprehensive MonitorService testing

### 🐛 Bug Fixes
- **MemoryWarning Buttons**: Fixed export, dismiss, and close button actions
- **Consumer Start Button**: Now properly waits for topic info before enabling
- **JSON Rendering**: Long strings no longer overflow the view

---

## 📦 Installation

### Download
Download the appropriate release for your platform:
- macOS: `Kafkit_1.0.4_x64.dmg`
- Windows: `Kafkit_1.0.4_x64.msi`
- Linux: `kafkit_1.0.4_amd64.deb`

### Build from Source
```bash
# Clone repository
git clone https://github.com/gaipianerclaw/kafkit.git
cd kafkit

# Checkout release
git checkout v1.0.4

# Install dependencies
cd kafkit && npm install

# Build frontend
npm run build

# Build Tauri app
cd ../src-tauri && cargo build --release
```

---

## 📝 API Changes

### New Components
- `<Pagination />` - Reusable pagination component
- `<AlertCenter />` - Alert management UI
- `MonitorService` - Singleton monitoring service

### Modified Components
- `<VirtualMessageList />` - Rewritten with react-window
- `<ConsumerPage />` - Added loading state management
- `<TopicListPage />` - Added pagination

---

## 🔧 Configuration

### Alert Rules
Configure alert thresholds in Alert Settings:
- Consumer Lag: Default 1000 messages
- Connection Check Interval: 30 seconds
- Cooldown Period: 5 minutes

### Pagination
Default page sizes: 10, 20, 50, 100 topics per page

---

## 🐛 Known Issues

- Schema Registry: Advanced features like Schema Evolution not yet implemented
- Connection Pool: Only Producer caching implemented, AdminClient caching pending
- Virtual Scrolling: Dynamic row height calculation may have slight delay on expand

---

## 📊 Performance

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Message List (10k) | ~5 FPS | ~60 FPS | 12x |
| Memory (10k messages) | ~800MB | ~300MB | 2.7x |
| Topic List (1000) | 3s load | Instant | 3s+ |

---

## 🙏 Contributors

- @gaipianerclaw - Core development

---

## 🔗 Links

- [Full Changelog](https://github.com/gaipianerclaw/kafkit/compare/v1.0.3...v1.0.4)
- [Documentation](https://github.com/gaipianerclaw/kafkit/blob/main/V1.0.4_README.md)
- [Issues](https://github.com/gaipianerclaw/kafkit/issues)

---

**Release Date**: 2026-03-29
