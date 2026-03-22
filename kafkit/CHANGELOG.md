# Changelog

所有项目的重要更改都将记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
并且本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### Added
- **Consumer Group 偏移量重置功能真正实现**
  - 支持重置到最早偏移量 (Earliest)
  - 支持重置到最新偏移量 (Latest)
  - 支持重置到特定时间戳 (Timestamp)
  - 支持单分区和多分区批量重置
  - 完整支持多种安全协议：PLAINTEXT、SSL、SASL_PLAINTEXT、SASL_SSL

### Fixed
- **修复前端测试导入路径错误**
  - 修复 `src/__tests__/mockService.test.ts` 中的模块路径问题
  - 所有 51 个测试用例现已全部通过

### Changed
- **优化代码消除编译警告**
  - 修复 `fetch_messages` 函数中未使用参数的警告
  - 清理 `services.rs` 中的未使用导入和变量

### Testing
- 更新 `services_tests.rs` 测试用例
- 更新 `store_tests.rs` 测试用例
- 确保前端和后端测试一致性

## [1.0.2] - 2024-03-18

### Added
- 初始版本发布
- Kafka 连接管理功能
- Topic 浏览与管理
- 消息消费与生产
- Consumer Group 查看功能

