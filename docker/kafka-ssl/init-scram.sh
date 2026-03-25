#!/bin/bash
# 初始化 SCRAM 用户

echo "=== 初始化 SCRAM 用户 ==="

# 等待 Kafka 启动
sleep 10

# 创建 SCRAM-SHA-256 用户
kafka-configs --bootstrap-server localhost:9092 --alter \
  --add-config 'SCRAM-SHA-256=[iterations=4096,password=admin-secret]' \
  --entity-type users --entity-name admin-scram256

echo "SCRAM-SHA-256 用户创建完成: admin-scram256 / admin-secret"

# 创建 SCRAM-SHA-512 用户
kafka-configs --bootstrap-server localhost:9092 --alter \
  --add-config 'SCRAM-SHA-512=[iterations=4096,password=admin-secret]' \
  --entity-type users --entity-name admin-scram512

echo "SCRAM-SHA-512 用户创建完成: admin-scram512 / admin-secret"

echo "=== SCRAM 用户初始化完成 ==="
