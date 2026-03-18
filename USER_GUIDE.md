# Kafkit 用户手册

## 目录

1. [快速开始](#快速开始)
2. [连接管理](#连接管理)
3. [Topic 操作](#topic-操作)
4. [消息消费](#消息消费)
5. [消息生产](#消息生产)
6. [Consumer Group 管理](#consumer-group-管理)
7. [快捷键](#快捷键)
8. [常见问题](#常见问题)

---

## 快速开始

### 首次启动

1. 启动 Kafkit 应用
2. 点击"创建第一个连接"
3. 填写 Kafka 连接信息
4. 测试连接并保存

### 界面概览

```
┌─────────────────────────────────────────────────────────────┐
│  Kafkit                                          [搜索] [设置] │
├──────────┬──────────────────────────────────────────────────┤
│          │                                                  │
│ 连接选择  │                  主内容区                        │
│  ▼ Prod  │                                                  │
│          │  ┌────────────────────────────────────────────┐  │
│ Topics   │  │             Topic 列表/详情                 │  │
│ Groups   │  │                                            │  │
│          │  │                                            │  │
│ ──────── │  │                                            │  │
│          │  │                                            │  │
│ 设置     │  └────────────────────────────────────────────┘  │
│          │                                                  │
└──────────┴──────────────────────────────────────────────────┘
```

---

## 连接管理

### 创建新连接

1. 点击左侧边栏的连接下拉菜单
2. 选择"新建连接"
3. 填写连接信息：

| 字段 | 说明 | 示例 |
|------|------|------|
| 连接名称 | 显示名称 | Production Cluster |
| Bootstrap Servers | Kafka 地址，多个用逗号分隔 | `localhost:9092` 或 `host1:9092,host2:9092` |
| 安全协议 | 连接协议 | PLAINTEXT / SASL_SSL / SSL |
| 认证方式 | 认证类型 | 无 / SASL/PLAIN / SASL/SCRAM |

4. 点击"测试连接"验证
5. 点击"创建"保存

### 认证配置示例

#### PLAINTEXT (无认证)
```
安全协议: PLAINTEXT
认证方式: 无认证
```

#### SASL/PLAIN
```
安全协议: SASL_PLAINTEXT
认证方式: SASL/PLAIN
用户名: admin
密码: admin-secret
```

#### SASL/SCRAM
```
安全协议: SASL_SSL
认证方式: SASL/SCRAM
SCRAM 机制: SCRAM-SHA-256
用户名: user
密码: password
```

#### SSL
```
安全协议: SSL
认证方式: SSL
CA 证书路径: /path/to/ca.crt
客户端证书路径: /path/to/client.crt
客户端密钥路径: /path/to/client.key
```

---

## Topic 操作

### 查看 Topic 列表

1. 选择左侧导航的 "Topics"
2. 使用顶部搜索框过滤 Topic
3. 点击刷新按钮更新列表

### 查看 Topic 详情

1. 在 Topic 列表中点击 Topic 名称
2. 查看分区信息、副本分布、配置参数

分区信息包含：
- Partition ID
- Leader Broker
- Replicas (副本分布)
- ISR (同步副本)
- 消息偏移量范围

### 创建 Topic

1. 点击 Topic 列表页的"新建 Topic"按钮
2. 填写信息：
   - Topic 名称
   - 分区数
   - 副本因子
   - 可选配置参数

### 删除 Topic

⚠️ **警告**: 删除操作不可恢复！

1. 在 Topic 列表中找到要删除的 Topic
2. 点击操作列的删除图标
3. 确认删除

---

## 消息消费

### 实时消费

1. 在 Topic 列表中选择 Topic
2. 点击"消费"按钮
3. 选择分区（可选，默认所有分区）
4. 点击"开始"按钮

消费界面功能：
- **暂停/恢复**: 控制消费流
- **清空**: 清空当前显示的消息
- **导出**: 导出消息到 JSON 文件
- **格式选择**: 自动/JSON/纯文本

### 查看历史消息

1. 在消费页面选择特定分区
2. 消息会自动从最新位置开始消费
3. 滚动查看历史消息

### 消息显示格式

| 格式 | 说明 |
|------|------|
| 自动检测 | 自动识别 JSON 并格式化 |
| JSON | 强制以 JSON 格式解析 |
| 纯文本 | 原始文本显示 |

---

## 消息生产

### 发送单条消息

1. 在 Topic 列表中选择 Topic
2. 点击"发送"按钮
3. 填写消息信息：
   - Partition (可选，自动分配)
   - Key (可选)
   - Value (消息内容)

4. 点击"发送"

### 批量发送

1. 在发送页面切换到"批量"模式
2. 每行输入一条消息
3. 选择消息格式
4. 点击"批量发送"

### 消息格式

**JSON 示例**:
```json
{
  "id": 12345,
  "message": "Hello Kafka",
  "timestamp": "2026-03-13T10:00:00Z"
}
```

**CSV 示例**:
```csv
id,name,value
1,test,100
2,demo,200
```

**纯文本示例**:
```
Hello, this is a plain text message
```

---

## Consumer Group 管理

### 查看 Consumer Groups

1. 选择左侧导航的 "Consumer Groups"
2. 查看 Group 列表
3. 点击 Group 查看详细信息

### 查看消费 Lag

1. 选择一个 Consumer Group
2. 在右侧查看 Lag 信息：
   - Topic
   - Partition
   - Current Offset
   - Log End Offset
   - Lag (延迟消息数)

Lag 颜色说明：
- 🟢 Lag = 0: 消费正常
- 🟡 Lag < 1000: 轻微延迟
- 🔴 Lag >= 1000: 严重延迟

---

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl/Cmd + T` | 新建连接 |
| `Ctrl/Cmd + R` | 刷新当前页面 |
| `Ctrl/Cmd + F` | 搜索/过滤 |
| `Ctrl/Cmd + 1` | 切换到 Topics |
| `Ctrl/Cmd + 2` | 切换到 Groups |
| `Esc` | 取消/关闭 |

---

## 常见问题

### Q: 连接失败怎么办？

A: 请检查：
1. Bootstrap Servers 地址是否正确
2. 端口是否开放
3. 防火墙设置
4. 认证信息是否正确

### Q: 如何查看连接是否成功？

A: 在连接列表中，连接名称左侧的指示灯：
- 🟢 绿色: 连接正常
- ⚪ 灰色: 未连接

### Q: 消息消费没有数据？

A: 可能原因：
1. Topic 中没有新消息
2. 选择了错误的分区
3. 消费者组已消费完所有消息

### Q: 如何导出消息？

A: 在消费页面：
1. 点击"导出"按钮
2. 选择保存位置
3. 消息将导出为 JSON 格式

### Q: 支持哪些 Kafka 版本？

A: Kafkit 支持 Kafka 2.0.0 及以上版本。

### Q: 数据存储在哪里？

A: 配置存储在：
- macOS: `~/Library/Application Support/com.kafkit.app/`
- Windows: `%APPDATA%/kafkit/`
- Linux: `~/.config/kafkit/`

---

## 反馈与支持

如有问题或建议，请通过以下方式反馈：

- GitHub Issues: https://github.com/yourusername/kafkit/issues
- 邮件: support@kafkit.dev
