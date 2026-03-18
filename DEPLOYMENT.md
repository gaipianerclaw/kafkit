# Kafkit 部署指南

## 系统要求

### 最低配置

| 组件 | 要求 |
|------|------|
| 操作系统 | macOS 11+ / Windows 10 1809+ / Linux (Ubuntu 20.04+) |
| 内存 | 4 GB RAM |
| 磁盘空间 | 100 MB (安装包) + 数据存储 |
| 网络 | 可访问 Kafka 集群 |

### 开发环境要求

如需从源码构建，需要：

- Node.js 18+
- Rust 1.75+
- 对应平台的构建工具

## 安装方式

### 方式一：下载预编译版本 (推荐)

1. 访问 [Releases](https://github.com/yourusername/kafkit/releases) 页面
2. 下载对应平台的安装包：
   - **macOS**: `Kafkit_1.0.0_x64.dmg` (Intel) / `Kafkit_1.0.0_aarch64.dmg` (Apple Silicon)
   - **Windows**: `Kafkit_1.0.0_x64_en-US.msi`
   - **Linux**: `kafkit_1.0.0_amd64.deb` (Debian/Ubuntu) / `kafkit-1.0.0-1.x86_64.rpm` (Fedora)

3. 运行安装程序并按照提示完成安装

### 方式二：从源码构建

#### macOS

```bash
# 1. 安装依赖
brew install node rust cmake librdkafka

# 2. 克隆代码
git clone https://github.com/yourusername/kafkit.git
cd kafkit

# 3. 安装前端依赖
npm install

# 4. 构建应用
npm run tauri:build

# 5. 安装构建产物
# macOS: 打开 src-tauri/target/release/bundle/dmg/*.dmg
```

#### Windows

```powershell
# 1. 安装依赖
# - Node.js: https://nodejs.org/
# - Rust: https://rustup.rs/
# - Visual Studio Build Tools

# 2. 克隆代码
git clone https://github.com/yourusername/kafkit.git
cd kafkit

# 3. 安装前端依赖
npm install

# 4. 构建应用
npm run tauri:build

# 5. 安装构建产物
# Windows: 运行 src-tauri/target/release/bundle/msi/*.msi
```

#### Linux (Ubuntu/Debian)

```bash
# 1. 安装依赖
sudo apt-get update
sudo apt-get install -y nodejs npm rustc cmake libssl-dev libgtk-3-dev libwebkit2gtk-4.0-dev libayatana-appindicator3-dev librsvg2-dev

# 2. 克隆代码
git clone https://github.com/yourusername/kafkit.git
cd kafkit

# 3. 安装前端依赖
npm install

# 4. 构建应用
npm run tauri:build

# 5. 安装构建产物
sudo dpkg -i src-tauri/target/release/bundle/deb/*.deb
```

## 开发环境运行

```bash
cd kafkit

# 安装依赖
npm install

# 运行开发版本（热重载）
npm run tauri:dev
```

## 配置说明

### 配置文件位置

Kafkit 将配置存储在以下位置：

| 平台 | 路径 |
|------|------|
| macOS | `~/Library/Application Support/com.kafkit.app/` |
| Windows | `%APPDATA%/kafkit/` |
| Linux | `~/.config/kafkit/` |

### 配置文件结构

```
kafkit/
├── config.json          # 连接配置（加密）
├── settings.json        # 应用设置
└── logs/               # 日志文件
    └── app.log
```

### 环境变量

| 变量 | 说明 | 示例 |
|------|------|------|
| `KAFKIT_LOG_LEVEL` | 日志级别 | `debug`, `info`, `warn`, `error` |
| `KAFKIT_CONFIG_DIR` | 配置目录覆盖 | `/path/to/config` |

## 升级指南

### 自动更新

Kafkit 支持自动检查更新：
1. 打开应用设置
2. 点击"检查更新"
3. 如有新版本，按提示下载安装

### 手动升级

1. 备份配置文件（可选）
2. 下载新版本安装包
3. 直接安装（数据会自动保留）

## 卸载

### macOS

```bash
# 删除应用
rm -rf /Applications/Kafkit.app

# 删除配置（可选）
rm -rf ~/Library/Application\ Support/com.kafkit.app
```

### Windows

1. 设置 → 应用 → 应用和功能
2. 找到 Kafkit
3. 点击"卸载"

### Linux

```bash
# Debian/Ubuntu
sudo apt-get remove kafkit

# Fedora
sudo rpm -e kafkit

# 删除配置（可选）
rm -rf ~/.config/kafkit
```

## 故障排除

### 启动失败

1. **检查日志**: 查看配置目录下的 `logs/app.log`
2. **重置配置**: 删除配置文件后重启应用
3. **检查权限**: 确保应用有读写配置目录的权限

### 无法连接 Kafka

1. **检查网络**: 确保可以访问 Kafka Broker
2. **检查配置**: 验证 Bootstrap Servers 地址和端口
3. **检查认证**: 确认认证信息正确
4. **防火墙**: 检查是否有防火墙阻止连接

### 构建失败

1. **更新 Rust**: `rustup update`
2. **清理缓存**: `cargo clean` 和 `rm -rf node_modules`
3. **重新安装**: `npm install`

## 安全说明

- 连接凭证使用系统密钥链存储
- 配置文件可选择加密存储
- 敏感信息不会记录到日志
- 支持 SSL/TLS 加密连接

## 获取帮助

- 查看文档: [README.md](./README.md)
- 提交 Issue: [GitHub Issues](https://github.com/yourusername/kafkit/issues)
- 邮件支持: support@kafkit.dev
