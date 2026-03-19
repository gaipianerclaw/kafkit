# Kafkit 用户手册

## 目录

1. [安装](#安装)
2. [快速开始](#快速开始)
3. [连接管理](#连接管理)
4. [Topic 管理](#topic-管理)
5. [设置](#设置)

---

## 安装

### macOS

1. 下载 `Kafkit_1.0.1_aarch64.dmg` (Apple Silicon) 或 `Kafkit_1.0.1_x64.dmg` (Intel)
2. 双击打开 DMG 文件
3. 将 Kafkit 拖到 Applications 文件夹
4. 首次运行时，在"系统设置 > 隐私与安全性"中允许打开

### Linux

**Ubuntu/Debian:**
```bash
sudo dpkg -i kafkit_1.0.1_amd64.deb
# 如果有依赖问题
sudo apt-get install -f
```

**Fedora/RHEL:**
```bash
sudo rpm -i kafkit-1.0.1-1.x86_64.rpm
```

### Windows

1. 下载 `Kafkit_1.0.1_x64-setup.exe`
2. 双击运行安装程序
3. 按向导完成安装

---

## 快速开始

### 1. 创建 Kafka 连接

1. 点击左上角连接选择器
2. 选择"新建连接"
3. 填写连接信息：
   - **名称**: 给连接起个名字（如"生产环境"）
   - **Bootstrap Servers**: Kafka 地址（如 `localhost:9092`）
   - **协议**: 选择安全协议（PLAINTEXT/SSL/SASL_PLAINTEXT/SASL_SSL）
   - **认证**: 根据协议选择认证方式
4. 点击"测试连接"验证
5. 点击"创建"保存

### 2. 查看 Topics

1. 从连接选择器选择一个连接
2. 点击左侧菜单"Topics"
3. 查看该连接的所有 Topic 列表

### 3. 查看 Topic 详情

1. 在 Topics 列表中点击 Topic 名称
2. 查看：
   - 分区信息
   - Leader Broker
   - Replicas
   - ISR (In-Sync Replicas)
   - Offset 范围
   - 消息数量

---

## 连接管理

### 支持的协议

| 协议 | 说明 | 适用场景 |
|------|------|----------|
| PLAINTEXT | 无加密 | 内网、开发环境 |
| SSL | TLS 加密 | 生产环境 |
| SASL_PLAINTEXT | SASL 认证 | 需要用户名密码 |
| SASL_SSL | SASL + TLS | 高安全要求 |

### SSL 配置

需要以下证书文件：
- **CA 证书**: 服务器根证书
- **客户端证书** (可选): 双向认证时使用
- **客户端密钥** (可选): 双向认证时使用

### SASL 认证

支持以下机制：
- **PLAIN**: 用户名/密码
- **SCRAM-SHA-256**: 安全的用户名/密码
- **SCRAM-SHA-512**: 更安全的用户名/密码
- **GSSAPI**: Kerberos 认证

---

## Topic 管理

### 新建 Topic

1. 在 Topics 页面点击"新建 Topic"
2. 填写：
   - **Topic 名称**: 支持字母、数字、点、下划线
   - **分区数**: 默认 1，可根据并发需求调整
   - **副本因子**: 默认 1，生产环境建议 3
3. 点击"创建"

### 删除 Topic

⚠️ **警告**: 删除操作不可恢复！

1. 在 Topics 列表中找到要删除的 Topic
2. 点击右侧的删除图标
3. 在确认对话框中确认删除

⚠️ 注意：Kafka 默认不允许删除 Topic，需要在 Kafka 配置中设置 `delete.topic.enable=true`

---

## 设置

### 切换语言

1. 点击左侧菜单"设置"
2. 在"语言"部分选择：
   - 简体中文
   - English

### 切换主题

1. 点击左侧菜单"设置"
2. 在"主题"部分选择：
   - **浅色**: 始终使用浅色主题
   - **深色**: 始终使用深色主题
   - **跟随系统**: 根据系统主题自动切换

### 关于

在设置页面底部查看：
- 应用版本
- Kafka 客户端版本
- 其他信息

---

## 常见问题

### Q: 连接测试失败怎么办？

A: 检查以下几点：
1. Kafka 地址和端口是否正确
2. 网络是否可达（尝试 `telnet host port`）
3. 安全协议和认证信息是否正确
4. 防火墙是否允许访问

### Q: 无法删除 Topic？

A: Kafka 默认禁止删除 Topic。需要在 Kafka 配置 (`server.properties`) 中添加：
```properties
delete.topic.enable=true
```
然后重启 Kafka。

### Q: 连接后看不到 Topics？

A: 可能原因：
1. 该 Kafka 集群确实没有 Topics
2. 当前用户没有权限查看 Topics
3. 连接配置有误（如错误的 SASL 认证）

### Q: 如何查看 Consumer Group？

A: 点击左侧菜单"Consumer Groups"查看消费组信息。

---

## 技术支持

- GitHub Issues: https://github.com/gaipianerclaw/kafkit/issues
- 邮箱: (你的邮箱)
