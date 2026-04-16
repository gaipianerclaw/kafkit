# 更新日志

## v1.0.6 (2026-04-15)

### ✨ 新增功能

#### 消费者监控仪表盘 (Consumer Monitoring Dashboard)
- **全局统计卡片**: 实时显示总消费组数、健康状态分布(健康/警告/危险)、总 Lag 数量
- **Lag 趋势图**: 使用 Recharts 展示最近 10 分钟的消费延迟变化曲线
- **消费组列表**: 支持排序、筛选(按状态)、搜索(按 Group ID)
- **分区级详情**: 点击展开查看各 Topic-Partition 的详细 Lag 数据
- **自动刷新**: 10 秒间隔自动刷新，支持暂停/继续，页面隐藏时自动暂停
- **健康状态**: 根据 Lag 阈值自动分类 - 健康(<1000)、警告(1000-10000)、危险(>10000)

### 🐛 Bug 修复

#### Windows 10 安装问题
- **修复 MSI 安装失败**: 将 `webviewInstallMode` 从 `downloadBootstrapper` 改为 `skip`
- **前置要求**: Windows 用户需要预先安装 WebView2 Runtime

### 🔧 技术改进

- **新增图表库**: 使用 Recharts 实现数据可视化
- **性能优化**: 趋势数据仅保留最近 60 个点(10分钟)，内存占用 < 50MB
- **测试覆盖**: 新增 15+ 个单元测试，覆盖 formatters、hooks、组件
- **国际化**: 完整支持简体中文和英文

---

## v1.0.5 (2026-04-02)

### ✨ 新增功能

#### Producer File Mode（文件导入发送）
- **文件拖拽上传**: 支持拖拽文件到上传区域，自动识别文件格式
- **多格式支持**: JSON Array、JSON Lines、CSV/TSV 格式
- **字段映射**: CSV 格式自动检测列，支持 key/value/partition/headers 映射
- **时间戳修改**: 支持修改消息内容中的时间戳字段
- **发送策略**: 即时发送、TPS 控制、固定间隔三种模式
- **进度监控**: 实时显示发送进度，支持取消、继续、重新发送
- **压缩支持**: File Mode 支持 gzip/snappy/lz4/zstd 压缩
- **大文件处理**: 流式处理大文件（>100MB），分块读取避免内存溢出

#### 分区策略
- **三种策略**: 支持使用文件 partition、基于 Key 哈希、轮询三种分区策略
- **应用层轮询**: 自实现轮询算法，确保 Key 仍发送到 Kafka 但不影响分区选择
- **独立 Producer**: 不同策略使用独立 Producer 实例

#### Topic 管理
- **创建 Topic**: 在 Topic 面板中直接创建新 Topic，可设置分区数和副本因子
- **删除 Topic**: 右键菜单删除 Topic（需输入确认）

#### 新的 Tab 交互
- **点击 Topic**: 创建预览 Tab（眼睛图标）
- **双击 Topic**: 创建消费者 Tab
- **Tab 状态保留**: 切换 Tab 时保留状态（使用 visibility 而非 display:none）

#### 页面导航修复
- **设置页面**: 恢复设置页面功能
- **连接管理**: 恢复连接管理页面功能
- **消费者组**: 恢复消费者组页面功能

### 🐛 Bug 修复

- **修复 CSV 导入问题**: 正确解析消费者页面导出的 CSV 文件，识别 key/value 列
- **修复文件拖拽**: Tauri 桌面应用支持文件拖拽上传
- **修复进度计算**: 每条消息发送后都更新进度显示
- **修复 Tab 状态**: 切换连接时清除所有 Tab

### 🔧 技术改进

- **新增 Hook**: `useTauriFileDrop` - Tauri 文件拖拽事件处理
- **新增 Rust 命令**: `read_file` - 读取本地文件内容
- **流式文件解析**: `streamFileParser.ts` - 支持大文件分块读取
- **测试覆盖**: 新增 14 个 File Mode 相关测试

### 🗑️ 移除内容

- **Script Mode 移除**: 因复杂度高、调试困难，移除脚本模式
- **移除依赖**: quickjs-emscripten、monaco-editor、cron-parser、uuid

---

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
