# Kafkit 功能开发计划

**分支**: `dev/features`  
**创建时间**: 2026-03-21  
**版本目标**: v1.1.0

---

## 已完成功能

### ✅ 功能 1: Consumer Group 偏移量重置（真正实现）
**状态**: 代码完成，测试用例已添加  
**修改文件**:
- `src-tauri/src/services.rs` - 实现真正的偏移量重置
- `src-tauri/src/commands.rs` - 更新命令接口
- `src-tauri/src/models.rs` - 添加 `PartitionOffsetResult` 结构体
- `src-tauri/src/services_tests.rs` - 添加 20+ 个测试用例

**技术实现**:
- 使用 `AdminClient.alter_consumer_group_offsets` API
- 支持 Earliest/Latest/Timestamp/Offset 四种重置策略
- 返回详细的操作结果（成功/失败分区列表）

**测试覆盖**:
- [x] OffsetResetSpec 序列化/反序列化测试
- [x] PartitionOffsetResult 创建和序列化测试
- [x] 边界情况测试（负数 offset、大数值）
- [x] 集成测试（标记为 `#[ignore]`，需要 Kafka 环境）

---

## 待开发功能清单

### 🔴 高优先级

#### 功能 2: 连接配置导入导出
**目的**: 支持连接配置的 JSON 导入导出，便于团队协作  
**预计工期**: 2-3 天  
**技术方案**:
```rust
// 新增命令
export_connections(file_path: String) -> Result<String, AppError>
import_connections(file_path: String, merge: bool) -> Result<ImportResult, AppError>
```
**测试要求**:
- [ ] 导出单条/多条连接配置
- [ ] 导入新配置（覆盖模式）
- [ ] 导入合并（保留现有配置）
- [ ] 加密字段处理（密码等敏感信息）
- [ ] 格式验证和错误处理

---

#### 功能 3: Topic 配置编辑
**目的**: 支持修改 Topic 级别配置（retention.ms、cleanup.policy 等）  
**预计工期**: 2-3 天  
**技术方案**:
```rust
// AdminClient.alter_configs 或 incremental_alter_configs
update_topic_config(
    connection_id: String,
    topic: String,
    configs: HashMap<String, String>
) -> Result<Vec<ConfigChangeResult>, AppError>
```
**测试要求**:
- [ ] 获取 Topic 当前配置
- [ ] 修改单个配置项
- [ ] 批量修改配置
- [ ] 配置验证（如 retention.ms 必须为正整数）
- [ ] 处理只读配置（无法修改的项）

---

### 🟡 中优先级

#### 功能 4: 消息搜索过滤
**目的**: 消费界面支持关键词搜索和过滤  
**预计工期**: 3-4 天  
**技术方案**:
```typescript
// 前端过滤（实时）
interface MessageFilter {
  keyPattern?: string;      // 正则匹配 key
  valuePattern?: string;    // 正则匹配 value
  offsetRange?: [number, number];
  timestampRange?: [number, number];
}
```
**测试要求**:
- [ ] 关键字搜索测试
- [ ] 正则匹配测试
- [ ] Offset 范围过滤
- [ ] 时间戳范围过滤
- [ ] 组合条件过滤

---

#### 功能 5: Avro/Protobuf 支持 + Schema Registry
**目的**: 支持 Avro 和 Protobuf 消息格式的解析和发送  
**预计工期**: 5-7 天  
**技术方案**:
```rust
// 新增模块 src-tauri/src/codec/
enum MessageFormat {
    Json,
    Avro { schema: String },
    Protobuf { descriptor: String, message_type: String },
}

// Schema Registry 集成
get_schema_from_registry(url: String, subject: String, version: Option<i32>) -> Result<String, AppError>
```
**测试要求**:
- [ ] Avro 序列化/反序列化测试
- [ ] Protobuf 解析测试
- [ ] Schema Registry 连接测试
- [ ] Schema 缓存机制测试

---

#### 功能 6: 性能优化 - 虚拟滚动和大消息处理
**目的**: 优化大消息和大量消息的展示性能  
**预计工期**: 2-3 天  
**技术方案**:
```typescript
// 前端使用 react-window 或 @tanstack/react-virtual
// 大消息折叠显示（>1MB 默认折叠）
```
**测试要求**:
- [ ] 10000 条消息列表滚动测试
- [ ] 大消息（10MB+）加载测试
- [ ] 内存占用监控

---

### 🟢 低优先级

#### 功能 7: 监控图表（消息速率/Lag 趋势）
**目的**: 可视化展示消息生产/消费速率和 Lag 变化  
**预计工期**: 3-5 天  
**技术方案**:
```typescript
// 使用 recharts 或 chart.js
// 实时数据采样和聚合
```

---

#### 功能 8: Kafka Connect 管理
**目的**: 管理 Kafka Connect 连接器  
**预计工期**: 4-6 天  
**技术方案**:
```rust
// 使用 Kafka Connect REST API
list_connectors(url: String) -> Result<Vec<ConnectorInfo>, AppError>
```

---

#### 功能 9: 自动更新检查
**目的**: 应用启动时检查 GitHub Releases 新版本  
**预计工期**: 1-2 天  

---

#### 功能 10: 快捷键支持
**目的**: 常用操作的键盘快捷键  
**预计工期**: 1-2 天  

---

## 开发规范

### 代码提交规范
- 每个功能独立提交
- 提交信息格式: `[功能X] 简短描述`
- 包含测试的提交额外标记: `[test]`

### 测试要求
- 每个功能必须有对应的单元测试
- 涉及 Kafka 交互的功能需要有集成测试（标记 `#[ignore]`）
- 测试覆盖率目标: 新代码 > 70%

### 文档更新
- 每个功能更新 CHANGELOG.md
- 复杂功能更新 USER_GUIDE.md
- API 变更更新 TDD.md

---

## 时间线

| 周次 | 功能 | 状态 |
|------|------|------|
| Week 1 | 功能 1（偏移量重置）+ 功能 2（导入导出） | 🚧 进行中 |
| Week 2 | 功能 3（Topic 配置编辑）+ 功能 6（性能优化） | ⏳ 待开始 |
| Week 3 | 功能 4（消息搜索）+ 功能 5（Avro/Protobuf） | ⏳ 待开始 |
| Week 4 | 功能 7（监控图表）+ 功能 8（Kafka Connect） | ⏳ 待开始 |
| Week 5 | 功能 9（自动更新）+ 功能 10（快捷键）+ 回归测试 | ⏳ 待开始 |

---

## 当前阻塞

1. **编译环境**: rdkafka 编译需要较长时间，建议在本地开发环境验证
2. **测试环境**: 集成测试需要运行中的 Kafka 实例

**本地验证命令**:
```bash
cd kafkit/kafkit/src-tauri

# 语法检查（快速）
cargo check --lib 2>&1 | grep -E "(error|warning:)" | head -20

# 运行单元测试
cargo test --lib 2>&1 | tail -30

# 运行特定测试
cargo test --lib test_offset_reset_spec
cargo test --lib test_partition_offset_result
```

---

**文档版本**: 1.0  
**最后更新**: 2026-03-21
