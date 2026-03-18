# Kafkit 快速启动指南

## 🖥️ 桌面应用构建

### 方式一：自动构建（推荐）

Rust 安装完成后，运行：

```bash
cd /Users/lailai/workspace/kimi_workspace/kafka-connector
./build-desktop.sh
```

### 方式二：手动构建

#### 1. 确保 Rust 已安装

```bash
rustc --version  # 应显示 1.70+
cargo --version  # 应显示 1.70+
```

如果未安装：
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
```

#### 2. 构建应用

```bash
cd kafkit

# 安装依赖
npm install

# 构建前端
npm run build

# 构建桌面应用（需要 Rust）
npm run tauri:build
```

#### 3. 运行应用

```bash
# macOS
./src-tauri/target/release/kafkit

# 或安装 .dmg
open src-tauri/target/release/bundle/dmg/*.dmg
```

---

## 🌐 浏览器预览（无需 Rust）

如果桌面构建遇到问题，可以先在浏览器中预览：

```bash
cd kafkit
npm run dev
```

然后访问: http://localhost:1420/

---

## 📦 构建状态

当前 Rust 安装状态：
- ✅ rustup 已安装
- ⏳ 工具链下载中 (~44MB/200MB)
- ⏳ 等待组件下载完成

预计完成时间：2-5 分钟（取决于网络速度）

---

## 🔧 故障排除

### Rust 下载慢

切换镜像源：
```bash
export RUSTUP_DIST_SERVER=https://mirrors.ustc.edu.cn/rust-static
export RUSTUP_UPDATE_ROOT=https://mirrors.ustc.edu.cn/rust-static/rustup
rustup update
```

### 构建失败

1. 清除缓存重试：
```bash
cd kafkit/src-tauri
cargo clean
npm run tauri:build
```

2. 更新依赖：
```bash
cd kafkit
rm -rf node_modules
npm install
```

### macOS 安全提示

首次运行时可能会显示：
> "Kafkit" 无法打开，因为无法验证开发者

解决方法：
1. 系统设置 → 隐私与安全性
2. 找到 Kafkit，点击"仍要打开"

---

## 📱 运行环境

### 系统要求
- **macOS**: 11.0+ (Intel/Apple Silicon)
- **Windows**: Windows 10 1809+
- **Linux**: Ubuntu 20.04+
- **内存**: 4GB+
- **磁盘**: 200MB 可用空间

### 运行时依赖
- 无需 Java 运行时
- 无需 Docker
- 直接运行可执行文件

---

## 🎯 使用 EC2 Kafka

构建完成后，连接你的 EC2 Kafka：

1. 启动 Kafkit
2. 点击"新建连接"
3. 填写信息：
   - 名称: `EC2 Kafka`
   - Bootstrap: `ec2-dmz-kafka-01:9092`
   - 协议: `PLAINTEXT`
   - 认证: `无认证`
4. 点击"测试连接"
5. 成功后点击"创建"

---

## 📞 支持

如有问题，请查看：
- `USER_GUIDE.md` - 用户手册
- `DEPLOYMENT.md` - 部署指南
- `BUILD_DESKTOP.sh` - 构建脚本
