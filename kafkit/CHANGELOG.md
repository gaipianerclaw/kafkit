# Changelog

所有项目的重要更改都将记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
并且本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### Added
- **连接配置导入导出功能**
  - 支持导出所有连接配置到 JSON 文件
  - 支持从 JSON 文件导入连接配置
  - 导入时自动检测重复连接，支持跳过或覆盖
  - 支持中英双语界面
  - 集成到连接管理页面

- **修复 Consumer Group Lag 查询稳定性**
  - 修复 `UnknownGroup` 错误处理，避免查询失败
  - 添加消费组存在性检查
  - 实现带重试的 committed offsets 获取
  - 添加分区去重，避免重复计算
  - 分批处理分区，减少单次请求负载
  - 结果按 topic 和 partition 排序

- **添加 Topic 配置编辑功能**
  - 后端实现 `describe_topic_configs` 和 `alter_topic_configs`
  - 前端添加配置编辑对话框
  - 支持常用配置快速编辑（retention.ms, cleanup.policy 等）
  - 支持自定义配置项添加
  - 配置列表实时更新显示

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

