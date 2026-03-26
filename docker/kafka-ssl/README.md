# Kafka 多协议测试环境

支持 PLAINTEXT、SSL、SASL_PLAINTEXT、SASL_SSL 四种连接方式。

## 快速启动

```bash
cd docker/kafka-ssl

# 1. 生成 SSL 证书
chmod +x setup.sh
./setup.sh

# 2. 启动服务
docker-compose up -d

# 3. 验证服务
./test.sh
```

## 服务端口

| 端口 | 协议 | 说明 |
|------|------|------|
| 9092 | PLAINTEXT | 无加密、无认证 |
| 9093 | SASL_PLAINTEXT | 无加密、SASL 认证 |
| 9094 | SSL | TLS 加密、无认证 |
| 9095 | SASL_SSL | TLS 加密 + SASL 认证 |

## Kafkit 连接配置

### 1. PLAINTEXT（无认证）
```
Bootstrap Servers: localhost:9092
协议: PLAINTEXT
认证方式: 无认证
```

### 2. SASL_PLAINTEXT + PLAIN
```
Bootstrap Servers: localhost:9093
协议: SASL_PLAINTEXT
认证方式: SASL PLAIN
用户名: admin
密码: admin-secret
```

### 3. SSL（证书认证）
```
Bootstrap Servers: localhost:9094
协议: SSL
认证方式: 无认证（单向 TLS）

证书配置:
- CA 证书: docker/kafka-ssl/certs/ca-cert.pem
```

**证书路径**: `docker/kafka-ssl/certs/ca-cert.pem`

### 4. SASL_SSL + PLAIN
```
Bootstrap Servers: localhost:9095
协议: SASL_SSL
认证方式: SASL PLAIN
用户名: admin
密码: admin-secret

证书配置:
- CA 证书: docker/kafka-ssl/certs/ca-cert.pem
```

## 预设用户

| 用户名 | 密码 | 用途 |
|--------|------|------|
| admin | admin-secret | 管理员账号 |
| alice | alice-secret | 普通用户 |
| bob | bob-secret | 普通用户 |

## 测试脚本

创建 `test.sh`：

```bash
#!/bin/bash
echo "=== 测试 Kafka 连接 ==="

echo -e "\n1. 测试 PLAINTEXT (9092)..."
docker exec kafka-ssl kafka-broker-api-versions --bootstrap-server localhost:9092 > /dev/null 2>&1 && echo "✓ PLAINTEXT 正常" || echo "✗ PLAINTEXT 失败"

echo -e "\n2. 测试 SASL_PLAINTEXT (9093)..."
docker exec kafka-ssl bash -c 'echo "security.protocol=SASL_PLAINTEXT
sasl.mechanism=PLAIN
sasl.jaas.config=org.apache.kafka.common.security.plain.PlainLoginModule required username=\"admin\" password=\"admin-secret\";" > /tmp/sasl.conf && kafka-broker-api-versions --bootstrap-server localhost:9093 --command-config /tmp/sasl.conf' > /dev/null 2>&1 && echo "✓ SASL_PLAINTEXT 正常" || echo "✗ SASL_PLAINTEXT 失败"

echo -e "\n3. 测试 SSL (9094)..."
docker exec kafka-ssl bash -c 'echo "security.protocol=SSL
ssl.truststore.location=/etc/kafka/secrets/kafka.server.truststore.jks
ssl.truststore.password=server-password" > /tmp/ssl.conf && kafka-broker-api-versions --bootstrap-server localhost:9094 --command-config /tmp/ssl.conf' > /dev/null 2>&1 && echo "✓ SSL 正常" || echo "✗ SSL 失败"

echo -e "\n4. 测试 SASL_SSL (9095)..."
docker exec kafka-ssl bash -c 'echo "security.protocol=SASL_SSL
sasl.mechanism=PLAIN
sasl.jaas.config=org.apache.kafka.common.security.plain.PlainLoginModule required username=\"admin\" password=\"admin-secret\";
ssl.truststore.location=/etc/kafka/secrets/kafka.server.truststore.jks
ssl.truststore.password=server-password" > /tmp/sasl_ssl.conf && kafka-broker-api-versions --bootstrap-server localhost:9095 --command-config /tmp/sasl_ssl.conf' > /dev/null 2>&1 && echo "✓ SASL_SSL 正常" || echo "✗ SASL_SSL 失败"

echo -e "\n=== 测试完成 ==="
```

## Kafkit 验证检查清单

- [ ] **PLAINTEXT** - 新建连接，端口 9092，无认证
- [ ] **SASL_PLAINTEXT + PLAIN** - 端口 9093，SASL PLAIN，admin/admin-secret
- [ ] **SSL** - 端口 9094，选择 SSL 协议，导入 ca-cert.pem
- [ ] **SASL_SSL + PLAIN** - 端口 9095，SSL + SASL PLAIN

## 故障排查

### 查看日志
```bash
docker-compose logs -f kafka
docker-compose logs -f zookeeper
```

### 重置环境
```bash
docker-compose down -v
docker-compose up -d
```

### 检查证书
```bash
cd docker/kafka-ssl/certs
openssl x509 -in ca-cert.pem -text -noout
```

## 证书文件

生成以下证书文件：
- `ca-cert.pem` - CA 证书（客户端使用）
- `kafka.server.keystore.jks` - 服务器密钥库
- `kafka.server.truststore.jks` - 服务器信任库
