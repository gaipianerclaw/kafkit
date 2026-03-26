# Kafkit

跨平台 Kafka 桌面客户端，支持 macOS、Linux 和 Windows。

![Version](https://img.shields.io/badge/version-1.0.2-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 功能特性

### 连接管理
- 🔗 支持 PLAINTEXT、SSL、SASL_PLAINTEXT、SASL_SSL 协议
- 🔒 SSL 证书管理（CA 证书、客户端证书、密钥）
- 🔑 SASL 认证（PLAIN、SCRAM-SHA-256/512、GSSAPI）
- 🧪 连接测试功能

### Topic 管理
- 📋 查看 Topic 列表、详情、分区信息
- ➕ 创建 Topic（指定分区数、副本因子）
- 🗑️ 删除 Topic（带确认对话框）
- ⚙️ 查看和编辑 Topic 配置参数
- 📊 分区详情（Leader、Replicas、ISR、Offset 范围、消息数量）

### 消息生产
- ✉️ 单条消息发送（支持指定 partition 和 key）
- 📦 批量消息发送
- ⏱️ 定时发送（可配置批次大小、间隔、重复次数）
- 📝 支持文本、JSON、CSV 格式

### 消息消费
- 👁️ 实时消息预览（表格式展示）
- 🔍 消息搜索功能
- 📁 导出到文件（JSON/JSON Lines/CSV）
- ⏮️ 多种起始位置（Latest/Earliest/Timestamp/Offset）
- 📖 消息详情查看（完整元信息）

### 消费者组管理
- 👥 查看 Consumer Group 列表和状态
- 📈 消费延迟(Lag)监控
- 🔄 偏移量重置（支持 Earliest/Latest/指定 Offset）

### 其他特性
- 🌐 国际化：支持简体中文和英文
- 🎨 深色模式：浅色/深色/跟随系统主题
- 💻 跨平台：macOS、Linux、Windows

## 系统要求

| 平台 | 最低版本 |
|------|----------|
| macOS | 11.0+ (Big Sur) |
| Linux | Ubuntu 20.04+ / Fedora 35+ |
| Windows | Windows 10 1809+ / Windows 11 |

## 下载安装

从 [GitHub Releases](https://github.com/gaipianerclaw/kafkit/releases) 下载最新版本。

### macOS
- `Kafkit_1.0.2_aarch64.dmg` (Apple Silicon)
- `Kafkit_1.0.2_x64.dmg` (Intel)

### Linux
- `kafkit_1.0.2_amd64.deb` (Ubuntu/Debian)
- `kafkit-1.0.2-1.x86_64.rpm` (Fedora/RHEL)

### Windows
- `Kafkit_1.0.2_x64-setup.exe`
- `Kafkit_1.0.2_x64.msi`

## 快速开始

1. **创建连接**: 点击左上角连接选择器 → 新建连接 → 填写信息 → 测试连接
2. **查看 Topics**: 选择连接 → 点击左侧"Topic 管理"
3. **发送消息**: 在 Topic 详情页点击"发送消息"
4. **消费消息**: 在 Topic 详情页点击"消费消息"
5. **查看消费组**: 点击左侧"消费组"

详细使用说明请参考 [USER_GUIDE.md](./USER_GUIDE.md)

## 技术栈

- **前端**: React 18 + TypeScript + Tailwind CSS
- **桌面框架**: Tauri 2.x
- **Kafka 客户端**: rdkafka (Rust)
- **国际化**: i18next
- **构建工具**: Vite

## 开发构建

### 环境要求
- Rust 1.75+
- Node.js 18+
- npm 或 yarn

### 快速构建

```bash
cd kafkit
npm install
npm run tauri:build
```

各平台详细构建说明请参考 [BUILD_DESKTOP.sh](./BUILD_DESKTOP.sh)

## 项目结构

```
kafka-connector/
├── kafkit/                 # 主项目目录
│   ├── src/
│   │   ├── components/     # UI 组件
│   │   ├── pages/          # 页面组件
│   │   ├── services/       # API 服务
│   │   ├── stores/         # 状态管理
│   │   ├── i18n/           # 国际化配置
│   │   └── contexts/       # React Context
│   ├── src-tauri/          # Rust 后端
│   │   └── src/
│   │       ├── commands.rs # Tauri 命令
│   │       ├── services.rs # Kafka 服务
│   │       └── models.rs   # 数据模型
│   └── package.json
├── docker/                 # 测试环境
│   ├── kafka-ssl/          # SSL/SASL 测试环境
│   └── kafka-sasl/         # SASL 测试环境
├── CHANGELOG.md
├── USER_GUIDE.md
└── README.md
```

## 测试环境

项目提供了 Docker 测试环境，支持多种 Kafka 连接协议：

```bash
cd docker/kafka-ssl
docker-compose up -d
```

支持协议：
- PLAINTEXT: localhost:9092
- SASL_PLAINTEXT: localhost:9093 (admin/admin-secret)
- SSL: localhost:9094
- SASL_SSL: localhost:9095 (admin/admin-secret)

## 更新日志

详见 [CHANGELOG.md](./CHANGELOG.md)

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request。

## 相关链接

- [GitHub 仓库](https://github.com/gaipianerclaw/kafkit)
- [用户手册](./USER_GUIDE.md)
- [Tauri 文档](https://tauri.app/)
- [rdkafka 文档](https://docs.rs/rdkafka/)
