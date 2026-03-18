# Kafkit

跨平台 Kafka 桌面客户端工具

## 功能特性

- 🔌 多集群连接管理（支持 PLAINTEXT/SASL/SSL/Kerberos）
- 🔒 连接信息加密存储
- 📋 Topic 管理（查看、创建、删除）
- 📥 消息消费（实时流式 + 历史翻页）
- 📤 消息生产（单条 + 批量发送）
- 👥 Consumer Group 管理（Lag 监控）
- 🎨 深色/浅色主题

## 技术栈

- **前端**: React 18 + TypeScript + Tailwind CSS + Tauri
- **后端**: Rust + rdkafka
- **构建**: Vite

## 开发环境

### 前置要求

- Node.js 18+
- Rust 1.75+
- Kafka 2.0+

### 安装依赖

```bash
# 安装前端依赖
npm install

# 安装 Tauri CLI
npm install -g @tauri-apps/cli
```

### 开发运行

```bash
# 启动开发服务器
npm run tauri:dev
```

### 构建发布

```bash
# 构建生产版本
npm run tauri:build
```

## 项目结构

```
kafkit/
├── src/                    # 前端源代码
│   ├── components/         # UI 组件
│   ├── pages/             # 页面组件
│   ├── services/          # Tauri 调用封装
│   ├── stores/            # 状态管理
│   └── types/             # TypeScript 类型
├── src-tauri/             # Rust 后端代码
│   ├── src/
│   │   ├── commands.rs    # Tauri 命令
│   │   ├── models.rs      # 数据模型
│   │   ├── services.rs    # Kafka 服务
│   │   └── store.rs       # 加密存储
│   └── Cargo.toml
└── docs/                  # 文档
```

## 许可证

MIT
