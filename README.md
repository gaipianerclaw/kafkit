# Kafkit

[![Version](https://img.shields.io/badge/version-1.0.1-blue.svg)](https://github.com/gaipianerclaw/kafkit/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

跨平台 Kafka 桌面客户端，基于 Tauri + React + Rust 构建。

![Kafkit Screenshot](docs/screenshot.png)

## 功能特性

- 🔌 **连接管理** - 支持多 Kafka 集群连接配置，支持 SASL/SSL 认证
- 📋 **Topic 浏览** - 查看 Topic 列表、分区信息、配置参数
- 📤 **消息生产** - 支持单条/批量消息发送，JSON/CSV/文本格式
- 📥 **消息消费** - 实时消费消息，支持分区筛选，自动格式化 JSON
- 👥 **消费组监控** - 查看 Consumer Group 状态和消费延迟 (Lag)
- 🔍 **消息搜索** - 按关键词搜索消息内容
- 🎨 **现代 UI** - 简洁美观的界面设计，支持深色模式

## 技术栈

- **前端**: React 18 + TypeScript + Tailwind CSS + Vite
- **桌面框架**: Tauri v2
- **后端**: Rust + Tokio
- **状态管理**: Zustand
- **数据获取**: TanStack Query

## 安装

### 下载预编译版本

访问 [Releases](https://github.com/gaipianerclaw/kafkit/releases) 页面下载对应平台的安装包。

### 从源码构建

**环境要求：**
- Node.js 18+
- Rust 1.75+
- 系统依赖（Linux）：
  ```bash
  sudo apt install pkg-config libglib2.0-dev libgtk-3-dev libwebkit2gtk-4.1-dev
  ```

**构建步骤：**

```bash
# 克隆仓库
git clone https://github.com/gaipianerclaw/kafkit.git
cd kafkit/kafkit

# 安装依赖
npm install

# 开发模式运行
npm run tauri:dev

# 构建生产版本
npm run tauri:build
```

## 使用指南

### 快速开始

1. 启动应用后，点击"创建第一个连接"
2. 输入连接名称和 Kafka 地址（如 `localhost:9092`）
3. 点击"测试连接"验证配置
4. 保存后即可浏览 Topics 和消费/生产消息

### 连接配置

支持以下认证方式：
- **无认证** - 适用于本地开发或内网环境
- **SASL/PLAIN** - 用户名/密码认证
- **SASL/SCRAM** - 更安全的认证机制
- **SSL/TLS** - 加密连接

## 项目结构

```
kafkit/
├── src/                    # 前端源码
│   ├── components/         # React 组件
│   ├── pages/             # 页面组件
│   ├── services/          # Tauri 服务调用
│   ├── stores/            # Zustand 状态管理
│   └── styles/            # 全局样式
├── src-tauri/             # Tauri/Rust 后端
│   ├── src/               # Rust 源码
│   └── Cargo.toml         # Rust 依赖
├── docs/                  # 文档
└── package.json           # Node.js 依赖
```

## 开发

```bash
# 启动开发服务器（前端热更新）
npm run dev

# 启动 Tauri 开发模式（完整桌面应用）
npm run tauri:dev

# 运行测试
npm run test
npm run test:coverage

# 构建
npm run build
npm run tauri:build
```

## 更新日志

### v1.0.1 (2026-03-18)

**修复：**
- 🐛 修复桌面端空白页面问题 - 添加 Tauri 环境检测和动态导入

### v1.0.0 (2026-03-13)

**初始版本：**
- ✨ 连接管理和测试
- ✨ Topic 浏览和详情
- ✨ 消息生产和消费
- ✨ Consumer Group 监控

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License © 2026 Kafkit Contributors
