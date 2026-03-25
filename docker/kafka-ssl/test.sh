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
