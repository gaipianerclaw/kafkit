# Kafkit 多平台构建指南

## 📋 支持的平台

| 平台 | 架构 | 打包格式 | 状态 |
|------|------|----------|------|
| macOS | arm64 (Apple Silicon) | .dmg | ✅ 已测试 |
| macOS | x86_64 (Intel) | .dmg | ✅ 支持 |
| Linux | x86_64 | .deb, .rpm | ✅ 支持 |
| Windows | x86_64 | .msi, .exe | ✅ 支持 |

---

## 🔧 关键架构变更

### Kafka 客户端库更换

**变更时间**: v1.0.1

**从**: `kafka` (纯 Rust 实现)  
**到**: `rdkafka` (librdkafka 绑定)

**原因**:
- 支持 SSL、SASL 等安全协议
- 提供更完整的 Kafka 协议实现
- 性能更好，稳定性更高
- 获取更详细的 Topic 元数据（副本、ISR、Offset 等）

**依赖变更 (Cargo.toml)**:
```toml
# 旧
kafka = { version = "0.10", default-features = false, features = ["snappy"] }

# 新
rdkafka = { version = "0.36", default-features = false, features = [
    "cmake-build",
    "libz-static", 
    "ssl-vendored"
] }
```

**API 变更**:
```rust
// 旧 - kafka crate
let mut client = KafkaClient::new(brokers);
client.load_metadata_all()?;
for topic in client.topics().iter() {
    // topic.partitions() 信息有限
}

// 新 - rdkafka crate
let consumer: BaseConsumer = config.create()?;
let metadata = consumer.fetch_metadata(None, Duration::from_secs(10))?;
for topic in metadata.topics() {
    for partition in topic.partitions() {
        // 可获取 replicas(), isr(), leader() 等完整信息
        let (low, high) = consumer.fetch_watermarks(topic_name, partition.id(), timeout)?;
    }
}
```

---

## 🚀 各平台构建

### macOS (当前开发平台)

**要求：**
- macOS 11.0+
- Xcode Command Line Tools
- Rust 1.75+
- Node.js 18+
- CMake (`brew install cmake`)

**构建命令：**
```bash
cd kafkit
npm install
npm run tauri:build

# 输出产物：
# src-tauri/target/release/bundle/dmg/Kafkit_1.0.1_aarch64.dmg
```

---

### Linux (Ubuntu/Debian)

**要求：**
```bash
sudo apt-get update
sudo apt-get install -y \
    libgtk-3-dev \
    libwebkit2gtk-4.0-dev \
    libappindicator3-dev \
    librsvg2-dev \
    cmake \
    pkg-config
```

**构建命令：**
```bash
cd kafkit
npm install
npm run tauri:build

# 输出产物：
# src-tauri/target/release/bundle/deb/kafkit_1.0.1_amd64.deb
```

---

### Windows

**要求：**
- Visual Studio 2022 (需要 "Desktop development with C++" 工作负载)
- Rust 1.75+
- Node.js 18+
- CMake

**构建命令：**
```powershell
cd kafkit
npm install
npm run tauri:build

# 输出产物：
# src-tauri\target\release\bundle\msi\Kafkit_1.0.1_x64_en-US.msi
```

---

## 📦 静态链接配置

所有平台都静态链接以下依赖：
- zlib (libz-static)
- OpenSSL (ssl-vendored)
- librdkafka (cmake-build)

---

## 🚀 CI/CD 自动化构建

项目已配置 GitHub Actions：

```bash
git tag v1.0.1
git push origin v1.0.1
```

自动构建所有平台并创建 Release。
