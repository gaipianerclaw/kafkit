# 更新日志

## v1.0.8 (2026-03-20)

### ✨ 新增功能

#### Consumer Group 管理功能
- **消费组列表**: 查看所有 Consumer Group 及其状态
  - 显示 Group ID、状态(Stable/PreparingRebalance/CompletingRebalance/Dead)
  - 显示成员数量和协调器信息
- **消费延迟(Lag)查看**: 
  - 查看每个消费组在各 Topic-Partition 上的消费进度
  - 显示 Current Offset、Log End Offset、Lag
  - Lag 超过 1000 时高亮显示警告
  - 计算总 Lag 数量
- **偏移量重置**(部分实现):
  - 支持重置到 Earliest、Latest、指定 Offset
  - 支持按 Partition 重置或重置整个 Topic
  - 计算目标 Offset(实际重置需要额外配置)

### 🔧 技术实现
- 后端实现 `list_consumer_groups` - 使用 `fetch_group_list` API
- 后端实现 `get_consumer_lag` - 结合 `committed_offsets` 和 `fetch_watermarks`
- 后端实现 `reset_consumer_offset` - 计算目标 Offset
- 前端页面 `GroupListPage` - 左右分栏布局，左侧 Group 列表，右侧 Lag 详情

---

## v1.0.7 (2026-03-20)

### ✨ 新增功能

#### 消息生产功能实现
- **真实消息发送**: 使用 rdkafka FutureProducer 实现真正的 Kafka 消息发送
- **单条发送**: 支持指定 partition 和 key，可发送文本/JSON/CSV 格式
- **批量发送**: 支持每行一条消息批量发送，自动处理发送失败
- **定时发送**: 新增定时发送模式，支持配置：
  - 批次大小：每次发送的消息数量
  - 发送间隔：毫秒级控制发送频率
  - 重复次数：自动重复发送多轮
  - 实时进度条：显示发送进度和统计信息
- **Producer 连接池**: 缓存 producer 连接，提高发送性能

### 🔧 技术改进
- 添加 Producer 连接池管理（`producers: Mutex<HashMap<String, FutureProducer>>`）
- 实现 `get_producer`、`produce_message`、`produce_batch` 方法
- 更新 commands.rs 调用真实实现
- 更新前端 ProducerPage，添加三种发送模式

---

## v1.0.6 (2026-03-20)

### ✨ 功能增强

#### 删除 Topic 安全确认
- 新增删除确认对话框，要求用户手动输入 Topic 名称
- 只有输入完全匹配的 Topic 名称后，删除按钮才可用
- 添加醒目的警告提示，说明删除操作的不可逆性
- 删除按钮使用红色样式，增加视觉警示效果

---

## v1.0.5 (2026-03-20)

### 🐛 Bug 修复

#### 删除 Topic 确认对话框修复
- 修复了删除 Topic 时未等待用户确认就立即删除的问题
- 使用 Tauri dialog API 替代原生 confirm，提供更原生的体验
- 添加事件阻止，防止事件冒泡导致意外触发
- 添加降级方案，在 dialog 插件不可用时使用原生 confirm

---

## v1.0.4 (2026-03-20)

### 🐛 Bug 修复

#### 创建/删除 Topic 功能修复
- 修复了创建 Topic 不生效的问题（之前只有 TODO 占位符）
- 修复了删除 Topic 不生效的问题
- 使用 rdkafka AdminClient 实现真实的 Topic 管理操作
- 添加详细的操作日志便于排查问题

---

## v1.0.3 (2026-03-20)

### 🎨 品牌更新

#### 全新 Logo
- 更新应用程序图标设计
- Dock 栏图标比例优化，与其他应用保持一致
- 图标四角改为透明圆角样式
- 优化图标边距，视觉效果更加协调

#### 页面 Logo 统一
- 侧边栏 Logo 从图标替换为品牌图片
- 浏览器 favicon 更新为最新 logo
- 新增 `public/logo.png` 作为页面资源

### 🔧 构建配置
- 修复 Tauri bundle 配置中缺失的 `icon` 字段
- 清理无用图标文件（Windows Store、iOS、Android 专用图标）
- 仅保留 macOS、Windows、Linux 三个平台所需图标

---

## v1.0.2 (2026-03-19)

### ✨ 新增功能

#### 1. 消息消费界面大改版
- 全新设计的消费者界面，支持表头展示（序号、分区、Offset、时间戳、Key、Value预览）
- 消息展开后显示完整元信息（Offset、Partition、Timestamp、Key、Size、Type）
- 支持消息复制功能

#### 2. 多种消息格式支持
- JSON 格式：语法高亮展示，支持对象/数组折叠
- CSV 格式：自动检测并渲染为表格
- 纯文本：保留原始格式展示

#### 3. 消费参数配置
- 起始位置选择：Latest / Earliest / Timestamp / Offset
- 时间选择器：支持快速选择（现在/1小时前/今天零点/昨天）
- 消费模式：程序预览 / 保存到文件
- 文件格式：JSON 数组 / JSON Lines / CSV

#### 4. Topic 切换
- 消费者界面可直接切换其他 Topic
- 切换时自动停止当前消费并清空消息

#### 5. 消息导出
- 支持导出为 JSON 或 CSV 格式
- 使用系统文件对话框选择保存位置

### 🐛 Bug 修复
- 修复时间戳消费不生效的问题（正确实现 `offsets_for_times` 查询）
- 修复时间选择器时区问题
- 修复消息计数显示不及时的问题
- 修复停止消费按钮可能无效的问题
- 修复返回按钮在消费时不停止消费的问题

### 🔧 优化改进
- 时间戳显示格式统一为 `yyyy-MM-dd HH:mm:ss.SSS`
- 展开消息显示原始毫秒时间戳
- Topic 列表页返回时不重复刷新
- 添加更多调试日志便于排查问题

---

## v1.0.1 (2025-03-19)

### 🔧 架构变更

#### Kafka 客户端库更换
- **从**: `kafka` (纯 Rust 实现)
- **到**: `rdkafka` (librdkafka 绑定)
- **原因**: 
  - 支持 SSL、SASL 等安全协议
  - 提供更完整的 Kafka 协议实现
  - 性能更好，稳定性更高

**依赖变更 (Cargo.toml)**:
```toml
# 旧
kafka = { version = "0.10", default-features = false, features = ["snappy"] }

# 新
rdkafka = { version = "0.36", default-features = false, features = ["cmake-build", "libz-static", "ssl-vendored"] }
```

### ✨ 新增功能

#### 1. 安全认证支持
- PLAINTEXT
- SSL (支持 CA 证书、客户端证书、密钥)
- SASL_PLAINTEXT (PLAIN, SCRAM-SHA-256/512, GSSAPI)
- SASL_SSL

#### 2. 国际化 (i18n)
- 支持简体中文和英文
- 自动检测系统语言
- 支持手动切换语言
- 语言设置持久化

#### 3. 深色模式
- 浅色/深色/跟随系统 三种主题
- 使用 Tailwind CSS dark mode
- 主题设置持久化

#### 4. 新建 Topic
- 支持指定分区数和副本因子
- 对话框交互方式

#### 5. UI 优化
- Topic 列表加载时显示 loading 动画
- 刷新按钮修复重复 icon 问题
- 表格加载时显示遮罩层

### 🐛 Bug 修复
- 修复刷新按钮显示两个旋转图标的问题
- 修复 Topic 列表加载时没有 loading 状态的问题
- 修复新建 Topic 按钮不生效的问题

### 📁 新增文件

```
src/
├── i18n/
│   ├── index.ts              # i18n 配置
│   └── locales/
│       ├── zh-CN.json        # 中文翻译
│       └── en-US.json        # 英文翻译
├── contexts/
│   └── ThemeContext.tsx      # 主题上下文
└── pages/
    └── Settings/
        └── SettingsPage.tsx  # 设置页面
```

### 📦 构建优化
- 静态链接 zlib (libz-static)
- 静态链接 OpenSSL (ssl-vendored)
- 静态链接 librdkafka (cmake-build)
- macOS 构建产物无需额外依赖

### 🔥 Breaking Changes
无

---

## v1.0.0 (2025-03-13)

### 初始版本
- Kafka 连接管理
- Topic 列表查看
- 基础 TCP 连接测试
- 支持 PLAINTEXT 协议
