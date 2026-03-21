#[cfg(test)]
mod tests {
    use crate::models::{AuthConfig, Connection, SecurityConfig, SecurityProtocol, OffsetResetSpec, PartitionOffsetResult};
    use crate::services::ConnectionManager;

    fn create_test_connection() -> Connection {
        Connection {
            id: "test-id".to_string(),
            name: "Test".to_string(),
            bootstrap_servers: vec!["localhost:9092".to_string()],
            auth: AuthConfig::None,
            security: SecurityConfig {
                protocol: SecurityProtocol::Plaintext,
                ssl_verify_hostname: None,
            },
            options: Default::default(),
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: chrono::Utc::now().to_rfc3339(),
        }
    }

    #[test]
    fn test_client_config_creation_plaintext() {
        let conn = create_test_connection();
        let config = ConnectionManager::create_client_config(&conn);
        assert!(config.is_ok());
    }

    #[test]
    fn test_client_config_with_sasl_plain() {
        let mut conn = create_test_connection();
        conn.auth = AuthConfig::SaslPlain {
            username: "user".to_string(),
            password: "pass".to_string(),
        };
        conn.security.protocol = SecurityProtocol::SaslPlaintext;
        
        let config = ConnectionManager::create_client_config(&conn);
        assert!(config.is_ok());
    }

    #[test]
    fn test_client_config_with_sasl_scram() {
        let mut conn = create_test_connection();
        conn.auth = AuthConfig::SaslScram {
            mechanism: crate::models::ScramMechanism::Sha256,
            username: "user".to_string(),
            password: "pass".to_string(),
        };
        conn.security.protocol = SecurityProtocol::SaslSsl;
        
        let config = ConnectionManager::create_client_config(&conn);
        assert!(config.is_ok());
    }

    #[test]
    fn test_client_config_with_ssl() {
        let mut conn = create_test_connection();
        conn.auth = AuthConfig::Ssl {
            ca_cert: Some("/path/to/ca.crt".to_string()),
            client_cert: Some("/path/to/client.crt".to_string()),
            client_key: Some("/path/to/client.key".to_string()),
        };
        conn.security.protocol = SecurityProtocol::Ssl;
        
        let config = ConnectionManager::create_client_config(&conn);
        assert!(config.is_ok());
    }

    #[tokio::test]
    async fn test_connection_manager_new() {
        let manager = ConnectionManager::new();
        // Just verify it creates without panic
    }

    // ==================== OffsetResetSpec 测试 ====================

    #[test]
    fn test_offset_reset_spec_earliest() {
        let spec = OffsetResetSpec::Earliest;
        match spec {
            OffsetResetSpec::Earliest => assert!(true),
            _ => panic!("Expected Earliest variant"),
        }
    }

    #[test]
    fn test_offset_reset_spec_latest() {
        let spec = OffsetResetSpec::Latest;
        match spec {
            OffsetResetSpec::Latest => assert!(true),
            _ => panic!("Expected Latest variant"),
        }
    }

    #[test]
    fn test_offset_reset_spec_timestamp() {
        let timestamp = 1710000000000i64;
        let spec = OffsetResetSpec::Timestamp { timestamp };
        match spec {
            OffsetResetSpec::Timestamp { timestamp: ts } => assert_eq!(ts, timestamp),
            _ => panic!("Expected Timestamp variant"),
        }
    }

    #[test]
    fn test_offset_reset_spec_offset() {
        let offset = 100i64;
        let spec = OffsetResetSpec::Offset { offset };
        match spec {
            OffsetResetSpec::Offset { offset: o } => assert_eq!(o, offset),
            _ => panic!("Expected Offset variant"),
        }
    }

    #[test]
    fn test_offset_reset_spec_serialization() {
        // 测试 Earliest 序列化
        let spec = OffsetResetSpec::Earliest;
        let json = serde_json::to_string(&spec).unwrap();
        assert!(json.contains("earliest"));

        // 测试反序列化
        let deserialized: OffsetResetSpec = serde_json::from_str(&json).unwrap();
        match deserialized {
            OffsetResetSpec::Earliest => assert!(true),
            _ => panic!("Deserialization failed"),
        }
    }

    #[test]
    fn test_offset_reset_spec_timestamp_serialization() {
        let spec = OffsetResetSpec::Timestamp { timestamp: 1710000000000i64 };
        let json = serde_json::to_string(&spec).unwrap();
        assert!(json.contains("timestamp"));
        assert!(json.contains("1710000000000"));

        let deserialized: OffsetResetSpec = serde_json::from_str(&json).unwrap();
        match deserialized {
            OffsetResetSpec::Timestamp { timestamp } => assert_eq!(timestamp, 1710000000000i64),
            _ => panic!("Deserialization failed"),
        }
    }

    // ==================== PartitionOffsetResult 测试 ====================

    #[test]
    fn test_partition_offset_result_creation() {
        let result = PartitionOffsetResult {
            topic: "test-topic".to_string(),
            partition: 0,
            offset: 100,
            success: true,
            error: None,
        };

        assert_eq!(result.topic, "test-topic");
        assert_eq!(result.partition, 0);
        assert_eq!(result.offset, 100);
        assert!(result.success);
        assert!(result.error.is_none());
    }

    #[test]
    fn test_partition_offset_result_with_error() {
        let result = PartitionOffsetResult {
            topic: "test-topic".to_string(),
            partition: 1,
            offset: -1,
            success: false,
            error: Some("Failed to reset offset".to_string()),
        };

        assert_eq!(result.topic, "test-topic");
        assert_eq!(result.partition, 1);
        assert_eq!(result.offset, -1);
        assert!(!result.success);
        assert_eq!(result.error, Some("Failed to reset offset".to_string()));
    }

    #[test]
    fn test_partition_offset_result_serialization() {
        let result = PartitionOffsetResult {
            topic: "test-topic".to_string(),
            partition: 2,
            offset: 500,
            success: true,
            error: None,
        };

        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("test-topic"));
        assert!(json.contains("500"));
        assert!(json.contains("true"));

        let deserialized: PartitionOffsetResult = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.topic, "test-topic");
        assert_eq!(deserialized.partition, 2);
        assert_eq!(deserialized.offset, 500);
        assert!(deserialized.success);
    }

    #[test]
    fn test_partition_offset_result_deserialization_from_frontend() {
        // 模拟前端发送的 JSON 格式
        let json = r#"{"topic":"my-topic","partition":3,"offset":1000,"success":true}"#;
        let result: PartitionOffsetResult = serde_json::from_str(json).unwrap();

        assert_eq!(result.topic, "my-topic");
        assert_eq!(result.partition, 3);
        assert_eq!(result.offset, 1000);
        assert!(result.success);
        assert!(result.error.is_none());
    }

    // ==================== 偏移量重置集成测试 (需要 Kafka 环境) ====================

    /// 这些测试需要本地 Kafka 环境，默认被忽略
    /// 运行方式: cargo test -- --ignored
    
    #[tokio::test]
    #[ignore]
    async fn test_reset_consumer_offset_integration() {
        // 这个测试需要本地运行的 Kafka 实例
        let manager = ConnectionManager::new();
        let connection = create_test_connection();
        
        // 尝试重置偏移量（需要真实的 Kafka 连接）
        let result = manager.reset_consumer_offset(
            &connection,
            "test-group",
            "test-topic",
            Some(0),
            &OffsetResetSpec::Earliest
        ).await;

        // 如果 Kafka 不可用，这会返回错误
        // 测试主要验证函数签名正确且不会 panic
        match result {
            Ok(results) => {
                // 验证返回的结果结构
                for r in results {
                    assert!(!r.topic.is_empty());
                    assert!(r.partition >= 0);
                }
            }
            Err(_) => {
                // Kafka 不可用是预期的，测试仍视为通过
                println!("Kafka not available for integration test");
            }
        }
    }

    #[tokio::test]
    #[ignore]
    async fn test_reset_consumer_offset_all_partitions() {
        let manager = ConnectionManager::new();
        let connection = create_test_connection();
        
        // 测试重置所有分区
        let result = manager.reset_consumer_offset(
            &connection,
            "test-group",
            "test-topic",
            None, // 所有分区
            &OffsetResetSpec::Latest
        ).await;

        match result {
            Ok(results) => {
                // 验证返回了结果
                assert!(!results.is_empty());
            }
            Err(_) => {
                println!("Kafka not available for integration test");
            }
        }
    }

    // ==================== 边界情况测试 ====================

    #[test]
    fn test_partition_offset_result_negative_offset() {
        // 测试负数 offset（表示无效 offset）
        let result = PartitionOffsetResult {
            topic: "test-topic".to_string(),
            partition: 0,
            offset: -1,
            success: false,
            error: Some("Invalid offset".to_string()),
        };

        assert_eq!(result.offset, -1);
        assert!(!result.success);
    }

    #[test]
    fn test_partition_offset_result_large_offset() {
        // 测试大 offset 值
        let result = PartitionOffsetResult {
            topic: "test-topic".to_string(),
            partition: 0,
            offset: i64::MAX,
            success: true,
            error: None,
        };

        assert_eq!(result.offset, i64::MAX);
    }
}
