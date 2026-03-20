use crate::models::*;
use crate::models::BatchProduceError;
use std::sync::Arc;
use std::collections::HashMap;
use tokio::sync::Mutex;
use tokio::net::TcpStream;
use std::time::Duration;

// rdkafka 客户端
use rdkafka::config::ClientConfig;
use rdkafka::consumer::{BaseConsumer, Consumer as KafkaConsumer};
use rdkafka::consumer::StreamConsumer;
use rdkafka::Message as KafkaMessageTrait;
use rdkafka::topic_partition_list::TopicPartitionList;
use rdkafka::Offset as KafkaOffset;
use rdkafka::admin::{AdminClient, AdminOptions, NewTopic, TopicReplication};
use rdkafka::client::DefaultClientContext;
use rdkafka::producer::{FutureProducer, FutureRecord};
use rdkafka::util::Timeout;
use rdkafka::consumer::CommitMode;

// 连接池 - 存储已创建的客户端
pub struct ConnectionManager {
    clients: Mutex<HashMap<String, BaseConsumer>>,
    producers: Mutex<HashMap<String, FutureProducer>>,
}

impl ConnectionManager {
    pub fn new() -> Self {
        Self {
            clients: Mutex::new(HashMap::new()),
            producers: Mutex::new(HashMap::new()),
        }
    }

    /// 创建 Kafka 客户端配置
    fn create_client_config(connection: &Connection) -> Result<ClientConfig, AppError> {
        let mut config = ClientConfig::new();
        
        // 设置 bootstrap servers
        let brokers = connection.bootstrap_servers.join(",");
        config.set("bootstrap.servers", &brokers);
        
        // 设置客户端 ID
        config.set("client.id", &format!("kafkit-{}", connection.id));
        
        // 设置 socket 超时
        config.set("socket.timeout.ms", "10000");
        config.set("metadata.request.timeout.ms", "10000");
        
        println!("[Kafkit] Configuring for security protocol: {:?}", connection.security.protocol);
        
        // 根据安全协议配置
        match connection.security.protocol {
            SecurityProtocol::Plaintext => {
                config.set("security.protocol", "PLAINTEXT");
            }
            SecurityProtocol::Ssl => {
                config.set("security.protocol", "SSL");
                
                // SSL 证书配置
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
                    // 默认验证主机名
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
                
                // SSL 配置
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
                
                // SASL 配置
                Self::configure_sasl(&mut config, &connection.auth)?;
            }
        }
        
        Ok(config)
    }
    
    /// 配置 SASL 认证
    fn configure_sasl(config: &mut ClientConfig, auth: &AuthConfig) -> Result<(), AppError> {
        match auth {
            AuthConfig::SaslPlain { username, password } => {
                config.set("sasl.mechanism", "PLAIN");
                config.set("sasl.username", username);
                config.set("sasl.password", password);
            }
            AuthConfig::SaslScram { mechanism, username, password } => {
                let mechanism_str = match mechanism {
                    ScramMechanism::Sha256 => "SCRAM-SHA-256",
                    ScramMechanism::Sha512 => "SCRAM-SHA-512",
                };
                config.set("sasl.mechanism", mechanism_str);
                config.set("sasl.username", username);
                config.set("sasl.password", password);
            }
            AuthConfig::SaslGssapi { principal, keytab_path, service_name } => {
                config.set("sasl.mechanism", "GSSAPI");
                config.set("sasl.kerberos.principal", principal);
                config.set("sasl.kerberos.service.name", service_name);
                if let Some(keytab) = keytab_path {
                    config.set("sasl.kerberos.keytab", keytab);
                }
            }
            _ => {
                return Err(AppError::InvalidConfig(
                    "SASL authentication required but not provided".to_string()
                ));
            }
        }
        Ok(())
    }

    /// 获取或创建 Kafka 客户端
    async fn get_client(&self, connection: &Connection) -> Result<BaseConsumer, AppError> {
        let mut clients = self.clients.lock().await;
        
        // 检查是否已有缓存的客户端
        if let Some(client) = clients.get(&connection.id) {
            // 测试客户端是否可用
            match client.fetch_metadata(None, Duration::from_secs(5)) {
                Ok(_) => {
                    println!("[Kafkit] Using cached client for connection: {}", connection.id);
                    // 需要克隆客户端，但 BaseConsumer 不能 Clone，所以重新创建
                    // 移除旧客户端，创建新的
                }
                Err(e) => {
                    println!("[Kafkit] Cached client stale: {}, reconnecting", e);
                    clients.remove(&connection.id);
                }
            }
        }

        // 创建新的客户端
        println!("[Kafkit] Creating new Kafka client for: {}", connection.bootstrap_servers.join(","));
        let config = Self::create_client_config(connection)?;
        let client: BaseConsumer = config.create()
            .map_err(|e| AppError::KafkaError(format!("Failed to create Kafka client: {}", e)))?;
        
        // 测试连接
        client.fetch_metadata(None, Duration::from_secs(10))
            .map_err(|e| AppError::KafkaError(format!("Failed to connect to Kafka: {}", e)))?;
        
        println!("[Kafkit] Successfully connected to Kafka cluster");
        
        // 由于不能 Clone，我们存储客户端并返回（需要处理生命周期）
        // 实际上 rdkafka 的 BaseConsumer 是线程安全的，可以通过 Arc 共享
        // 但这里为了简单，我们每次都创建新客户端，不缓存
        
        Ok(client)
    }

    /// 测试 Kafka 连接
    pub async fn test_connection(&self, config: &ConnectionConfig) -> Result<(), AppError> {
        println!("[Kafkit] Testing connection to: {}", config.bootstrap_servers);
        
        // 解析服务器地址并进行 TCP 测试
        let servers: Vec<String> = config.bootstrap_servers.split(',')
            .map(|s| s.trim().to_string())
            .collect();
        if servers.is_empty() {
            return Err(AppError::InvalidConfig("No bootstrap servers provided".to_string()));
        }

        // 尝试连接第一个可用的 broker
        let mut last_error = None;
        
        for server in &servers {
            println!("[Kafkit] Trying TCP connection to: {}", server);
            
            let parts: Vec<&str> = server.split(':').collect();
            if parts.len() != 2 {
                last_error = Some(format!("Invalid address format: {}", server));
                continue;
            }
            
            let host = parts[0];
            let port: u16 = parts[1].parse().map_err(|_| {
                AppError::InvalidConfig(format!("Invalid port number: {}", parts[1]))
            })?;

            match tokio::time::timeout(
                Duration::from_secs(5),
                TcpStream::connect((host, port))
            ).await {
                Ok(Ok(_)) => {
                    println!("[Kafkit] TCP connection successful to {}", server);
                    // TCP 连接成功，继续验证 Kafka 协议
                }
                Ok(Err(e)) => {
                    println!("[Kafkit] TCP failed to {}: {}", server, e);
                    last_error = Some(format!("{}: {}", server, e));
                    continue;
                }
                Err(_) => {
                    println!("[Kafkit] TCP timeout to {}", server);
                    last_error = Some(format!("{}: Connection timeout", server));
                    continue;
                }
            }
        }
        
        if last_error.is_some() && servers.iter().all(|s| {
            !s.starts_with("localhost") && !s.starts_with("127.0.0.1")
        }) {
            // 所有服务器都连接失败
            return Err(AppError::KafkaError(
                format!("Could not connect to any broker. Last error: {}", 
                    last_error.unwrap_or_else(|| "Unknown".to_string()))
            ));
        }

        // 尝试完整的 Kafka 连接验证
        println!("[Kafkit] Testing Kafka protocol connection...");
        
        // 创建一个临时连接来测试
        let mut test_config = ClientConfig::new();
        test_config.set("bootstrap.servers", &config.bootstrap_servers);
        test_config.set("client.id", "kafkit-test");
        test_config.set("socket.timeout.ms", "10000");
        test_config.set("metadata.request.timeout.ms", "10000");
        
        // 根据安全协议添加配置
        match config.security.protocol {
            SecurityProtocol::Plaintext => {
                test_config.set("security.protocol", "PLAINTEXT");
            }
            SecurityProtocol::Ssl => {
                test_config.set("security.protocol", "SSL");
                if let AuthConfig::Ssl { ca_cert, client_cert, client_key } = &config.auth {
                    if let Some(ca_path) = ca_cert {
                        test_config.set("ssl.ca.location", ca_path);
                    }
                    if let Some(cert_path) = client_cert {
                        test_config.set("ssl.certificate.location", cert_path);
                    }
                    if let Some(key_path) = client_key {
                        test_config.set("ssl.key.location", key_path);
                    }
                }
            }
            SecurityProtocol::SaslPlaintext => {
                test_config.set("security.protocol", "SASL_PLAINTEXT");
                Self::configure_sasl_for_test(&mut test_config, &config.auth)?;
            }
            SecurityProtocol::SaslSsl => {
                test_config.set("security.protocol", "SASL_SSL");
                if let AuthConfig::Ssl { ca_cert, client_cert, client_key } = &config.auth {
                    if let Some(ca_path) = ca_cert {
                        test_config.set("ssl.ca.location", ca_path);
                    }
                    if let Some(cert_path) = client_cert {
                        test_config.set("ssl.certificate.location", cert_path);
                    }
                    if let Some(key_path) = client_key {
                        test_config.set("ssl.key.location", key_path);
                    }
                }
                Self::configure_sasl_for_test(&mut test_config, &config.auth)?;
            }
        }
        
        let test_client: BaseConsumer = test_config.create()
            .map_err(|e| AppError::KafkaError(format!("Failed to create test client: {}", e)))?;
        
        test_client.fetch_metadata(None, Duration::from_secs(10))
            .map_err(|e| AppError::KafkaError(format!("Failed to fetch metadata: {}", e)))?;
        
        println!("[Kafkit] Kafka connection test successful");
        Ok(())
    }
    
    fn configure_sasl_for_test(config: &mut ClientConfig, auth: &AuthConfig) -> Result<(), AppError> {
        match auth {
            AuthConfig::SaslPlain { username, password } => {
                config.set("sasl.mechanism", "PLAIN");
                config.set("sasl.username", username);
                config.set("sasl.password", password);
            }
            AuthConfig::SaslScram { mechanism, username, password } => {
                let mechanism_str = match mechanism {
                    ScramMechanism::Sha256 => "SCRAM-SHA-256",
                    ScramMechanism::Sha512 => "SCRAM-SHA-512",
                };
                config.set("sasl.mechanism", mechanism_str);
                config.set("sasl.username", username);
                config.set("sasl.password", password);
            }
            AuthConfig::SaslGssapi { principal, keytab_path, service_name } => {
                config.set("sasl.mechanism", "GSSAPI");
                config.set("sasl.kerberos.principal", principal);
                config.set("sasl.kerberos.service.name", service_name);
                if let Some(keytab) = keytab_path {
                    config.set("sasl.kerberos.keytab", keytab);
                }
            }
            _ => {}
        }
        Ok(())
    }

    /// 获取真实的 Topic 列表
    pub async fn list_topics(&self, connection: &Connection) -> Result<Vec<TopicInfo>, AppError> {
        println!("[Kafkit] Fetching topic list from: {}", connection.bootstrap_servers.join(","));
        
        let client = self.get_client(connection).await?;
        
        // 获取元数据
        let metadata = client.fetch_metadata(None, Duration::from_secs(10))
            .map_err(|e| AppError::KafkaError(format!("Failed to fetch metadata: {}", e)))?;
        
        let mut topic_list = Vec::new();
        
        for topic in metadata.topics() {
            let topic_name = topic.name().to_string();
            
            // 获取分区信息
            let partitions = topic.partitions();
            let partition_count = partitions.len() as i32;
            
            // 获取复制因子（从第一个分区的副本数）
            let replication_factor = if let Some(first_partition) = partitions.first() {
                first_partition.replicas().len() as i32
            } else {
                1
            };
            
            // 判断是否为内部 topic
            let is_internal = topic_name.starts_with("__") || topic_name.starts_with("_");
            
            topic_list.push(TopicInfo {
                name: topic_name,
                partition_count,
                replication_factor,
                is_internal,
            });
            
            println!("[Kafkit] Found topic: {} ({} partitions, {} replicas)", 
                topic_list.last().unwrap().name,
                partition_count,
                replication_factor
            );
        }
        
        // 按名称排序
        topic_list.sort_by(|a, b| a.name.cmp(&b.name));
        
        println!("[Kafkit] Total topics found: {}", topic_list.len());
        Ok(topic_list)
    }

    /// 获取 Topic 详情（包含分区、副本、ISR、Offset 信息）
    pub async fn get_topic_detail(&self, connection: &Connection, topic_name: &str) -> Result<TopicDetail, AppError> {
        println!("[Kafkit] Getting topic detail: {} from {}", topic_name, connection.name);
        
        let client = self.get_client(connection).await?;
        
        // 获取 topic 的元数据
        let metadata = client.fetch_metadata(Some(topic_name), Duration::from_secs(10))
            .map_err(|e| AppError::KafkaError(format!("Failed to fetch topic metadata: {}", e)))?;
        
        let topic_metadata = metadata.topics()
            .iter()
            .find(|t| t.name() == topic_name)
            .ok_or_else(|| AppError::KafkaError(format!("Topic not found: {}", topic_name)))?;
        
        let mut partitions = Vec::new();
        
        for partition in topic_metadata.partitions() {
            let partition_id = partition.id() as i32;
            
            // 获取 leader (rdkafka 返回 i32)
            let leader = partition.leader();
            
            // 获取 replicas
            let replicas: Vec<i32> = partition.replicas()
                .iter()
                .map(|&r| r as i32)
                .collect();
            
            // 获取 ISR (In-Sync Replicas)
            let isr: Vec<i32> = partition.isr()
                .iter()
                .map(|&r| r as i32)
                .collect();
            
            // 获取 offset 信息
            let (earliest_offset, latest_offset) = match client.fetch_watermarks(
                topic_name, 
                partition.id(), 
                Duration::from_secs(5)
            ) {
                Ok((low, high)) => (low, high),
                Err(e) => {
                    println!("[Kafkit] Failed to fetch watermarks for partition {}: {}", partition_id, e);
                    (0, 0)
                }
            };
            
            let message_count = latest_offset.saturating_sub(earliest_offset);
            
            println!("[Kafkit] Partition {}: leader={}, replicas={:?}, ISR={:?}, offsets=[{} - {}], messages={}",
                partition_id, leader, replicas, isr, earliest_offset, latest_offset, message_count);
            
            partitions.push(PartitionInfo {
                partition: partition_id,
                leader,
                replicas,
                isr,
                earliest_offset,
                latest_offset,
                message_count,
            });
        }
        
        // 按分区 ID 排序
        partitions.sort_by_key(|p| p.partition);
        
        Ok(TopicDetail {
            name: topic_name.to_string(),
            partitions,
            configs: vec![], // TODO: 使用 AdminClient 获取 topic 配置
        })
    }

    /// 创建 Topic
    pub async fn create_topic(
        &self,
        connection: &Connection,
        name: &str,
        num_partitions: i32,
        replication_factor: i32,
    ) -> Result<(), AppError> {
        println!(
            "[Kafkit] Creating topic: {} with {} partitions, replication factor: {}",
            name, num_partitions, replication_factor
        );

        // 创建 AdminClient 配置
        let config = Self::create_client_config(connection)?;
        
        // 创建 AdminClient
        let admin: AdminClient<DefaultClientContext> = config.create()
            .map_err(|e| AppError::KafkaError(format!("Failed to create admin client: {}", e)))?;

        // 创建 NewTopic
        let new_topic = NewTopic::new(
            name,
            num_partitions,
            TopicReplication::Fixed(replication_factor),
        );

        // 创建 topic
        let opts = AdminOptions::new();
        let results = admin.create_topics(&[new_topic], &opts)
            .await
            .map_err(|e| AppError::KafkaError(format!("Failed to create topic: {}", e)))?;

        // 检查结果
        for result in results {
            match result {
                Ok(topic) => {
                    println!("[Kafkit] Successfully created topic: {}", topic);
                }
                Err((topic, err)) => {
                    let msg = format!("Failed to create topic {}: {}", topic, err);
                    println!("[Kafkit] {}", msg);
                    return Err(AppError::KafkaError(msg));
                }
            }
        }

        println!("[Kafkit] Topic '{}' created successfully", name);
        Ok(())
    }

    /// 删除 Topic
    pub async fn delete_topic(
        &self,
        connection: &Connection,
        name: &str,
    ) -> Result<(), AppError> {
        println!("[Kafkit] Deleting topic: {}", name);

        // 创建 AdminClient 配置
        let config = Self::create_client_config(connection)?;
        
        // 创建 AdminClient
        let admin: AdminClient<DefaultClientContext> = config.create()
            .map_err(|e| AppError::KafkaError(format!("Failed to create admin client: {}", e)))?;

        // 删除 topic
        let opts = AdminOptions::new();
        let results = admin.delete_topics(&[name], &opts)
            .await
            .map_err(|e| AppError::KafkaError(format!("Failed to delete topic: {}", e)))?;

        // 检查结果
        for result in results {
            match result {
                Ok(topic) => {
                    println!("[Kafkit] Successfully deleted topic: {}", topic);
                }
                Err((topic, err)) => {
                    // 忽略 UnknownTopicOrPartition 错误（topic 不存在）
                    if err.to_string().contains("UnknownTopicOrPartition") {
                        println!("[Kafkit] Topic {} does not exist, treating as success", topic);
                    } else {
                        let msg = format!("Failed to delete topic {}: {}", topic, err);
                        println!("[Kafkit] {}", msg);
                        return Err(AppError::KafkaError(msg));
                    }
                }
            }
        }

        println!("[Kafkit] Topic '{}' deleted successfully", name);
        Ok(())
    }

    /// 获取或创建 Producer
    async fn get_producer(&self, connection: &Connection) -> Result<FutureProducer, AppError> {
        let mut producers = self.producers.lock().await;
        
        // 检查是否已有缓存的 producer
        if let Some(producer) = producers.get(&connection.id) {
            println!("[Kafkit] Using cached producer for connection: {}", connection.id);
            return Ok(producer.clone());
        }

        // 创建新的 Producer
        println!("[Kafkit] Creating new Kafka producer for: {}", connection.bootstrap_servers.join(","));
        let config = Self::create_client_config(connection)?;
        
        // Producer 特定配置
        let mut producer_config = config;
        producer_config.set("acks", "all");
        producer_config.set("retries", "3");
        producer_config.set("max.in.flight.requests.per.connection", "5");
        producer_config.set("compression.type", "snappy");
        
        let producer: FutureProducer = producer_config.create()
            .map_err(|e| AppError::KafkaError(format!("Failed to create producer: {}", e)))?;
        
        println!("[Kafkit] Producer created successfully");
        producers.insert(connection.id.clone(), producer.clone());
        
        Ok(producer)
    }

    /// 发送消息
    pub async fn produce_message(
        &self, 
        connection: &Connection, 
        topic: &str, 
        message: ProduceMessage
    ) -> Result<ProduceResult, AppError> {
        println!("[Kafkit] Producing message to topic: {}", topic);
        
        let producer = self.get_producer(connection).await?;
        
        // 创建消息记录
        let mut record = FutureRecord::to(topic);
        
        // 设置消息内容
        record = record.payload(&message.value);
        
        // 设置 key（如果有）
        if let Some(key) = &message.key {
            record = record.key(key.as_bytes());
        }
        
        // 设置 partition（如果有）
        if let Some(partition) = message.partition {
            record = record.partition(partition);
        }
        
        // 发送消息
        let delivery = producer.send(
            record,
            Timeout::After(Duration::from_secs(10))
        ).await;
        
        match delivery {
            Ok((partition, offset)) => {
                println!("[Kafkit] Message sent successfully to partition {} at offset {}", partition, offset);
                Ok(ProduceResult {
                    partition,
                    offset,
                    timestamp: chrono::Utc::now().timestamp_millis(),
                })
            }
            Err((e, _)) => {
                let error_msg = format!("Failed to send message: {}", e);
                println!("[Kafkit] {}", error_msg);
                Err(AppError::KafkaError(error_msg))
            }
        }
    }

    /// 批量发送消息
    pub async fn produce_batch(
        &self,
        connection: &Connection,
        topic: &str,
        messages: Vec<ProduceMessage>,
        _options: Option<BatchProduceOptions>,
    ) -> Result<BatchProduceResult, AppError> {
        println!("[Kafkit] Producing {} messages to topic: {}", messages.len(), topic);
        
        let producer = self.get_producer(connection).await?;
        
        let mut success = 0i32;
        let mut failed = 0i32;
        let mut errors: Vec<BatchProduceError> = vec![];
        
        for (i, message) in messages.iter().enumerate() {
            // 创建消息记录
            let mut record = FutureRecord::to(topic);
            record = record.payload(&message.value);
            
            if let Some(key) = &message.key {
                record = record.key(key.as_bytes());
            }
            
            if let Some(partition) = message.partition {
                record = record.partition(partition);
            }
            
            // 发送消息
            match producer.send(record, Timeout::After(Duration::from_secs(10))).await {
                Ok((partition, offset)) => {
                    println!("[Kafkit] Message {} sent to partition {} at offset {}", i, partition, offset);
                    success += 1;
                }
                Err((e, _)) => {
                    let error_msg = format!("Message {} failed: {}", i, e);
                    println!("[Kafkit] {}", error_msg);
                    failed += 1;
                    errors.push(BatchProduceError {
                        index: i as i32,
                        error: error_msg,
                    });
                }
            }
        }
        
        println!("[Kafkit] Batch produce complete: {} success, {} failed", success, failed);
        
        Ok(BatchProduceResult {
            success,
            failed,
            errors,
        })
    }

    pub async fn close_connection(&self, connection_id: &str) {
        let mut clients = self.clients.lock().await;
        clients.remove(connection_id);
        let mut producers = self.producers.lock().await;
        producers.remove(connection_id);
        println!("[Kafkit] Closed connection: {}", connection_id);
    }

    /// 列出所有 Consumer Groups
    pub async fn list_consumer_groups(&self, _connection: &Connection) -> Result<Vec<ConsumerGroupInfo>, AppError> {
        println!("[Kafkit] Listing consumer groups - feature temporarily disabled due to rdkafka API limitations");
        // 暂时返回空列表
        // rdkafka 0.36 的 fetch_group_list 存在内存安全问题
        // AdminClient 没有 list_groups 和 describe_consumer_groups 方法
        Ok(vec![])
    }

    /// 获取 Consumer Group 的消费延迟 (Lag)
    pub async fn get_consumer_lag(
        &self,
        _connection: &Connection,
        _group_id: &str,
    ) -> Result<Vec<PartitionLag>, AppError> {
        println!("[Kafkit] Getting consumer lag - feature temporarily disabled");
        // 暂时返回空列表
        Ok(vec![])
    }
    
    /// 获取 Consumer Group 的消费延迟 (Lag) - 原始实现待修复
    #[allow(dead_code)]
    async fn _get_consumer_lag_impl(
        &self,
        connection: &Connection,
        _group_id: &str,
    ) -> Result<Vec<PartitionLag>, AppError> {
        let client = self.get_client(connection).await?;
        
        // 遍历所有 topics 获取 committed offsets
        let mut result = Vec::new();
        
        // 尝试获取所有 topics 的 committed offsets
        // 先获取所有 topics
        let metadata = client.fetch_metadata(None, Duration::from_secs(10))
            .map_err(|e| AppError::KafkaError(format!("Failed to fetch metadata: {}", e)))?;
        
        for topic in metadata.topics() {
            let topic_name = topic.name();
            
            // 构建 TopicPartitionList
            let mut tpl = TopicPartitionList::new();
            for partition in topic.partitions() {
                tpl.add_partition(topic_name, partition.id());
            }
            
            if tpl.count() == 0 {
                continue;
            }
            
            // 获取 committed offsets
            match client.committed_offsets(tpl.clone(), Duration::from_secs(10)) {
                Ok(committed) => {
                    // 遍历 committed offsets - 使用 elements() 方法
                    for el in committed.elements() {
                        let topic: &str = el.topic();
                        let partition: i32 = el.partition();
                        let offset = el.offset();
                        
                        // 获取 log end offset
                        match client.fetch_watermarks(topic, partition, Duration::from_secs(5)) {
                            Ok((_, high)) => {
                                let current_offset = offset.to_raw().unwrap_or(-1);
                                let lag = if current_offset >= 0 {
                                    high.saturating_sub(current_offset)
                                } else {
                                    high
                                };
                                
                                if current_offset >= 0 || lag > 0 {
                                    result.push(PartitionLag {
                                        topic: topic.to_string(),
                                        partition,
                                        current_offset,
                                        log_end_offset: high,
                                        lag,
                                    });
                                }
                            }
                            Err(e) => {
                                println!("[Kafkit] Failed to fetch watermarks for {}-{}: {}", topic, partition, e);
                            }
                        }
                    }
                }
                Err(e) => {
                    println!("[Kafkit] Failed to fetch committed offsets for topic {}: {}", topic_name, e);
                }
            }
        }
        
        println!("[Kafkit] Found {} partitions with lag info", result.len());
        Ok(result)
    }

    /// 重置 Consumer Group 的 Offset
    pub async fn reset_consumer_offset(
        &self,
        connection: &Connection,
        group_id: &str,
        topic: &str,
        partition: Option<i32>,
        reset_to: &OffsetResetSpec,
    ) -> Result<(), AppError> {
        println!("[Kafkit] Resetting offset for group: {}, topic: {:?}", group_id, topic);
        
        // 创建消费者用于获取 offset 信息
        let consumer_config = Self::create_client_config(connection)?;
        let consumer: BaseConsumer = consumer_config.create()
            .map_err(|e| AppError::KafkaError(format!("Failed to create consumer: {}", e)))?;
        
        // 构建 TopicPartitionList
        let mut tpl = TopicPartitionList::new();
        
        if let Some(p) = partition {
            tpl.add_partition(topic, p);
        } else {
            // 获取 topic 的所有分区
            let metadata = consumer.fetch_metadata(Some(topic), Duration::from_secs(10))
                .map_err(|e| AppError::KafkaError(format!("Failed to fetch metadata: {}", e)))?;
            
            for topic_meta in metadata.topics() {
                if topic_meta.name() == topic {
                    for partition_meta in topic_meta.partitions() {
                        tpl.add_partition(topic, partition_meta.id());
                    }
                }
            }
        }
        
        // 根据 reset_to 类型确定目标 offset
        for el in tpl.elements() {
            let t = el.topic();
            let p = el.partition();
            
            let target_offset = match reset_to {
                OffsetResetSpec::Earliest => {
                    // 获取 earliest offset
                    let (low, _) = consumer.fetch_watermarks(t, p, Duration::from_secs(5))
                        .map_err(|e| AppError::KafkaError(format!("Failed to fetch watermarks: {}", e)))?;
                    low
                }
                OffsetResetSpec::Latest => {
                    // 获取 latest offset
                    let (_, high) = consumer.fetch_watermarks(t, p, Duration::from_secs(5))
                        .map_err(|e| AppError::KafkaError(format!("Failed to fetch watermarks: {}", e)))?;
                    high
                }
                OffsetResetSpec::Timestamp { timestamp: _ } => {
                    // 通过时间戳查找 offset - 简化为使用 earliest
                    // 实际实现需要使用 offsets_for_times
                    let (low, _) = consumer.fetch_watermarks(t, p, Duration::from_secs(5))
                        .map_err(|e| AppError::KafkaError(format!("Failed to fetch watermarks: {}", e)))?;
                    println!("[Kafkit] Timestamp reset not fully implemented, using earliest offset");
                    low
                }
                OffsetResetSpec::Offset { offset } => {
                    // 直接使用指定的 offset
                    *offset
                }
            };
            
            println!("[Kafkit] Would reset {}-{} to offset {} (target offset calculated)", t, p, target_offset);
        }
        
        // 注意：rdkafka 的 Rust 版本中没有直接的 alter_consumer_group_offsets 方法
        // 这需要通过 AdminClient 或手动创建 consumer 并提交 offset 来实现
        // 目前仅计算目标 offset，实际重置需要使用 Kafka 的 admin 工具或脚本
        
        println!("[Kafkit] Offset reset target calculated for group: {} (actual reset requires admin operations)", group_id);
        Ok(())
    }
}

use tokio::sync::mpsc;
use tokio::task::JoinHandle;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc as StdArc;

// 类型别名简化 StreamConsumer 类型
type KafkaStreamConsumer = StreamConsumer;

pub struct ConsumerService {
    active_consumers: Mutex<HashMap<String, (JoinHandle<()>, StdArc<AtomicBool>)>>,
}

impl ConsumerService {
    pub fn new(_connection_manager: Arc<ConnectionManager>) -> Self {
        Self {
            active_consumers: Mutex::new(HashMap::new()),
        }
    }

    /// 开始消费消息
    pub async fn start_consuming(
        &self,
        connection: &Connection,
        topic: &str,
        partition: Option<i32>,
        start_offset: OffsetSpec,
        window: tauri::Window,
    ) -> Result<String, AppError> {
        let session_id = format!("session-{}", uuid::Uuid::new_v4());
        println!("[Kafkit] Starting consumer session: {} for topic: {} with offset: {:?}", session_id, topic, start_offset);

        // 根据 OffsetSpec 确定 auto.offset.reset 和具体 offset
        let (auto_offset_reset, specific_offset): (&str, Option<i64>) = match &start_offset {
            OffsetSpec::Latest => ("latest", None),
            OffsetSpec::Earliest => ("earliest", None),
            OffsetSpec::Timestamp { timestamp } => {
                // 时间戳消费，需要查询对应的 offset
                println!("[Kafkit] Timestamp-based consumption requested: {} ({})", timestamp, 
                    chrono::DateTime::from_timestamp_millis(*timestamp)
                        .map(|d| d.to_rfc3339())
                        .unwrap_or_default());
                
                // 查询时间戳对应的 offset
                let offset = Self::lookup_offset_for_timestamp(
                    connection, topic, partition, *timestamp
                ).await?;
                
                println!("[Kafkit] Resolved timestamp {} to offset {}", timestamp, offset);
                ("earliest", Some(offset))
            }
            OffsetSpec::Offset { offset } => ("earliest", Some(*offset)),
        };

        // 创建消费者配置
        let mut config = ClientConfig::new();
        config.set("bootstrap.servers", &connection.bootstrap_servers.join(","));
        config.set("group.id", &format!("kafkit-consumer-{}", session_id));
        config.set("client.id", &format!("kafkit-consumer-{}", session_id));
        config.set("enable.auto.commit", "false");
        config.set("auto.offset.reset", auto_offset_reset);
        config.set("socket.timeout.ms", "10000");

        // 根据安全协议配置
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
                }
            }
            SecurityProtocol::SaslPlaintext => {
                config.set("security.protocol", "SASL_PLAINTEXT");
                Self::configure_sasl_consumer(&mut config, &connection.auth)?;
            }
            SecurityProtocol::SaslSsl => {
                config.set("security.protocol", "SASL_SSL");
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
                }
                Self::configure_sasl_consumer(&mut config, &connection.auth)?;
            }
        }

        let consumer: KafkaStreamConsumer = config.create()
            .map_err(|e| AppError::KafkaError(format!("Failed to create consumer: {}", e)))?;

        // 订阅 topic
        if let Some(partition_id) = partition {
            // 指定分区消费
            let mut tpl = TopicPartitionList::new();
            let offset = specific_offset
                .map(KafkaOffset::Offset)
                .unwrap_or_else(|| match auto_offset_reset {
                    "earliest" => KafkaOffset::Beginning,
                    _ => KafkaOffset::End,
                });
            tpl.add_partition_offset(topic, partition_id, offset)
                .map_err(|e| AppError::KafkaError(format!("Failed to add partition: {}", e)))?;
            consumer.assign(&tpl)
                .map_err(|e| AppError::KafkaError(format!("Failed to assign partition: {}", e)))?;
        } else {
            // 订阅整个 topic
            consumer.subscribe(&[topic])
                .map_err(|e| AppError::KafkaError(format!("Failed to subscribe: {}", e)))?;
            
            // 如果需要从特定 offset 开始消费，手动 seek
            if let Some(offset_val) = specific_offset {
                // 等待分区分配完成
                tokio::time::sleep(Duration::from_millis(500)).await;
                
                let partitions = consumer.assignment()
                    .map_err(|e| AppError::KafkaError(format!("Failed to get assignment: {}", e)))?;
                
                for p in partitions.elements() {
                    let topic_partition = (p.topic(), p.partition());
                    if let Err(e) = consumer.seek(topic_partition.0, topic_partition.1, KafkaOffset::Offset(offset_val), Duration::from_secs(5)) {
                        println!("[Kafkit] Warning: Failed to seek partition {}: {}", topic_partition.1, e);
                    }
                }
            }
        }

        let should_stop = StdArc::new(AtomicBool::new(false));
        let should_stop_clone = should_stop.clone();
        let session_id_clone = session_id.clone();
        let topic_clone = topic.to_string();

        // 启动消费任务
        let handle = tokio::spawn(async move {
            println!("[Kafkit] Consumer loop started for session: {}", session_id_clone);
            
            loop {
                if should_stop_clone.load(Ordering::Relaxed) {
                    println!("[Kafkit] Consumer stopped for session: {}", session_id_clone);
                    break;
                }

                match tokio::time::timeout(
                    Duration::from_millis(500),
                    consumer.recv()
                ).await {
                    Ok(Ok(msg)) => {
                        let payload: String = match msg.payload_view::<str>() {
                            Some(Ok(s)) => s.to_string(),
                            _ => msg.payload().map(|p| String::from_utf8_lossy(p).to_string())
                                .unwrap_or_default()
                        };
                        
                        let key: Option<String> = match msg.key_view::<str>() {
                            Some(Ok(s)) => Some(s.to_string()),
                            Some(Err(_)) => msg.key().map(|k| String::from_utf8_lossy(k).to_string()),
                            None => None,
                        };
                        
                        let kafka_msg = KafkaMessage {
                            partition: msg.partition(),
                            offset: msg.offset(),
                            timestamp: msg.timestamp().to_millis(),
                            key,
                            value: payload,
                            headers: vec![],
                            size: msg.payload_len() as i32,
                        };

                        println!("[Kafkit] Received message from {} partition {} offset {}", 
                            topic_clone, kafka_msg.partition, kafka_msg.offset);

                        // 发送事件到前端
                        use tauri::Emitter;
                        if let Err(e) = window.emit("kafka-message", &kafka_msg) {
                            println!("[Kafkit] Failed to emit message: {}", e);
                        }
                    }
                    Ok(Err(e)) => {
                        println!("[Kafkit] Consumer error: {}", e);
                        tokio::time::sleep(Duration::from_millis(100)).await;
                    }
                    Err(_) => {
                        // 超时，继续检查 should_stop
                    }
                }
            }

            // 清理
            println!("[Kafkit] Consumer loop ended for session: {}", session_id_clone);
        });

        // 存储消费者
        let mut consumers = self.active_consumers.lock().await;
        consumers.insert(session_id.clone(), (handle, should_stop));

        println!("[Kafkit] Consumer started: {}", session_id);
        Ok(session_id)
    }

    /// 停止消费
    pub async fn stop_consuming(&self, session_id: &str) -> Result<(), AppError> {
        println!("[Kafkit] Stopping consumer: {}", session_id);
        
        let mut consumers = self.active_consumers.lock().await;
        if let Some((handle, should_stop)) = consumers.remove(session_id) {
            // 发送停止信号
            should_stop.store(true, Ordering::Relaxed);
            // 等待任务结束
            let _ = handle.await;
            println!("[Kafkit] Consumer stopped: {}", session_id);
        }
        
        Ok(())
    }

    /// 查询时间戳对应的 offset
    async fn lookup_offset_for_timestamp(
        connection: &Connection,
        topic: &str,
        partition: Option<i32>,
        timestamp: i64,
    ) -> Result<i64, AppError> {
        use rdkafka::consumer::Consumer;
        
        println!("[Kafkit] Looking up offset for timestamp {} on topic {}", timestamp, topic);
        
        // 创建临时消费者配置
        let mut config = ClientConfig::new();
        config.set("bootstrap.servers", &connection.bootstrap_servers.join(","));
        config.set("group.id", &format!("kafkit-lookup-{}", uuid::Uuid::new_v4()));
        config.set("client.id", "kafkit-timestamp-lookup");
        config.set("enable.auto.commit", "false");
        
        // 根据安全协议配置
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
                }
            }
            SecurityProtocol::SaslPlaintext => {
                config.set("security.protocol", "SASL_PLAINTEXT");
                Self::configure_sasl_consumer(&mut config, &connection.auth)?;
            }
            SecurityProtocol::SaslSsl => {
                config.set("security.protocol", "SASL_SSL");
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
                }
                Self::configure_sasl_consumer(&mut config, &connection.auth)?;
            }
        }
        
        let consumer: BaseConsumer = config.create()
            .map_err(|e| AppError::KafkaError(format!("Failed to create lookup consumer: {}", e)))?;
        
        // 获取要查询的分区
        let partitions_to_query: Vec<i32> = if let Some(p) = partition {
            vec![p]
        } else {
            // 获取 topic 的所有分区
            let metadata = consumer.fetch_metadata(Some(topic), Duration::from_secs(10))
                .map_err(|e| AppError::KafkaError(format!("Failed to fetch metadata: {}", e)))?;
            
            metadata.topics()
                .iter()
                .find(|t| t.name() == topic)
                .map(|t| t.partitions().iter().map(|p| p.id()).collect())
                .unwrap_or_default()
        };
        
        if partitions_to_query.is_empty() {
            return Err(AppError::KafkaError("No partitions found for topic".to_string()));
        }
        
        // 创建 TopicPartitionList 并设置时间戳
        let mut tpl = TopicPartitionList::new();
        for p in &partitions_to_query {
            tpl.add_partition_offset(topic, *p, KafkaOffset::Offset(timestamp))
                .map_err(|e| AppError::KafkaError(format!("Failed to add partition: {}", e)))?;
        }
        
        // 查询时间戳对应的 offset
        let offsets = consumer.offsets_for_times(tpl, Duration::from_secs(10))
            .map_err(|e| AppError::KafkaError(format!("Failed to lookup offsets for times: {}", e)))?;
        
        // 找到最小的 offset（最早的消息）
        let mut min_offset: Option<i64> = None;
        for p in offsets.elements() {
            let offset_opt = p.offset().to_raw();
            println!("[Kafkit] Partition {} offset for timestamp {}: {:?}", p.partition(), timestamp, offset_opt);
            if let Some(offset) = offset_opt {
                if offset >= 0 {
                    min_offset = Some(min_offset.map(|m| m.min(offset)).unwrap_or(offset));
                }
            }
        }
        
        // 如果没有找到有效的 offset，使用 earliest
        let result = min_offset.unwrap_or(0);
        println!("[Kafkit] Using offset {} for timestamp {}", result, timestamp);
        
        Ok(result)
    }

    fn configure_sasl_consumer(config: &mut ClientConfig, auth: &AuthConfig) -> Result<(), AppError> {
        match auth {
            AuthConfig::SaslPlain { username, password } => {
                config.set("sasl.mechanism", "PLAIN");
                config.set("sasl.username", username);
                config.set("sasl.password", password);
            }
            AuthConfig::SaslScram { mechanism, username, password } => {
                let mechanism_str = match mechanism {
                    ScramMechanism::Sha256 => "SCRAM-SHA-256",
                    ScramMechanism::Sha512 => "SCRAM-SHA-512",
                };
                config.set("sasl.mechanism", mechanism_str);
                config.set("sasl.username", username);
                config.set("sasl.password", password);
            }
            AuthConfig::SaslGssapi { principal, keytab_path, service_name } => {
                config.set("sasl.mechanism", "GSSAPI");
                config.set("sasl.kerberos.principal", principal);
                config.set("sasl.kerberos.service.name", service_name);
                if let Some(keytab) = keytab_path {
                    config.set("sasl.kerberos.keytab", keytab);
                }
            }
            _ => {}
        }
        Ok(())
    }
}
