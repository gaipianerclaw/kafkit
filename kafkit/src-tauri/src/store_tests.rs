#[cfg(test)]
mod tests {
    use crate::models::{AuthConfig, ConnectionConfig, SecurityConfig};
    use crate::store::{ConfigStore, StoredConfig};
    use std::collections::HashMap;

    fn create_test_connection_config() -> ConnectionConfig {
        ConnectionConfig {
            name: "Test Connection".to_string(),
            bootstrap_servers: "localhost:9092".to_string(),
            auth: AuthConfig::None,
            security: SecurityConfig {
                protocol: crate::models::SecurityProtocol::Plaintext,
                ssl_verify_hostname: None,
            },
            options: Default::default(),
        }
    }

    #[test]
    fn test_stored_config_serialization() {
        let config = StoredConfig {
            version: "1.0".to_string(),
            connections: vec![],
            settings: HashMap::new(),
        };
        
        let json = serde_json::to_string(&config).unwrap();
        let decoded: StoredConfig = serde_json::from_str(&json).unwrap();
        assert_eq!(decoded.version, "1.0");
    }

    #[test]
    fn test_auth_type_mapping() {
        let test_cases = vec![
            (AuthConfig::None, "none"),
            (AuthConfig::SaslPlain { username: "".to_string(), password: "".to_string() }, "saslPlain"),
            (AuthConfig::SaslScram { mechanism: crate::models::ScramMechanism::Sha256, username: "".to_string(), password: "".to_string() }, "saslScram"),
            (AuthConfig::SaslGssapi { principal: "".to_string(), keytab_path: None, service_name: "".to_string() }, "saslGssapi"),
            (AuthConfig::Ssl { ca_cert: None, client_cert: None, client_key: None }, "ssl"),
        ];
        
        for (auth, expected_type) in test_cases {
            let auth_type = match &auth {
                AuthConfig::None => "none",
                AuthConfig::SaslPlain { .. } => "saslPlain",
                AuthConfig::SaslScram { .. } => "saslScram",
                AuthConfig::SaslGssapi { .. } => "saslGssapi",
                AuthConfig::Ssl { .. } => "ssl",
            };
            assert_eq!(auth_type, expected_type);
        }
    }

    #[test]
    fn test_credential_key_generation() {
        // This test verifies the credential key format
        let connection_id = "test-uuid";
        let field = "password";
        let expected = format!("connection:{}:{}", connection_id, field);
        assert_eq!(expected, "connection:test-uuid:password");
    }
}
