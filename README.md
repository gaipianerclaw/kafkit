# Kafkit

跨平台 Kafka 桌面客户端，支持 macOS、Linux 和 Windows。

![Version](https://img.shields.io/badge/version-1.0.1-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 功能特性

- 🔗 **连接管理**: 支持 PLAINTEXT、SSL、SASL_PLAINTEXT、SASL_SSL 协议
- 📋 **Topic 管理**: 查看 Topic 列表、详情、分区、副本、ISR、Offset
- 🌐 **国际化**: 支持简体中文和英文
- 🎨 **深色模式**: 支持浅色/深色/跟随系统主题
- 🔒 **安全连接**: 支持 SSL 证书和 SASL 认证
- 📊 **分区详情**: 查看 Leader、Replicas、ISR、消息偏移量

## 系统要求

| 平台 | 最低版本 |
|------|----------|
| macOS | 11.0+ (Big Sur) |
| Linux | Ubuntu 20.04+ / Fedora 35+ |
| Windows | Windows 10 1809+ / Windows 11 |

## 下载安装

### macOS
- [下载 Apple Silicon 版本](https://github.com/gaipianerclaw/kafkit/releases)
- [下载 Intel 版本](https://github.com/gaipianerclaw/kafkit/releases)

### Linux
- [下载 .deb (Ubuntu/Debian)](https://github.com/gaipianerclaw/kafkit/releases)
- [下载 .rpm (Fedora/RHEL)](https://github.com/gaipianerclaw/kafkit/releases)

### Windows
- [下载 Installer](https://github.com/gaipianerclaw/kafkit/releases)
- [下载 MSI](https://github.com/gaipianerclaw/kafkit/releases)

## 快速开始

1. **创建连接**
   - 点击左上角连接选择器
   - 选择"新建连接"
   - 填写连接信息（名称、Bootstrap Servers、协议、认证）
   - 点击"测试连接"验证

2. **查看 Topics**
   - 选择一个连接
   - 点击左侧"Topics"
   - 查看 Topic 列表

3. **Topic 详情**
   - 点击 Topic 名称或"查看详情"
   - 查看分区信息、Leader、Replicas、ISR、Offset

4. **新建 Topic**
   - 在 Topics 页面点击"新建 Topic"
   - 填写名称、分区数、副本因子
   - 点击创建

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

### macOS
```bash
cd kafkit
npm install
npm run tauri:build
```

### Linux (Ubuntu)
```bash
# 安装依赖
sudo apt-get update
sudo apt-get install -y libgtk-3-dev libwebkit2gtk-4.0-dev libappindicator3-dev librsvg2-dev cmake

# 构建
cd kafkit
npm install
npm run tauri:build
```

### Windows
```powershell
# 安装 Visual Studio Build Tools (选择"使用 C++ 的桌面开发")

# 构建
cd kafkit
npm install
npm run tauri:build
```

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
└── README.md
```

## 关键更新

### v1.0.1
- ✅ Kafka 客户端库从 `kafka` 切换到 `rdkafka`
- ✅ 支持 SSL/SASL 安全认证
- ✅ 添加国际化支持（中/英）
- ✅ 添加深色模式
- ✅ 优化 Topic 列表加载体验
- ✅ 支持创建 Topic

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request。

## 相关链接

- [GitHub 仓库](https://github.com/gaipianerclaw/kafkit)
- [Tauri 文档](https://tauri.app/)
- [rdkafka 文档](https://docs.rs/rdkafka/)
