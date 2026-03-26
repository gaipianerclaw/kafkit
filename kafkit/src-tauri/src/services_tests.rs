#[cfg(test)]
mod tests {
    use crate::models::{OffsetResetSpec, PartitionOffsetResult};

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
