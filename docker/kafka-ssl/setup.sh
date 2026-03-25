#!/bin/bash
# 生成 Kafka SSL 测试证书

set -e

CERT_DIR="$(dirname "$0")/certs"
mkdir -p "$CERT_DIR"
cd "$CERT_DIR"

echo "=== 生成 Kafka SSL 证书 ==="

# 1. 生成 CA 证书
echo "1. 生成 CA 证书..."
openssl req -new -x509 -keyout ca-key -out ca-cert -days 365 -subj "/CN=Kafka-Test-CA" -passout pass:ca-password

# 2. 生成 Kafka 服务器密钥库
echo "2. 生成 Kafka 服务器密钥库..."
keytool -keystore kafka.server.keystore.jks -alias localhost -validity 365 -genkey -keyalg RSA -storepass server-password -keypass server-password -dname "CN=localhost" -ext "SAN=dns:localhost,ip:127.0.0.1"

# 3. 导出服务器证书
echo "3. 导出服务器证书..."
keytool -keystore kafka.server.keystore.jks -alias localhost -certreq -file cert-file -storepass server-password

# 4. 用 CA 签名服务器证书
echo "4. 用 CA 签名服务器证书..."
openssl x509 -req -CA ca-cert -CAkey ca-key -in cert-file -out cert-signed -days 365 -CAcreateserial -passin pass:ca-password

# 5. 导入 CA 证书和签名证书到服务器密钥库
echo "5. 导入证书到服务器密钥库..."
keytool -keystore kafka.server.keystore.jks -alias CARoot -import -file ca-cert -storepass server-password -noprompt
keytool -keystore kafka.server.keystore.jks -alias localhost -import -file cert-signed -storepass server-password -noprompt

# 6. 生成服务器信任库
echo "6. 生成服务器信任库..."
keytool -keystore kafka.server.truststore.jks -alias CARoot -import -file ca-cert -storepass server-password -noprompt

# 7. 导出 CA 证书供客户端使用
cp ca-cert ca-cert.pem

echo ""
echo "=== 证书生成完成 ==="
echo "证书目录: $CERT_DIR"
echo ""
echo "生成的文件:"
ls -la
