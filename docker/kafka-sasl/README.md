# Kafka SASL/PLAIN 认证测试环境

这是一个带 SASL/PLAIN 认证的单节点 Kafka 测试环境。

## 快速启动

```bash
cd docker/kafka-sasl

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f kafka
```

## 服务端口

| 服务 | 端口 | 说明 |
|------|------|------|
| Kafka (PLAINTEXT) | 9092 | 无认证端口 |
| Kafka (SASL_PLAINTEXT) | 9093 | SASL/PLAIN 认证端口 |
| Zookeeper | 2181 | Zookeeper 端口 |
| Kafka UI | 8080 | Web 管理界面 |

## 预设用户

| 用户名 | 密码 | 用途 |
|--------|------|------|
| admin | admin-secret | 管理员账号 |
| alice | alice-secret | 普通用户 |
| bob | bob-secret | 普通用户 |

## Kafkit 连接配置

### 无认证连接（测试对比）
- **Bootstrap Servers**: `localhost:9092`
- **协议**: `PLAINTEXT`
- **认证方式**: `无认证`

### SASL/PLAIN 认证连接
- **Bootstrap Servers**: `localhost:9093`
- **协议**: `SASL_PLAINTEXT`
- **认证方式**: `SASL PLAIN`
- **用户名**: `admin` (或 alice, bob)
- **密码**: `admin-secret` (或对应密码)

### SASL_SSL 认证连接（需要证书）
如果需要测试 SSL + SASL，可以使用自签名证书：

```bash
# 生成自签名证书（在 docker/kafka-sasl 目录执行）
mkdir -p certs
cd certs

# 生成 CA 证书
openssl req -new -x509 -keyout ca-key -out ca-cert -days 365 -subj "/CN=Kafka-Test-CA"

# 生成 Kafka 服务器证书
keytool -keystore kafka.server.keystore.jks -alias localhost -validity 365 -genkey -keyalg RSA -storepass kafka-server-password -keypass kafka-server-password -dname "CN=localhost"

# 更多步骤...（略）
```

## 测试命令行工具

```bash
# 进入 Kafka 容器
docker exec -it kafka-sasl bash

# 创建 topic（使用 SASL 认证）
kafka-topics \
  --bootstrap-server localhost:9093 \
  --command-config /etc/kafka/client.properties \
  --create \
  --topic test-topic \
  --partitions 1 \
  --replication-factor 1

# 查看 topic 列表
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
  --topic test-topic \
  --from-beginning
```

## Kafka UI 访问

打开浏览器访问 http://localhost:8080，可以图形化管理 Kafka 集群。

## 常见问题

### 1. 连接失败 "Authentication failed"
- 检查用户名密码是否正确
- 检查端口是否是 9093（SASL 端口）
- 检查协议是否选择 SASL_PLAINTEXT

### 2. 容器启动失败
```bash
# 清理并重新启动
docker-compose down -v
docker-compose up -d
```

### 3. 查看详细日志
```bash
docker-compose logs -f kafka | grep -i "sasl\|auth\|error"
```

## 停止服务

```bash
docker-compose down

# 清理数据卷
docker-compose down -v
```
