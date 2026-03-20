# 更新日志

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
