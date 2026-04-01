use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ================= Connection Models =================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionSummary {
    pub id: String,
    pub name: String,
    pub bootstrap_servers: Vec<String>,
    pub auth_type: String,
    pub is_connected: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Connection {
    pub id: String,
    pub name: String,
    pub bootstrap_servers: Vec<String>,
    pub auth: AuthConfig,
    pub security: SecurityConfig,
    pub options: ConnectionOptions,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum AuthConfig {
    #[serde(rename = "none")]
    None,
    #[serde(rename = "saslPlain")]
    #[serde(rename_all = "camelCase")]
    SaslPlain { 
        username: String, 
        password: String,
        // 可选的 SSL 证书（用于 SASL_SSL）
        ca_cert: Option<String>,
        client_cert: Option<String>,
        client_key: Option<String>,
    },
    #[serde(rename = "saslScram")]
    #[serde(rename_all = "camelCase")]
    SaslScram {
        mechanism: ScramMechanism,
        username: String,
        password: String,
        // 可选的 SSL 证书（用于 SASL_SSL）
        ca_cert: Option<String>,
        client_cert: Option<String>,
        client_key: Option<String>,
    },
    #[serde(rename = "saslGssapi")]
    #[serde(rename_all = "camelCase")]
    SaslGssapi {
        principal: String,
        keytab_path: Option<String>,
        service_name: String,
    },
    #[serde(rename = "ssl")]
    #[serde(rename_all = "camelCase")]
    Ssl {
        ca_cert: Option<String>,
        client_cert: Option<String>,
        client_key: Option<String>,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ScramMechanism {
    #[serde(rename = "SCRAM-SHA-256")]
    Sha256,
    #[serde(rename = "SCRAM-SHA-512")]
    Sha512,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SecurityConfig {
    pub protocol: SecurityProtocol,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ssl_verify_hostname: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SecurityProtocol {
    #[serde(rename = "PLAINTEXT")]
    Plaintext,
    #[serde(rename = "SSL")]
    Ssl,
    #[serde(rename = "SASL_PLAINTEXT")]
    SaslPlaintext,
    #[serde(rename = "SASL_SSL")]
    SaslSsl,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionOptions {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_timeout_ms: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata_max_age_ms: Option<u32>,
}

impl Default for ConnectionOptions {
    fn default() -> Self {
        Self {
            request_timeout_ms: None,
            metadata_max_age_ms: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionConfig {
    pub name: String,
    pub bootstrap_servers: String,
    pub auth: AuthConfig,
    pub security: SecurityConfig,
    #[serde(default)]
    pub options: ConnectionOptions,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionTestResult {
    pub success: bool,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<HashMap<String, serde_json::Value>>,
}

// ================= Topic Models =================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TopicInfo {
    pub name: String,
    pub partition_count: i32,
    pub replication_factor: i32,
    pub is_internal: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TopicDetail {
    pub name: String,
    pub partitions: Vec<PartitionInfo>,
    pub configs: Vec<ConfigEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PartitionInfo {
    pub partition: i32,
    pub leader: i32,
    pub replicas: Vec<i32>,
    pub isr: Vec<i32>,
    pub earliest_offset: i64,
    pub latest_offset: i64,
    pub message_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigEntry {
    pub name: String,
    pub value: String,
    pub default: bool,
    pub source: String,
}

// ================= Message Models =================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KafkaMessage {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub topic: Option<String>,  // Topic name (for multi-tab isolation)
    pub partition: i32,
    pub offset: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub timestamp: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub key: Option<String>,
    pub value: String,
    pub headers: Vec<(String, String)>,
    pub size: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProduceMessage {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub partition: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub key: Option<String>,
    pub value: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub headers: Option<HashMap<String, String>>,
    /// Timestamp in milliseconds since epoch (optional)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub timestamp: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProduceResult {
    pub partition: i32,
    pub offset: i64,
    pub timestamp: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct BatchProduceOptions {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rate_limit: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchProduceResult {
    pub success: i32,
    pub failed: i32,
    pub errors: Vec<BatchProduceError>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchProduceError {
    pub index: i32,
    pub error: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum OffsetSpec {
    #[serde(rename = "latest")]
    Latest,
    #[serde(rename = "earliest")]
    Earliest,
    #[serde(rename = "timestamp")]
    Timestamp { timestamp: i64 },
    #[serde(rename = "offset")]
    Offset { offset: i64 },
}

// ================= Consumer Group Models =================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConsumerGroupInfo {
    pub group_id: String,
    pub state: String,
    pub member_count: i32,
    pub coordinator: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PartitionLag {
    pub topic: String,
    pub partition: i32,
    pub current_offset: i64,
    pub log_end_offset: i64,
    pub lag: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum OffsetResetSpec {
    #[serde(rename = "earliest")]
    Earliest,
    #[serde(rename = "latest")]
    Latest,
    #[serde(rename = "timestamp")]
    Timestamp { timestamp: i64 },
    #[serde(rename = "offset")]
    Offset { offset: i64 },
}

/// 分区偏移量重置结果
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PartitionOffsetResult {
    pub topic: String,
    pub partition: i32,
    pub offset: i64,
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

// ================= Error Models =================

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Connection not found: {0}")]
    ConnectionNotFound(String),
    #[error("Kafka error: {0}")]
    KafkaError(String),
    #[error("Store error: {0}")]
    StoreError(String),
    #[error("Invalid configuration: {0}")]
    InvalidConfig(String),
    #[error("Operation timeout")]
    Timeout,
    #[error("{0}")]
    Other(String),
}

impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
