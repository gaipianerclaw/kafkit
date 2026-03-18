#[cfg(test)]
mod tests {
    use crate::models::{AuthConfig, Connection, SecurityConfig, SecurityProtocol};
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
}
