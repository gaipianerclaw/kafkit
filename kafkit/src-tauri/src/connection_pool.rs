use crate::models::*;
use std::collections::HashMap;
use std::time::Duration;
use tokio::sync::RwLock;

use rdkafka::config::ClientConfig;
use rdkafka::producer::FutureProducer;

/// 连接池配置
pub struct ConnectionPoolConfig {
    pub max_connections: usize,
    pub idle_timeout: Duration,
}

impl Default for ConnectionPoolConfig {
    fn default() -> Self {
        Self {
            max_connections: 10,
            idle_timeout: Duration::from_secs(300),
        }
    }
}

/// 连接池管理器
pub struct ConnectionPool {
    _config: ConnectionPoolConfig,
    producers: RwLock<HashMap<String, FutureProducer>>,
}

impl ConnectionPool {
    pub fn new() -> Self {
        Self::with_config(ConnectionPoolConfig::default())
    }

    pub fn with_config(config: ConnectionPoolConfig) -> Self {
        Self {
            _config: config,
            producers: RwLock::new(HashMap::new()),
        }
    }

    /// 获取或创建 Producer
    pub async fn get_producer(&self, connection: &Connection) -> Result<FutureProducer, AppError> {
        let connection_id = connection.id.clone();
        
        // 尝试获取现有 producer
        {
            let producers = self.producers.read().await;
            if let Some(producer) = producers.get(&connection_id) {
                println!("[Kafkit] Reusing cached producer for {}", connection_id);
                return Ok(producer.clone());
            }
        }

        // 创建新的 producer
        let config = Self::create_client_config(connection)?;
        let producer: FutureProducer = config.create()
            .map_err(|e| {
                log::error!("Failed to create producer in pool for connection {}: {}", connection_id, e);
                AppError::KafkaError(format!("Failed to create producer: {}", e))
            })?;
        
        // 存入缓存
        let mut producers = self.producers.write().await;
        producers.insert(connection_id.clone(), producer.clone());
        
        println!("[Kafkit] Created new producer for {}", connection_id);
        Ok(producer)
    }

    /// 移除连接
    pub async fn remove_connection(&self, connection_id: &str) {
        let mut producers = self.producers.write().await;
        producers.remove(connection_id);
        
        println!("[Kafkit] Removed connection from pool: {}", connection_id);
    }

    /// 创建 Kafka 客户端配置
    fn create_client_config(connection: &Connection) -> Result<ClientConfig, AppError> {
        let mut config = ClientConfig::new();
        
        let brokers = connection.bootstrap_servers.join(",");
        config.set("bootstrap.servers", &brokers);
        config.set("client.id", &format!("kafkit-{}", connection.id));
        config.set("socket.timeout.ms", "10000");
        config.set("metadata.request.timeout.ms", "10000");
        config.set("request.timeout.ms", "30000");
        
        // 重试配置
        config.set("retries", "3");
        config.set("retry.backoff.ms", "1000");
        
        match connection.security.protocol {
            SecurityProtocol::Plaintext => {
                config.set("security.protocol", "PLAINTEXT");
            }
            SecurityProtocol::Ssl => {
                config.set("security.protocol", "SSL");
                if let AuthConfig::Ssl { ca_cert, client_cert, client_key } = &connection.auth {
                    if let Some(ca_path) = ca_cert {
                        config.set("ssl.ca.location", ca_path);
                    }
                    if let Some(cert_path) = client_cert {
                        config.set("ssl.certificate.location", cert_path);
                    }
                    if let Some(key_path) = client_key {
                        config.set("ssl.key.location", key_path);
                    }
                    let verify_hostname = connection.security.ssl_verify_hostname.unwrap_or(true);
                    config.set("ssl.endpoint.identification.algorithm", 
                        if verify_hostname { "https" } else { "none" });
                }
            }
            SecurityProtocol::SaslPlaintext => {
                config.set("security.protocol", "SASL_PLAINTEXT");
                Self::configure_sasl(&mut config, &connection.auth)?;
            }
            SecurityProtocol::SaslSsl => {
                config.set("security.protocol", "SASL_SSL");
                Self::configure_sasl(&mut config, &connection.auth)?;
            }
        }
        
        Ok(config)
    }

    /// 配置 SASL
    fn configure_sasl(config: &mut ClientConfig, auth: &AuthConfig) -> Result<(), AppError> {
        match auth {
            AuthConfig::SaslPlain { username, password, .. } => {
                config.set("sasl.mechanism", "PLAIN");
                config.set("sasl.username", username);
                config.set("sasl.password", password);
            }
            AuthConfig::SaslScram { mechanism, username, password, .. } => {
                let mechanism_str = match mechanism {
                    ScramMechanism::Sha256 => "SCRAM-SHA-256",
                    ScramMechanism::Sha512 => "SCRAM-SHA-512",
                };
                config.set("sasl.mechanism", mechanism_str);
                config.set("sasl.username", username);
                config.set("sasl.password", password);
            }
            _ => {}
        }
        Ok(())
    }
}
