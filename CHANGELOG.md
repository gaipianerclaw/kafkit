# Changelog

## [1.0.1] - 2026-03-18

### 🐛 Bug 修复

- **修复桌面端空白页面问题**
  - 问题原因：前端代码直接静态导入 Tauri API，在 Tauri 环境加载失败时导致应用崩溃
  - 解决方案：为所有调用 Tauri 的文件添加环境检测和动态导入机制
    - `stores/connectionStore.ts`
    - `pages/Topics/TopicListPage.tsx`
    - `pages/Topics/TopicDetailPage.tsx`
    - `pages/Producer/ProducerPage.tsx`
    - `pages/Groups/GroupListPage.tsx`
    - `pages/Consumer/ConsumerPage.tsx`
  - 应用现在能根据环境自动切换真实服务或 Mock 服务

---

## [1.0.0] - 2026-03-13

### 🎉 初始版本发布

Kafkit 是一个跨平台的 Kafka 桌面客户端工具，为开发者和运维人员提供直观的 Kafka 集群管理能力。

### ✨ 功能特性

#### 连接管理
- 支持多集群配置管理
- 连接信息加密存储（系统密钥链 + AES-256）
- 支持 5 种认证方式：
  - PLAINTEXT (无认证)
  - SASL/PLAIN
  - SASL/SCRAM-SHA-256/512
  - SASL/GSSAPI (Kerberos)
  - SSL/TLS

#### Topic 管理
- Topic 列表展示（支持搜索）
- Topic 详细信息查看（分区、副本、配置）
- 创建 Topic
- 删除 Topic

#### 消息消费
- 实时流式消息消费
- 历史消息分页查看
- 按分区消费
- 消息格式化（JSON/文本自动检测）
- 消息导出功能

#### 消息生产
- 单条消息发送
- 批量消息发送（支持速率控制）
- 支持设置 Partition 和 Key
- 支持消息 Headers

#### Consumer Group 管理
- Consumer Group 列表
- 消费 Lag 监控
- Group 状态查看

#### UI 特性
- 响应式布局设计
- 深色/浅色主题支持
- 快捷键支持
- 跨平台原生体验

### 🔧 技术栈

- **前端**: React 18 + TypeScript + Tailwind CSS
- **后端**: Rust + Tauri 2.0
- **Kafka 客户端**: rdkafka (librdkafka 绑定)

### 📦 支持平台

- macOS 11.0+ (Intel & Apple Silicon)
- Windows 10 1809+ (x64)
- Linux Ubuntu 20.04+ (x64)

### 🧪 测试

- 前端单元测试: 42 个测试全部通过
- 后端单元测试: 13 个测试函数
- 测试覆盖率: 核心模块 100%

---

## 版本规划

### v1.1.0 (计划中)
- Avro/Protobuf 格式支持
- Schema Registry 集成
- 消息搜索和过滤
- 消费偏移量重置

### v1.2.0 (计划中)
- Kafka Connect 管理
- 监控图表
- 告警功能
- 配置导入/导出

### v1.3.0 (计划中)
- 多语言支持
- 插件系统
- 性能优化
