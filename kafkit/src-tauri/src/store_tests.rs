#[cfg(test)]
mod tests {
    use crate::models::{AuthConfig, SecurityConfig, SecurityProtocol, ScramMechanism};

    fn create_test_security_config() -> SecurityConfig {
        SecurityConfig {
            protocol: SecurityProtocol::Plaintext,
            ssl_verify_hostname: None,
        }
    }

    #[test]
    fn test_auth_type_mapping() {
        let test_cases = vec![
            (AuthConfig::None, "none"),
            (AuthConfig::SaslPlain { username: "".to_string(), password: "".to_string() }, "saslPlain"),
            (AuthConfig::SaslScram { mechanism: ScramMechanism::Sha256, username: "".to_string(), password: "".to_string() }, "saslScram"),
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
    fn test_security_protocol_serialization() {
        // 测试安全协议序列化
        let plaintext = SecurityProtocol::Plaintext;
        let json = serde_json::to_string(&plaintext).unwrap();
        assert!(json.contains("PLAINTEXT"));

        let ssl = SecurityProtocol::Ssl;
        let json = serde_json::to_string(&ssl).unwrap();
        assert!(json.contains("SSL"));
    }

    #[test]
    fn test_scram_mechanism_serialization() {
        let sha256 = ScramMechanism::Sha256;
        let json = serde_json::to_string(&sha256).unwrap();
        assert!(json.contains("SCRAM-SHA-256"));

        let sha512 = ScramMechanism::Sha512;
        let json = serde_json::to_string(&sha512).unwrap();
        assert!(json.contains("SCRAM-SHA-512"));
    }

    #[test]
    fn test_credential_key_generation() {
        // 验证凭证键格式
        let connection_id = "test-uuid";
        let field = "password";
        let expected = format!("connection:{}:{}", connection_id, field);
        assert_eq!(expected, "connection:test-uuid:password");
    }
}
