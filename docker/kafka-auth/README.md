# Kafka SASL/PLAIN 认证环境（关闭无认证端口）

此环境只开放 SASL_PLAINTEXT (9093) 端口，关闭 PLAINTEXT (9092) 无认证端口。

## 配置说明

| 配置项 | 值 |
|--------|-----|
| 监听端口 | 9093 |
| 协议 | SASL_PLAINTEXT |
| 认证方式 | PLAIN |
| 开放端口 | 仅 9093（无 9092）|

## 启动服务

```bash
cd docker/kafka-auth
docker-compose up -d
```

## Kafkit 连接配置

```
Bootstrap Servers: localhost:9093
协议: SASL_PLAINTEXT
认证方式: SASL PLAIN
用户名: admin
密码: admin-secret
```

## 预设用户

| 用户名 | 密码 |
|--------|------|
| admin | admin-secret |
| alice | alice-secret |
| bob | bob-secret |

## 测试连接

```bash
# 进入容器
docker exec -it kafka-auth bash

# 创建 Topic（需要认证）
kafka-topics \
  --bootstrap-server localhost:9093 \
  --command-config /etc/kafka/client.properties \
  --create --topic test-topic --partitions 1 --replication-factor 1

# 查看 Topic 列表
kafka-topics \
  --bootstrap-server localhost:9093 \
  --command-config /etc/kafka/client.properties \
  --list

# 发送消息
kafka-console-producer \
  --bootstrap-server localhost:9093 \
  --producer.config /etc/kafka/client.properties \
  --topic test-topic

# 接收消息
kafka-console-consumer \
  --bootstrap-server localhost:9093 \
  --consumer.config /etc/kafka/client.properties \
  --topic test-topic --from-beginning
```

## client.properties 配置

```properties
security.protocol=SASL_PLAINTEXT
sasl.mechanism=PLAIN
sasl.jaas.config=org.apache.kafka.common.security.plain.PlainLoginModule required username="admin" password="admin-secret";
```

## 停止服务

```bash
docker-compose down
```

## 关键配置说明

### 只开放认证端口

```yaml
# 只开放 9093，不开放 9092
ports:
  - "9093:9093"

# 只配置 SASL_PLAINTEXT 监听器
KAFKA_LISTENERS: SASL_PLAINTEXT://0.0.0.0:9093
KAFKA_ADVERTISED_LISTENERS: SASL_PLAINTEXT://localhost:9093
```

这样配置后：
- ✅ `localhost:9093` - 需要认证，可以连接
- ❌ `localhost:9092` - 端口未开放，无法连接
