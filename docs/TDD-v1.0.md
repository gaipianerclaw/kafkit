# 技术设计文档 (TDD)

## Kafkit - 跨平台 Kafka 桌面连接工具

---

| 属性 | 内容 |
|------|------|
| 版本 | 1.0 |
| 日期 | 2026-03-13 |
| 状态 | 草案 |
| 依据 | SRS v1.0 |

---

## 1. 架构设计

### 1.1 总体架构

Kafkit 采用分层架构，基于 Tauri 框架构建：

```
┌─────────────────────────────────────────────────────────────┐
│                        前端层 (Frontend)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  React 18   │  │  React      │  │  UI Components      │  │
│  │  (TypeScript)│  │  Router     │  │  (Headless UI)      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Zustand    │  │  React      │  │  Tailwind CSS       │  │
│  │  (State)    │  │  Query      │  │  (Styling)          │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │ Tauri IPC (JSON)
┌───────────────────────────▼─────────────────────────────────┐
│                      后端层 (Backend)                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                 Tauri Runtime                        │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │   │
│  │  │  Commands   │  │  Events     │  │  Window     │  │   │
│  │  │  (Invoke)   │  │  (Emit)     │  │  Management │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                 Domain Layer                         │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │   │
│  │  │  Connection │  │   Topic     │  │  Consumer   │  │   │
│  │  │  Service    │  │   Service   │  │   Service   │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │   │
│  │  │  Producer   │  │   Group     │  │  Security   │  │   │
│  │  │  Service    │  │   Service   │  │   Service   │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                 Infrastructure Layer                 │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │   │
│  │  │  rdkafka    │  │   Encrypted │  │   Logger    │  │   │
│  │  │  (Client)   │  │    Store    │  │             │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 模块依赖关系

```
                    ┌─────────────┐
                    │   Frontend  │
                    └──────┬──────┘
                           │ IPC
                    ┌──────▼──────┐
                    │   Tauri     │
                    │   Runtime   │
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐        ┌────▼────┐        ┌────▼────┐
   │ ConnSvc │        │ TopicSvc│        │ GroupSvc│
   └────┬────┘        └────┬────┘        └────┬────┘
        │                  │                  │
   ┌────▼────┐        ┌────▼────┐        ┌────▼────┐
   │Consumer │        │Producer │        │ Security│
   │  Svc    │        │  Svc    │        │  Svc    │
   └────┬────┘        └────┬────┘        └────┬────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
         ┌────▼────┐  ┌────▼────┐  ┌────▼────┐
         │rdkafka  │  │ Encrypted│  │  Config │
         │ Client  │  │  Store   │  │  File   │
         └─────────┘  └─────────┘  └─────────┘
```

---

## 2. 技术栈选型

### 2.1 前端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.x | UI 框架 |
| TypeScript | 5.x | 类型安全 |
| Vite | 5.x | 构建工具 |
| Tailwind CSS | 3.x | 样式系统 |
| Headless UI | 1.x | 无样式组件 |
| Zustand | 4.x | 状态管理 |
| React Query | 5.x | 服务端状态管理 |
| React Router | 6.x | 路由管理 |
| Lucide React | - | 图标库 |
| date-fns | 3.x | 日期处理 |

### 2.2 后端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Tauri | 2.x | 桌面应用框架 |
| Rust | 1.75+ | 系统语言 |
| rdkafka | 0.36+ | Kafka 客户端 |
| serde | 1.x | 序列化 |
| tokio | 1.x | 异步运行时 |
| keyring | 2.x | 系统密钥链 |
| aes-gcm | 0.10+ | 加密算法 |
| tracing | 0.1+ | 日志框架 |

### 2.3 选型理由

**为什么选择 Tauri 而非 Electron？**
1. **体积**: Tauri 产物 ~5MB vs Electron ~100MB+
2. **内存**: Tauri 内存占用更低
3. **安全**: Rust 内存安全，减少安全漏洞
4. **性能**: 原生性能，启动更快

**为什么选择 rdkafka？**
1. 功能最完整（支持所有 Kafka 认证方式）
2. 性能优秀（基于 librdkafka C 库）
3. 社区活跃，文档完善

---

## 3. 存储设计

### 3.1 配置存储结构

配置文件路径（加密存储）：
- macOS: `~/Library/Application Support/com.kafkit.app/config.enc`
- Windows: `%APPDATA%/kafkit/config.enc`
- Linux: `~/.config/kafkit/config.enc`

### 3.2 数据结构

**主配置结构 (JSON，加密存储)**:

```json
{
  "version": "1.0",
  "connections": [
    {
      "id": "uuid-v4",
      "name": "Production Cluster",
      "bootstrap_servers": ["kafka1:9092", "kafka2:9092"],
      "auth": {
        "type": "SaslScram",
        "mechanism": "SCRAM-SHA-256",
        "username": "admin"
        // password 存储在系统密钥链
      },
      "security": {
        "protocol": "SASL_SSL",
        "ssl_ca_location": "/path/to/ca.crt",
        "ssl_verify_hostname": true
      },
      "options": {
        "request_timeout_ms": 30000,
        "metadata_max_age_ms": 300000
      },
      "created_at": "2026-03-13T10:00:00Z",
      "updated_at": "2026-03-13T10:00:00Z"
    }
  ],
  "settings": {
    "theme": "dark",
    "language": "zh-CN",
    "default_page_size": 100,
    "auto_check_update": true
  }
}
```

**凭证存储（系统密钥链）**:
- Service: `com.kafkit.app`
- Account: `connection:{connection_id}:{field}`
- 示例: `connection:uuid-v4:password`

### 3.3 加密方案

**加密算法**: AES-256-GCM
**密钥派生**: Argon2id
**密钥来源**: 
- 主密钥由用户首次启动时设置的密码派生
- 或使用系统提供的安全存储（如果可用）

---

## 4. 接口定义 (Tauri Commands)

### 4.1 连接管理接口

```rust
// 获取所有连接配置（不包含敏感信息）
#[tauri::command]
async fn get_connections() -> Result<Vec<ConnectionSummary>, AppError>;

// 获取单个连接详情
#[tauri::command]
async fn get_connection(id: String) -> Result<Connection, AppError>;

// 测试连接
#[tauri::command]
async fn test_connection(config: ConnectionConfig) -> Result<ConnectionTestResult, AppError>;

// 创建连接
#[tauri::command]
async fn create_connection(config: ConnectionConfig) -> Result<Connection, AppError>;

// 更新连接
#[tauri::command]
async fn update_connection(id: String, config: ConnectionConfig) -> Result<Connection, AppError>;

// 删除连接
#[tauri::command]
async fn delete_connection(id: String) -> Result<(), AppError>;
```

### 4.2 Topic 管理接口

```rust
// 列出所有 Topic
#[tauri::command]
async fn list_topics(connection_id: String) -> Result<Vec<TopicInfo>, AppError>;

// 获取 Topic 详情
#[tauri::command]
async fn get_topic_detail(connection_id: String, topic: String) -> Result<TopicDetail, AppError>;

// 创建 Topic
#[tauri::command]
async fn create_topic(
    connection_id: String,
    name: String,
    num_partitions: i32,
    replication_factor: i32,
    configs: Option<HashMap<String, String>>,
) -> Result<(), AppError>;

// 删除 Topic
#[tauri::command]
async fn delete_topic(connection_id: String, topic: String) -> Result<(), AppError>;

// 获取 Topic 配置
#[tauri::command]
async fn get_topic_configs(connection_id: String, topic: String) -> Result<Vec<ConfigEntry>, AppError>;
```

### 4.3 消息消费接口

```rust
// 开始消费（流式，通过 Event 返回数据）
#[tauri::command]
async fn start_consuming(
    connection_id: String,
    topic: String,
    partition: Option<i32>,
    start_offset: Option<OffsetSpec>, // Latest, Earliest, Timestamp, Position
    window: Window, // 用于发送事件
) -> Result<String, AppError>; // 返回 consumer session id

// 停止消费
#[tauri::command]
async fn stop_consuming(session_id: String) -> Result<(), AppError>;

// 获取历史消息（分页）
#[tauri::command]
async fn fetch_messages(
    connection_id: String,
    topic: String,
    partition: i32,
    offset: i64,
    limit: i32,
) -> Result<MessagePage, AppError>;

// 获取分区偏移量信息
#[tauri::command]
async fn get_partition_offsets(
    connection_id: String,
    topic: String,
    partition: i32,
) -> Result<PartitionOffsets, AppError>;
```

### 4.4 消息生产接口

```rust
// 发送单条消息
#[tauri::command]
async fn produce_message(
    connection_id: String,
    topic: String,
    message: ProduceMessage,
) -> Result<ProduceResult, AppError>;

// 批量发送消息
#[tauri::command]
async fn produce_batch(
    connection_id: String,
    topic: String,
    messages: Vec<ProduceMessage>,
    options: BatchProduceOptions,
) -> Result<BatchProduceResult, AppError>;
```

### 4.5 Consumer Group 接口

```rust
// 列出所有 Consumer Groups
#[tauri::command]
async fn list_consumer_groups(connection_id: String) -> Result<Vec<ConsumerGroupInfo>, AppError>;

// 获取 Group 详情
#[tauri::command]
async fn get_consumer_group_detail(
    connection_id: String,
    group_id: String,
) -> Result<ConsumerGroupDetail, AppError>;

// 获取 Group 的消费进度
#[tauri::command]
async fn get_consumer_lag(
    connection_id: String,
    group_id: String,
) -> Result<Vec<PartitionLag>, AppError>;

// 重置消费偏移量
#[tauri::command]
async fn reset_consumer_offset(
    connection_id: String,
    group_id: String,
    topic: String,
    partition: Option<i32>, // None 表示所有分区
    reset_to: OffsetResetSpec, // Earliest, Latest, Timestamp, Offset
) -> Result<(), AppError>;
```

### 4.6 数据结构定义

```rust
// ================= 连接相关 =================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionSummary {
    pub id: String,
    pub name: String,
    pub bootstrap_servers: Vec<String>,
    pub auth_type: AuthType,
    pub is_connected: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Connection {
    pub id: String,
    pub name: String,
    pub bootstrap_servers: Vec<String>,
    pub auth: AuthConfig,
    pub security: SecurityConfig,
    pub options: ConnectionOptions,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum AuthConfig {
    None,
    SaslPlain { username: String, password: String },
    SaslScram { mechanism: ScramMechanism, username: String, password: String },
    SaslGssapi { principal: String, keytab_path: Option<String>, service_name: String },
}

// ================= Topic 相关 =================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TopicInfo {
    pub name: String,
    pub partition_count: i32,
    pub replication_factor: i32,
    pub is_internal: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TopicDetail {
    pub name: String,
    pub partitions: Vec<PartitionInfo>,
    pub configs: Vec<ConfigEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PartitionInfo {
    pub partition: i32,
    pub leader: i32,
    pub replicas: Vec<i32>,
    pub isr: Vec<i32>,
    pub earliest_offset: i64,
    pub latest_offset: i64,
    pub message_count: i64,
}

// ================= 消息相关 =================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KafkaMessage {
    pub partition: i32,
    pub offset: i64,
    pub timestamp: Option<i64>,
    pub key: Option<String>,
    pub value: String,
    pub headers: Vec<(String, String)>,
    pub size: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProduceMessage {
    pub partition: Option<i32>,
    pub key: Option<String>,
    pub value: String,
    pub headers: Option<HashMap<String, String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProduceResult {
    pub partition: i32,
    pub offset: i64,
    pub timestamp: i64,
}

// ================= Consumer Group 相关 =================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConsumerGroupInfo {
    pub group_id: String,
    pub state: String, // Unknown, PreparingRebalance, CompletingRebalance, Stable, Dead
    pub member_count: i32,
    pub coordinator: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PartitionLag {
    pub topic: String,
    pub partition: i32,
    pub current_offset: i64,
    pub log_end_offset: i64,
    pub lag: i64,
}
```

---

## 5. 关键模块设计

### 5.1 连接管理模块

```rust
// src-tauri/src/services/connection_service.rs

use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use rdkafka::producer::FutureProducer;
use rdkafka::consumer::StreamConsumer;

/// 连接池管理器
pub struct ConnectionManager {
    /// 配置存储
    store: Arc<dyn ConnectionStore>,
    /// 活跃的 Kafka 客户端连接
    clients: RwLock<HashMap<String, KafkaClient>>,
}

/// Kafka 客户端封装
pub struct KafkaClient {
    connection_id: String,
    producer: Option<FutureProducer>,
    admin_client: AdminClient,
    // 消费会话单独管理
}

impl ConnectionManager {
    /// 获取或创建客户端连接
    pub async fn get_client(&self, connection_id: &str) -> Result<Arc<KafkaClient>, AppError>;
    
    /// 关闭连接
    pub async fn close_connection(&self, connection_id: &str);
    
    /// 测试连接配置
    pub async fn test_config(&self, config: &ConnectionConfig) -> Result<(), AppError>;
}
```

### 5.2 消息消费模块

```rust
// src-tauri/src/services/consumer_service.rs

use rdkafka::consumer::{Consumer, StreamConsumer};
use rdkafka::Message;
use tokio::sync::mpsc;

/// 消费会话管理
pub struct ConsumerSession {
    pub id: String,
    pub connection_id: String,
    pub topic: String,
    pub partition: Option<i32>,
    cancel_tx: mpsc::Sender<()>,
}

/// 消费服务
pub struct ConsumerService {
    connection_manager: Arc<ConnectionManager>,
    sessions: RwLock<HashMap<String, ConsumerSession>>,
    event_emitter: Arc<dyn EventEmitter>,
}

impl ConsumerService {
    /// 启动消费会话
    pub async fn start_consuming(
        &self,
        connection_id: String,
        topic: String,
        partition: Option<i32>,
        start_offset: OffsetSpec,
    ) -> Result<String, AppError> {
        // 1. 创建消费者
        // 2. 订阅主题或分配分区
        // 3. 启动异步消费任务
        // 4. 通过 Tauri Event 向前端发送消息
    }
    
    /// 停止消费会话
    pub async fn stop_consuming(&self, session_id: &str) -> Result<(), AppError>;
    
    /// 获取历史消息
    pub async fn fetch_messages(
        &self,
        connection_id: String,
        topic: String,
        partition: i32,
        offset: i64,
        limit: i32,
    ) -> Result<Vec<KafkaMessage>, AppError>;
}
```

**消费消息流**:

```
Frontend                        Backend                    Kafka
   │                              │                         │
   │  1. start_consuming()        │                         │
   │─────────────────────────────>│                         │
   │                              │  2. create consumer     │
   │                              │  3. subscribe/assign    │
   │                              │                         │
   │                              │  4. start poll loop     │
   │                              │<────────────────────────│
   │                              │  5. receive messages    │
   │                              │                         │
   │  6. emit('kafka-message')    │                         │
   │<─────────────────────────────│                         │
   │                              │                         │
   │  7. stop_consuming()         │                         │
   │─────────────────────────────>│  8. close consumer      │
   │                              │                         │
```

### 5.3 加密存储模块

```rust
// src-tauri/src/store/encrypted_store.rs

use aes_gcm::Aes256Gcm;
use aes_gcm::aead::{Aead, NewAead};
use keyring::Entry;

/// 加密配置存储
pub struct EncryptedConfigStore {
    config_path: PathBuf,
    cipher: Aes256Gcm,
}

impl EncryptedConfigStore {
    /// 初始化存储（首次使用需要设置密码）
    pub fn new(app_handle: &AppHandle, password: Option<&str>) -> Result<Self, StoreError>;
    
    /// 加载配置
    pub async fn load(&self) -> Result<AppConfig, StoreError>;
    
    /// 保存配置
    pub async fn save(&self, config: &AppConfig) -> Result<(), StoreError>;
    
    /// 存储敏感字段到系统密钥链
    pub fn store_credential(&self, connection_id: &str, field: &str, value: &str) -> Result<(), StoreError>;
    
    /// 从系统密钥链读取敏感字段
    pub fn get_credential(&self, connection_id: &str, field: &str) -> Result<String, StoreError>;
}
```

---

## 6. 前端架构设计

### 6.1 目录结构

```
src/
├── components/           # 公共组件
│   ├── ui/              # 基础 UI 组件
│   ├── layout/          # 布局组件
│   └── kafka/           # Kafka 相关组件
├── pages/               # 页面组件
│   ├── Welcome/         # 欢迎页
│   ├── Connection/      # 连接管理
│   ├── Topics/          # Topic 管理
│   ├── Consumer/        # 消息消费
│   ├── Producer/        # 消息生产
│   └── Groups/          # Consumer Group
├── hooks/               # 自定义 Hooks
├── stores/              # Zustand 状态管理
├── services/            # Tauri 调用封装
├── types/               # TypeScript 类型定义
├── utils/               # 工具函数
└── App.tsx              # 应用入口
```

### 6.2 状态管理设计

```typescript
// stores/connectionStore.ts
interface ConnectionState {
  connections: ConnectionSummary[];
  activeConnection: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchConnections: () => Promise<void>;
  setActiveConnection: (id: string | null) => void;
  createConnection: (config: ConnectionConfig) => Promise<void>;
  updateConnection: (id: string, config: ConnectionConfig) => Promise<void>;
  deleteConnection: (id: string) => Promise<void>;
  testConnection: (config: ConnectionConfig) => Promise<ConnectionTestResult>;
}

// stores/consumerStore.ts
interface ConsumerState {
  sessions: Map<string, ConsumerSession>;
  messages: Map<string, KafkaMessage[]>;
  
  // Actions
  startConsuming: (params: ConsumeParams) => Promise<string>;
  stopConsuming: (sessionId: string) => Promise<void>;
  clearMessages: (sessionId: string) => void;
  appendMessage: (sessionId: string, message: KafkaMessage) => void;
}
```

### 6.3 路由设计

```typescript
const router = createBrowserRouter([
  {
    path: '/',
    element: <WelcomePage />,
  },
  {
    path: '/main',
    element: <MainLayout />,
    children: [
      { path: 'connections', element: <ConnectionListPage /> },
      { path: 'connections/new', element: <ConnectionFormPage /> },
      { path: 'connections/:id/edit', element: <ConnectionFormPage /> },
      { path: 'topics', element: <TopicListPage /> },
      { path: 'topics/:topic', element: <TopicDetailPage /> },
      { path: 'topics/:topic/consume', element: <ConsumerPage /> },
      { path: 'topics/:topic/produce', element: <ProducerPage /> },
      { path: 'groups', element: <GroupListPage /> },
      { path: 'groups/:groupId', element: <GroupDetailPage /> },
    ],
  },
]);
```

---

## 7. 测试策略

### 7.1 测试层级

```
┌─────────────────────────────────────────┐
│         E2E Tests (Playwright)          │
│  - 完整用户流程测试                      │
│  - 跨平台 UI 测试                        │
└─────────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────┐
│       Integration Tests                 │
│  - Tauri Commands 测试                  │
│  - Kafka 交互测试（使用 Testcontainers） │
└─────────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────┐
│          Unit Tests (Rust)              │
│  - Services 逻辑测试                     │
│  - 加密/存储测试                         │
│  - 类型转换测试                          │
└─────────────────────────────────────────┘
```

### 7.2 测试环境

**Kafka 测试环境**:
- 使用 Testcontainers 启动 Kafka 容器
- 每种认证方式配置独立的测试场景

**Mock 策略**:
- 单元测试使用 Mock 的 ConnectionStore
- 集成测试使用真实的 Kafka 容器

### 7.3 关键测试用例

| 模块 | 测试用例 |
|------|----------|
| Connection | 增删改查、加密存储、连接测试 |
| Topic | 列表获取、创建删除、分区信息 |
| Consumer | 实时消费、历史消息、会话管理 |
| Producer | 单条发送、批量发送、错误处理 |
| Group | 列表、Lag 查询、偏移量重置 |

---

## 8. 构建与发布

### 8.1 构建配置

```json
// tauri.conf.json
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devPath": "http://localhost:1420",
    "distDir": "../dist"
  },
  "tauri": {
    "bundle": {
      "active": true,
      "targets": ["dmg", "msi", "deb", "appimage"],
      "identifier": "com.kafkit.app",
      "category": "DeveloperTool",
      "icon": ["icons/32x32.png", "icons/128x128.png", "icons/icon.icns", "icons/icon.ico"]
    }
  }
}
```

### 8.2 CI/CD 流程

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    tags: ['v*']
jobs:
  build:
    strategy:
      matrix:
        platform: [macos-latest, ubuntu-latest, windows-latest]
    runs-on: ${{ matrix.platform }}
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-action@stable
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install
      - run: npm run tauri build
      - uses: tauri-apps/tauri-action@v0
        with:
          releaseId: ${{ github.ref }}
```

---

## 9. 风险与缓解

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|----------|
| rdkafka 编译问题 | 中 | 高 | 提供预编译二进制，文档说明依赖安装 |
| Kerberos/GSSAPI 配置复杂 | 高 | 中 | 详细的配置指南，提供测试脚本 |
| 大消息内存溢出 | 中 | 高 | 消息大小限制，流式处理大消息 |
| 前端性能瓶颈 | 低 | 中 | 虚拟列表，消息节流，Web Worker |

---

## 10. 开发里程碑

| 阶段 | 目标 | 工期 |
|------|------|------|
| M1 | 项目初始化、连接管理、加密存储 | 1 周 |
| M2 | Topic 管理、基础 UI | 1 周 |
| M3 | 消息消费（实时+历史） | 1 周 |
| M4 | 消息生产、批量发送 | 1 周 |
| M5 | Consumer Group 管理 | 1 周 |
| M6 | 完善、测试、打包发布 | 1 周 |

---

**文档结束**

