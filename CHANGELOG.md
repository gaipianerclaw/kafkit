# 更新日志

## v1.0.12 (2026-03-20)

### 🐛 Bug 修复

#### 连接管理功能修复
- **修复编辑连接问题**: 使用 `getConnection` API 直接获取连接详情，避免依赖 store 缓存
- **修复删除确认问题**: 使用自定义确认对话框替代原生 `confirm()`，解决 Tauri 环境下非阻塞执行导致提前删除的问题
- **修复导入/导出按钮国际化**: 添加缺失的 `connections.import`、`connections.export` 等翻译键
- **修复 ConnectionFormPage 重复渲染**: 添加 `hasLoaded` 状态防止 useEffect 重复调用

#### SSL/SASL_SSL 连接修复
- **修复 SASL_SSL 证书配置**: 为 `SaslPlain` 和 `SaslScram` 认证类型添加可选的 SSL 证书字段
- **添加主机名验证选项**: 支持禁用主机名验证（用于自签名证书测试环境）
- **后端 SSL 配置修复**: 统一处理 SSL 和 SASL_SSL 协议的证书配置逻辑

#### Kafka Consumer 修复
- **修复消息消费失败问题**: 添加 rdkafka 压缩支持（gzip, lz4, zstd），解决 "NotImplemented" 错误
- **Cargo.toml**: 添加 `zstd` 和 `external-lz4` 特性

#### Topic 管理修复
- **添加副本因子提示**: 创建 Topic 时显示提示"单节点 Kafka 只能设置为 1"

#### i18n 修复
- **Consumer 页面**: 修复 JSX 表达式错误（`t('...')` → `{t('...')}`）
- **添加缺失翻译**: 消费组、消费者配置、时间选择器、SSL 证书等组件的翻译键

### 🔧 优化改进

#### 开发体验
- **关闭自动开发者工具**: 开发模式下不再自动打开控制台，可通过快捷键手动打开（Cmd+Option+I / Ctrl+Shift+I）

#### UI 优化
- **Consumer 页面布局**: 修复窄屏幕下头部控件被截断的问题，使用 `flex-wrap` 实现自适应布局

### 🧪 测试环境

#### Kafka 多协议测试环境
- **新增 docker/kafka-ssl**: 支持 PLAINTEXT、SSL、SASL_PLAINTEXT、SASL_SSL 四种连接方式
- **自动生成 SSL 证书**: 包含 CA 证书、服务器密钥库、信任库
- **预设测试用户**: admin/alice/bob，支持 PLAIN 和 SCRAM 认证

---

## v1.0.11 (2026-03-20)

### 🔧 CI/CD 修复

#### GitHub Actions 构建修复
- **修复 Rust action 名称错误**: `dtolnay/rust-action` → `dtolnay/rust-toolchain@stable`
- **修复 Ubuntu 依赖**: `libwebkit2gtk-4.0-dev` → `libwebkit2gtk-4.1-dev` (Tauri v2 要求)
- **添加缺失依赖**: `libssl-dev` 用于 OpenSSL 静态链接
- **更新版本号**: 统一更新到 1.0.2 (package.json, Cargo.toml, tauri.conf.json)
- **支持平台**: macOS (Intel/Apple Silicon), Linux (x64), Windows (x64)

---

## v1.0.10 (2026-03-20)

### 🐛 Bug 修复

#### Consumer Group 功能修复
- **问题**: rdkafka 0.36 的 `fetch_group_list` API 存在内存安全问题，导致程序闪退
- **错误信息**: `unsafe precondition(s) violated: slice::from_raw_parts requires the pointer to be aligned and non-null`
- **解决**: 升级 rdkafka 从 0.36.0 到 0.37.0，修复了内存安全问题
- **结果**: 消费组功能恢复正常，可以查看消费组列表和成员信息

### 注意事项
- 消费延迟(Lag)查询可能返回 `UnknownGroup` 错误（如果消费组临时不存在）
- Offset 重置功能目前仅计算目标 offset，实际重置需要额外实现

---

## v1.0.9 (2026-03-20)

### 🐛 Bug 修复

#### Consumer Group 闪退修复
- 修复点击消费者组功能后程序闪退的问题
- 后端: 添加更健壮的错误处理，`fetch_group_list` 失败时返回空数组而非 panic
- 后端: 标准化消费组状态字符串，避免前端类型不匹配
- 前端: 添加空值检查，处理 `groups` 和 `lagData` 可能为 undefined 的情况
- 前端: 添加错误状态显示，当获取消费组失败时显示错误信息
- 前端: 使用可选链操作符访问对象属性，防止访问 null/undefined 属性

---

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
