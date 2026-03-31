# Kafkit v1.0.4 发布说明

## 🚀 新功能

### 🔔 告警中心
为 Kafka 集群提供的实时监控系统：
- **消费延迟监控**：自动检测高消费延迟，支持可配置阈值
- **连接健康检查**：监控连接状态，断开时发送告警
- **智能通知**：桌面通知支持去重和冷却机制
- **告警管理**：在告警中心 UI 中查看、筛选和确认告警
- **统计面板**：追踪总计、活跃、警告、错误和已恢复的告警数量

### 📜 虚拟滚动
消息消费性能大幅提升：
- **支持 10万+ 消息**：海量消息卷也能流畅滚动
- **动态行高**：处理展开/折叠消息状态
- **自动测量**：使用 ResizeObserver 进行精确高度计算
- **语法高亮**：支持 JSON、Avro、Protobuf 和 CSV 格式化
- **智能截断**：长字符串自动截断，支持展开/收起
- **Schema Registry 集成**：自动检测和显示 Schema 信息

### 📄 Topic 列表分页
更好地处理大量 Topic：
- **可配置每页条数**：可选择每页 10、20、50 或 100 个 Topic
- **智能页码导航**：显示相关页码，大量页码时使用省略号
- **条目统计**：显示"显示第 X-Y 条，共 Z 条"
- **客户端分页**：无需服务器往返的快速导航

### ⏳ 消费者页面加载状态
改进用户体验：
- **加载指示器**：Topic 信息加载时开始按钮显示加载状态
- **禁用控制**：在 Topic 详情准备好之前阻止开始消费
- **错误处理**：Topic 信息加载失败时显示清晰的提示信息

### 🌍 国际化
完整的 i18n 覆盖：
- **新增翻译键**：为所有 v1.0.4 功能添加翻译
- **支持语言**：中文 (zh-CN) 和英文 (en-US)
- **分页标签**："显示第 X-Y 条，共 Z 条"、"每页"控制
- **监控标签**：告警中心、严重程度级别、操作按钮

### 🧪 测试
提升测试覆盖率：
- **143 个测试通过**：从 v1.0.3 的 132 个增加到 143 个
- **分页测试**：新增 11 个组件测试
- **监控测试**：全面的 MonitorService 测试

### 🐛 Bug 修复
- **内存警告按钮**：修复导出、忽略和关闭按钮操作
- **消费者开始按钮**：现在正确等待 Topic 信息加载完成后才启用
- **JSON 渲染**：长字符串不再溢出视图

---

## 📦 安装

### 下载
下载适合您平台的版本：
- macOS: `Kafkit_1.0.4_x64.dmg`
- Windows: `Kafkit_1.0.4_x64.msi`
- Linux: `kafkit_1.0.4_amd64.deb`

### 从源码构建
```bash
# 克隆仓库
git clone https://github.com/gaipianerclaw/kafkit.git
cd kafkit

# 检出发布版本
git checkout v1.0.4

# 安装依赖
cd kafkit && npm install

# 构建前端
npm run build

# 构建 Tauri 应用
cd ../src-tauri && cargo build --release
```

---

## 📝 API 变更

### 新增组件
- `<Pagination />` - 可复用的分页组件
- `<AlertCenter />` - 告警管理 UI
- `MonitorService` - 单例监控服务

### 修改的组件
- `<VirtualMessageList />` - 使用 react-window 重写
- `<ConsumerPage />` - 添加加载状态管理
- `<TopicListPage />` - 添加分页功能

---

## 🔧 配置

### 告警规则
在告警设置中配置告警阈值：
- 消费延迟：默认 1000 条消息
- 连接检查间隔：30 秒
- 冷却期：5 分钟

### 分页
默认每页条数选项：10、20、50、100 个 Topic

---

## 🐛 已知问题

- Schema Registry：Schema Evolution 等高级功能尚未实现
- 连接池：仅实现了 Producer 缓存，AdminClient 缓存待实现
- 虚拟滚动：展开消息时动态行高计算可能有轻微延迟

---

## 📊 性能

| 指标 | 优化前 | 优化后 | 提升 |
|------|--------|--------|------|
| 消息列表 (1万条) | ~5 FPS | ~60 FPS | 12倍 |
| 内存 (1万条消息) | ~800MB | ~300MB | 2.7倍 |
| Topic 列表 (1000个) | 加载 3秒 | 即时加载 | 节省 3秒+ |

---

## 🙏 贡献者

- @gaipianerclaw - 核心开发

---

## 🔗 链接

- [完整变更日志](https://github.com/gaipianerclaw/kafkit/compare/v1.0.3...v1.0.4)
- [文档](https://github.com/gaipianerclaw/kafkit/blob/main/V1.0.4_README.md)
- [Issues](https://github.com/gaipianerclaw/kafkit/issues)

---

**发布日期**: 2026-03-29
