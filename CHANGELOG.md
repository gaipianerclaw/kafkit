# 更新日志

## v1.0.3 (2026-03-26)

### 🚀 性能优化

#### 虚拟滚动
- **消息列表虚拟化**: 消费消息使用虚拟列表渲染，大幅提升大消息量性能
- **内存管理**: 添加消息数量上限（10000条），超过时自动清理早期消息
- **内存警告**: 消息数量超过 5000 条时显示警告，提示用户导出到文件

### 🗃️ Schema Registry 支持

#### 配置管理
- **多 Registry 支持**: 可配置多个 Schema Registry 地址
- **连接测试**: 添加前验证连接可用性
- **认证支持**: 支持 Basic Auth 和 Bearer Token

#### 消息解析
- **Confluent Wire Format**: 自动解析 5-byte prefix 提取 Schema ID
- **Avro/Protobuf 集成**: 从 Registry 获取 Schema 并显示 Subject/版本
- **LRU 缓存**: 缓存 Schema 到 localStorage，减少 API 调用

#### UI 界面
- **Schema 浏览器**: 在设置页面浏览所有 Subject 和版本
- **类型标签**: Avro/Protobuf/JSON 不同类型显示不同颜色标签
- **实时解析**: 消费消息时自动识别并解析 Schema

### 🛡️ 错误处理增强

#### 友好错误提示
- **Kafka 错误码映射**: 将技术错误码转换为中文/英文友好提示
- **错误解决建议**: 为常见错误提供具体的解决方案
- **可重试错误识别**: 网络超时等临时错误支持一键重试

#### 新增错误类型支持
- NetworkException - 网络连接失败
- UnknownTopicOrPartition - Topic 不存在
- NotLeaderForPartition - Leader 选举中
- AuthorizationFailed - 认证失败
- SSLHandshakeFailed - SSL 握手失败
- TimeoutException - 请求超时

### 🐛 Bug 修复

- **修复页面滚动问题**: 为 Topic 详情等页面添加 `h-full min-h-0`，确保配置参数可滚动查看

### 🧪 测试增强

- **测试覆盖提升**: 从 54% 提升到 58%（+4%）
- **新增 23 个测试**: Schema Registry 服务完整测试覆盖
- **测试总数**: 118 个测试全部通过
- **localStorage Mock**: 添加测试环境支持

### 🔧 技术改进

- **组件化**: 将消息列表拆分为独立组件，提升代码可维护性
- **国际化**: 完善错误处理和内存警告的翻译支持
- **代码修复**: 修复 search.ts 正则表达式匹配逻辑

---

## v1.0.2 (2026-03-26)

### ✨ 新增功能

#### 消息生产
- **单条发送**: 支持指定 partition 和 key，发送文本/JSON/CSV 格式消息
- **批量发送**: 每行一条消息批量发送，自动处理失败重试
- **定时发送**: 支持配置批次大小、发送间隔、重复次数，带实时进度条

#### 消息消费
- **全新消费界面**: 表头展示（序号、分区、Offset、时间戳、Key、Value 预览）
- **消息详情**: 展开显示完整元信息（Offset、Partition、Timestamp、Key、Size、Type）
- **多种格式支持**: JSON 语法高亮、CSV 表格渲染、纯文本保留格式
- **消费参数配置**: 支持 Latest / Earliest / Timestamp / Offset 起始位置
- **时间选择器**: 快速选择（现在/1小时前/今天零点/昨天）
- **消费模式**: 程序预览 / 保存到文件（JSON/JSON Lines/CSV）
- **消息导出**: 支持导出为 JSON 或 CSV 格式
- **消息搜索**: 支持在已消费消息中搜索（支持大小写敏感选项）

#### 消费者组管理
- **消费组列表**: 查看所有 Consumer Group 及其状态（Stable/PreparingRebalance/CompletingRebalance/Dead）
- **成员信息**: 显示成员数量、协调器信息
- **消费延迟(Lag)**: 查看每个消费组在各 Topic-Partition 上的消费进度
  - 显示 Current Offset、Log End Offset、Lag
  - Lag 超过 1000 时高亮显示警告
  - 计算总 Lag 数量
- **偏移量重置**: 支持重置到 Earliest、Latest、指定 Offset（按 Partition 或整个 Topic）

#### Topic 管理增强
- **创建 Topic**: 支持指定分区数和副本因子，单节点集群智能提示
- **删除 Topic**: 带确认对话框，需输入 Topic 名称确认
- **配置管理**: 查看和编辑 Topic 配置参数（retention.ms、cleanup.policy 等）
- **分区详情**: 查看 Leader、Replicas、ISR、Offset 范围、消息数量

### 🔒 安全认证

#### 支持的协议
- **PLAINTEXT**: 无加密，适用于内网/开发环境
- **SSL**: TLS 加密，支持 CA 证书、客户端证书、密钥
- **SASL_PLAINTEXT**: SASL 认证（PLAIN/SCRAM-SHA-256/SCRAM-SHA-512/GSSAPI）
- **SASL_SSL**: SASL + TLS 双重安全

#### 证书管理
- 支持上传 CA 证书、客户端证书、客户端密钥
- 支持禁用主机名验证（用于自签名证书测试环境）

### 🐛 Bug 修复

- **修复页面滚动问题**: 为所有页面添加 `h-full min-h-0`，确保配置参数等内容可滚动查看
- **修复编辑连接问题**: 使用 `getConnection` API 直接获取连接详情
- **修复删除确认问题**: 使用自定义确认对话框替代原生 `confirm()`
- **修复 SASL_SSL 证书配置**: 为 `SaslPlain` 和 `SaslScram` 添加 SSL 证书字段
- **修复消息消费失败**: 添加 rdkafka 压缩支持（gzip, lz4, zstd）
- **修复 Consumer Group 闪退**: 升级 rdkafka 从 0.36.0 到 0.37.0

### 🔧 技术改进

- **Kafka 客户端**: 从 `kafka` 切换到 `rdkafka` (v0.37.0)
- **连接池**: 实现 Producer 和 Consumer 连接池
- **国际化**: 完整支持简体中文和英文
- **深色模式**: 支持浅色/深色/跟随系统

### 🧪 测试环境

- **docker/kafka-ssl**: 多协议测试环境（PLAINTEXT/SSL/SASL_PLAINTEXT/SASL_SSL）
- **自动生成证书**: 包含 CA 证书、服务器密钥库、信任库
- **预设测试用户**: admin/alice/bob，支持 PLAIN 和 SCRAM 认证

---

## v1.0.0 (2025-03-13)

### 初始版本
- Kafka 连接管理
- Topic 列表查看
- 基础 TCP 连接测试
- 支持 PLAINTEXT 协议
