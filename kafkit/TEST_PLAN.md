# Kafkit 测试计划

## 测试策略

### 1. 单元测试 (Unit Tests)

#### 后端 (Rust)
| 模块 | 测试文件 | 覆盖率目标 |
|------|----------|-----------|
| 数据模型 | `models_tests.rs` | 90% |
| 加密存储 | `store_tests.rs` | 85% |
| 服务层 | `services_tests.rs` | 80% |

运行方式:
```bash
cd src-tauri
cargo test
```

#### 前端 (TypeScript)
| 模块 | 测试文件 | 覆盖率目标 |
|------|----------|-----------|
| 类型定义 | `types.test.ts` | - |
| 工具函数 | `formatters.test.ts` | 90% |
| 状态管理 | `connectionStore.test.ts` | 75% |
| UI 组件 | `Button.test.tsx` | 70% |

运行方式:
```bash
npm test
```

### 2. 集成测试 (Integration Tests)

#### 后端集成测试
需要启动 Kafka 测试容器:

```bash
# 使用 testcontainers 或手动启动
docker run -d --name kafka-test \
  -p 9092:9092 \
  -e KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://localhost:9092 \
  confluentinc/cp-kafka:latest

# 运行集成测试
cargo test --features integration
```

#### 前端集成测试
使用 MSW (Mock Service Worker) 模拟 Tauri API:

```bash
npm run test:integration
```

### 3. E2E 测试 (End-to-End Tests)

使用 Playwright 进行端到端测试:

```bash
# 安装 Playwright
npm install -D @playwright/test
npx playwright install

# 运行 E2E 测试
npm run test:e2e
```

### 4. 手动测试清单

#### 连接管理
- [ ] 创建 PLAINTEXT 连接
- [ ] 创建 SASL/PLAIN 连接
- [ ] 创建 SASL/SCRAM 连接
- [ ] 创建 SSL 连接
- [ ] 测试连接按钮
- [ ] 编辑连接
- [ ] 删除连接
- [ ] 切换连接

#### Topic 管理
- [ ] 列出 Topic
- [ ] 查看 Topic 详情
- [ ] 创建 Topic
- [ ] 删除 Topic
- [ ] 搜索 Topic

#### 消息消费
- [ ] 实时消费消息
- [ ] 暂停/恢复消费
- [ ] 清空消息
- [ ] 按分区消费
- [ ] 查看历史消息
- [ ] 导出消息

#### 消息生产
- [ ] 发送单条消息
- [ ] 批量发送消息
- [ ] 发送 JSON 消息
- [ ] 设置消息 Key
- [ ] 指定 Partition

#### Consumer Group
- [ ] 查看 Group 列表
- [ ] 查看 Group 详情
- [ ] 查看消费 Lag

## 测试覆盖率报告

生成覆盖率报告:

```bash
# 前端覆盖率
npm run test:coverage

# 后端覆盖率
cd src-tauri
cargo tarpaulin --out Html
```

## CI/CD 测试

GitHub Actions 工作流:

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage
  
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-action@stable
      - run: cd src-tauri && cargo test
```

## 测试数据

### 测试 Kafka 配置
```
Bootstrap: localhost:9092
Auth: None
```

### 测试 Topic
- `test-topic` - 用于基本测试
- `test-json-topic` - 用于 JSON 消息测试
- `test-large-topic` - 用于大消息测试

## 已知限制

1. Kerberos 测试需要配置 KDC
2. SSL 测试需要证书
3. E2E 测试需要在打包后的应用上运行
