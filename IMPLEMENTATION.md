# Kafkit 项目实现说明

## 📁 项目结构

```
kafka-connector/
├── docs/
│   ├── SRS-v1.0.md       # 软件需求规格说明书
│   └── TDD-v1.0.md       # 技术设计文档
└── kafkit/               # 项目代码
    ├── src/              # 前端 (React + TypeScript)
    │   ├── components/   # UI 组件
    │   ├── pages/        # 页面
    │   ├── services/     # Tauri API 封装
    │   ├── stores/       # Zustand 状态管理
    │   └── types/        # TypeScript 类型定义
    ├── src-tauri/        # 后端 (Rust)
    │   ├── src/
    │   │   ├── commands.rs   # Tauri 命令
    │   │   ├── models.rs     # 数据模型
    │   │   ├── services.rs   # Kafka 服务
    │   │   ├── store.rs      # 加密存储
    │   │   └── lib.rs        # 库入口
    │   ├── Cargo.toml
    │   └── tauri.conf.json
    ├── package.json
    └── README.md
```

## ✅ 已实现功能

### M1: 项目基础
- [x] Tauri 项目结构
- [x] 加密存储模块 (keyring + 本地文件)
- [x] 连接管理 API
- [x] 前端基础 UI (Tailwind CSS)
- [x] 连接管理页面

### M2: Topic 管理
- [x] Topic 列表/详情 API
- [x] 创建/删除 Topic
- [x] 分区信息展示

### M3: 消息消费
- [x] 实时流式消费 (WebSocket-like events)
- [x] 历史消息分页获取
- [x] 消息格式化 (JSON/文本)

### M4: 消息生产
- [x] 单条消息发送
- [x] 批量消息发送
- [x] 速率控制

### M5: Consumer Group
- [x] Group 列表
- [x] Lag 监控 (框架已搭建)

## 🚀 如何运行

### 前置依赖

```bash
# macOS
brew install rust node@20

# Ubuntu/Debian
sudo apt-get install rust-all nodejs npm

# 安装 Tauri 依赖 (macOS)
brew install cmake librdkafka openssl@3

# 安装 Tauri 依赖 (Ubuntu)
sudo apt-get install libwebkit2gtk-4.0-dev build-essential curl wget libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
```

### 安装运行

```bash
cd /Users/lailai/workspace/kimi_workspace/kafka-connector/kafkit

# 安装前端依赖
npm install

# 安装 Rust 依赖 (自动)
# 运行开发服务器
npm run tauri:dev
```

### 构建发布

```bash
# 构建所有平台
npm run tauri:build

# 构建产物位置:
# - macOS: src-tauri/target/release/bundle/dmg/*.dmg
# - Windows: src-tauri/target/release/bundle/msi/*.msi
# - Linux: src-tauri/target/release/bundle/deb/*.deb
```

## 🔧 配置说明

### Kafka 认证支持

| 认证方式 | 状态 |
|----------|------|
| PLAINTEXT | ✅ 已实现 |
| SASL/PLAIN | ✅ 已实现 |
| SASL/SCRAM | ✅ 已实现 |
| SASL/GSSAPI | ✅ 已实现 (需系统 Kerberos) |
| SSL/TLS | ✅ 已实现 |

### 数据存储

- **配置文件**: `~/.config/kafkit/config.json` (macOS: `~/Library/Application Support/com.kafkit.app/`)
- **加密**: AES-256-GCM (可配置)
- **凭证**: 系统密钥链 (Keyring)

## 📝 已知限制

1. **Consumer Group Lag**: 需要进一步完善偏移量查询
2. **消息搜索**: 预留接口，未实现
3. **Avro/Protobuf**: 预留扩展接口
4. **Kerberos**: 需要系统预配置

## 🔮 后续优化

- [ ] 完善 Lag 计算逻辑
- [ ] 添加消息搜索功能
- [ ] Schema Registry 支持
- [ ] 性能优化 (大消息虚拟滚动)
- [ ] 多语言支持
- [ ] 自动更新

## 📊 代码统计

| 类型 | 文件数 | 代码行数 |
|------|--------|----------|
| 前端 TypeScript | 20+ | ~3000 |
| 后端 Rust | 6 | ~2500 |
| 文档 | 3 | ~2000 |

---

**Phase 3 开发完成** - 等待 Phase 4 验收交付
