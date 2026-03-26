# Avro/Protobuf 消息格式验证指南

## 测试方法

### 方法一：使用模拟数据（推荐）

在浏览器控制台直接发送测试消息：

```javascript
// 在消费者页面打开控制台，粘贴以下代码

// 1. 发送 Avro JSON 格式消息
window.postMessage({
  type: 'test-message',
  data: {
    partition: 0,
    offset: 1000,
    timestamp: Date.now(),
    key: 'user-123',
    value: JSON.stringify({
      "__avro_schema": "user.v1",
      "name": "John Doe",
      "age": 30,
      "email": "john@example.com",
      "address": {
        "street": "123 Main St",
        "city": "New York"
      }
    })
  }
}, '*');

// 2. 发送 Protobuf JSON 格式消息
window.postMessage({
  type: 'test-message',
  data: {
    partition: 1,
    offset: 2000,
    timestamp: Date.now(),
    key: 'order-456',
    value: JSON.stringify({
      "@type": "type.googleapis.com/Order",
      "orderId": "ORD-12345",
      "amount": 99.99,
      "items": [
        {"id": "ITEM-1", "name": "Product A"},
        {"id": "ITEM-2", "name": "Product B"}
      ]
    })
  }
}, '*');
```

### 方法二：使用测试 Topic

1. **创建测试消息文件** `test-messages.jsonl`：

```jsonl
{"partition":0,"offset":1,"timestamp":1704067200000,"key":"test-1","value":"{\"__avro_schema\":\"user.v1\",\"name\":\"Alice\",\"age\":25}"}
{"partition":0,"offset":2,"timestamp":1704067260000,"key":"test-2","value":"{\"@type\":\"Order\",\"orderId\":\"ORD-001\",\"total\":150.00}"}
{"partition":0,"offset":3,"timestamp":1704067320000,"key":"test-3","value":"{\"__protobuf_schema\":\"product.proto\",\"id\":\"P001\",\"price\":29.99}"}
```

2. **在 Kafkit 中使用 Producer 发送**：
   - 选择 Topic
   - 选择"批量发送"模式
   - 粘贴上述 JSON 内容（每行一条）
   - 点击发送

3. **切换到 Consumer 查看**：
   - 消费刚才发送的消息
   - 点击消息展开查看详情
   - 观察类型标签（Avro-橙色/Protobuf-蓝色）

### 方法三：使用 Docker 测试环境

```bash
# 进入项目目录
cd /Users/lailai/workspace/kimi_workspace/kafka-connector/docker/kafka-ssl

# 启动测试环境
docker-compose up -d

# 创建测试 Topic
docker exec -it kafka-ssl-kafka-1 kafka-topics \
  --create --topic schema-test \
  --bootstrap-server localhost:9092 \
  --partitions 1 --replication-factor 1

# 发送 Avro 格式消息（模拟）
docker exec -it kafka-ssl-kafka-1 kafka-console-producer \
  --topic schema-test \
  --bootstrap-server localhost:9092 \
  <<EOF
{"__avro_schema":"user.v1","name":"Test User","email":"test@example.com"}
EOF

# 发送 Protobuf 格式消息（模拟）
docker exec -it kafka-ssl-kafka-1 kafka-console-producer \
  --topic schema-test \
  --bootstrap-server localhost:9092 \
  <<EOF
{"@type":"Order","orderId":"123","amount":99.99}
EOF
```

## 验证要点

### 1. Avro 格式验证

**输入数据**：
```json
{
  "__avro_schema": "user.v1",
  "name": "John Doe",
  "age": 30,
  "email": "john@example.com"
}
```

**预期展示**：
- 消息行右侧显示 `avro` 类型标签
- 展开后显示橙色 "Avro" 标签
- JSON 内容语法高亮显示

### 2. Protobuf 格式验证

**输入数据**：
```json
{
  "@type": "type.googleapis.com/Order",
  "orderId": "ORD-12345",
  "amount": 99.99
}
```

**预期展示**：
- 消息行右侧显示 `protobuf` 类型标签
- 展开后显示蓝色 "Protobuf JSON" 标签
- JSON 内容语法高亮显示

### 3. 二进制 Protobuf 验证

**输入数据**（Base64 编码）：
```
CgZPUkQtMDESJ3siQHR5cGUiOiJ0eXBlLmdvb2dsZWFwaXMuY29tL09yZGVyIn0=
```

**预期展示**：
- 显示 "Protobuf Binary" 标签
- 解析并显示字段编号和值

## 常见问题

### Q: 消息显示为普通 JSON 而不是 Avro/Protobuf？

**检查点**：
1. 确认消息包含 `__avro_schema` 或 `@type` 字段
2. 检查 `detectContentType` 函数是否正确识别
3. 查看浏览器控制台是否有解析错误

### Q: 类型标签显示错误？

**调试方法**：
```javascript
// 在控制台测试检测函数
import { detectAvroFormat } from './utils/schema/avro';
import { detectProtobufFormat } from './utils/schema/protobuf';

const testData = '{"__avro_schema":"test","data":"value"}';
console.log('Avro:', detectAvroFormat(testData));
console.log('Protobuf:', detectProtobufFormat(testData));
```

### Q: 如何添加更多 Avro/Protobuf 特征识别？

修改检测函数：

```typescript
// src/utils/schema/avro.ts
export function detectAvroFormat(data: string): 'json' | 'binary' | 'unknown' {
  // 添加更多特征检查
  if (data.includes('"avro.schema"') || 
      data.includes('"AvroSchema"') ||
      data.includes('__avro')) {
    return 'json';
  }
  // ...
}

// src/utils/schema/protobuf.ts
export function detectProtobufFormat(data: string): 'json' | 'binary' | 'unknown' {
  // 添加更多特征检查
  if (data.includes('"protoPayload"') || 
      data.includes('"protobuf"') ||
      data.includes('__proto')) {
    return 'json';
  }
  // ...
}
```

## 快速测试命令

```bash
# 构建并启动应用
cd kafkit && npm run tauri:dev

# 在另一个终端发送测试消息
curl -X POST http://localhost:1420/test \
  -H "Content-Type: application/json" \
  -d '{"type":"avro","data":{"__avro_schema":"test","value":"hello"}}'
```

## 预期截图

### Avro 消息展示
```
┌─────────────────────────────────────────┐
│ #1  P0  1,000  2024-01-01 10:00:00  -   │
│ {"__avro_schema":"user.v1",...}  [avro]│
└─────────────────────────────────────────┘
           ↓ 点击展开
┌─────────────────────────────────────────┐
│ [Avro]                                  │
│ {                                       │
│   "__avro_schema": "user.v1",          │
│   "name": "John Doe",                   │
│   ...                                   │
│ }                                       │
└─────────────────────────────────────────┘
```

### Protobuf 消息展示
```
┌─────────────────────────────────────────┐
│ #2  P1  2,000  2024-01-01 10:01:00  -   │
│ {"@type":"Order",...}         [protobuf]│
└─────────────────────────────────────────┘
           ↓ 点击展开
┌─────────────────────────────────────────┐
│ [Protobuf JSON]                         │
│ {                                       │
│   "@type": "Order",                     │
│   "orderId": "ORD-12345",               │
│   ...                                   │
│ }                                       │
└─────────────────────────────────────────┘
```
