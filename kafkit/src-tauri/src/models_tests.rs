#[cfg(test)]
mod tests {
    use crate::models::*;
    use serde_json;

    #[test]
    fn test_auth_config_serialization() {
        let auth = AuthConfig::SaslPlain {
            username: "test".to_string(),
            password: "pass".to_string(),
        };
        let json = serde_json::to_string(&auth).unwrap();
        assert!(json.contains("saslPlain"));
        assert!(json.contains("test"));
        
        let decoded: AuthConfig = serde_json::from_str(&json).unwrap();
        match decoded {
            AuthConfig::SaslPlain { username, .. } => {
                assert_eq!(username, "test");
            }
            _ => panic!("Wrong auth type"),
        }
    }

    #[test]
    fn test_security_protocol_serialization() {
        let protocols = vec![
            SecurityProtocol::Plaintext,
            SecurityProtocol::Ssl,
            SecurityProtocol::SaslPlaintext,
            SecurityProtocol::SaslSsl,
        ];
        
        for protocol in protocols {
            let json = serde_json::to_string(&protocol).unwrap();
            let decoded: SecurityProtocol = serde_json::from_str(&json).unwrap();
            assert_eq!(std::mem::discriminant(&protocol), std::mem::discriminant(&decoded));
        }
    }

    #[test]
    fn test_connection_config_parsing() {
        let json = r#"{
            "name": "Test Connection",
            "bootstrapServers": "localhost:9092",
            "auth": { "type": "none" },
            "security": { "protocol": "PLAINTEXT" }
        }"#;
        
        let config: ConnectionConfig = serde_json::from_str(json).unwrap();
        assert_eq!(config.name, "Test Connection");
        assert_eq!(config.bootstrap_servers, "localhost:9092");
        match config.auth {
            AuthConfig::None => {}
            _ => panic!("Expected None auth"),
        }
    }

    #[test]
    fn test_offset_spec_serialization() {
        let specs = vec![
            OffsetSpec::Latest,
            OffsetSpec::Earliest,
            OffsetSpec::Timestamp { timestamp: 1234567890 },
            OffsetSpec::Offset { offset: 100 },
        ];
        
        for spec in specs {
            let json = serde_json::to_string(&spec).unwrap();
            let decoded: OffsetSpec = serde_json::from_str(&json).unwrap();
            match (&spec, &decoded) {
                (OffsetSpec::Latest, OffsetSpec::Latest) => {}
                (OffsetSpec::Earliest, OffsetSpec::Earliest) => {}
                (OffsetSpec::Timestamp { timestamp: t1 }, OffsetSpec::Timestamp { timestamp: t2 }) => {
                    assert_eq!(t1, t2);
                }
                (OffsetSpec::Offset { offset: o1 }, OffsetSpec::Offset { offset: o2 }) => {
                    assert_eq!(o1, o2);
                }
                _ => panic!("OffsetSpec mismatch"),
            }
        }
    }

    #[test]
    fn test_app_error_display() {
        let errors = vec![
            AppError::ConnectionNotFound("test-id".to_string()),
            AppError::KafkaError("broker error".to_string()),
            AppError::Timeout,
        ];
        
        for err in errors {
            let msg = err.to_string();
            assert!(!msg.is_empty());
        }
    }
}
