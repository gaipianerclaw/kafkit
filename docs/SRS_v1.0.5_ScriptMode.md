# 软件需求规格说明书 (SRS)

## v1.0.5 Producer Script Mode

> **版本**: 1.0  
> **日期**: 2026-03-31  
> **遵循标准**: IEEE 830-1998  
> **状态**: 待审批

---

## 1. 引言

### 1.1 目的

本文档定义 Kafkit v1.0.5 版本中**生产者页面脚本模式**的完整需求规格。

### 1.2 范围

本规格覆盖：
- 脚本编辑器 UI 组件
- JavaScript 脚本执行引擎（QuickJS）
- 消息生成与发送流程
- 发送策略控制（TPS/定时/Cron）
- Key 生成策略
- 内置模板库
- 安全沙箱机制

**不包含**：
- Python 脚本执行（P1，预留接口）
- 用户自定义模板保存
- 分布式多节点发送

### 1.3 定义与缩写

| 术语 | 定义 |
|------|------|
| TPS | Transactions Per Second，每秒事务数 |
| Cron | Unix 风格的定时任务表达式 |
| WASM | WebAssembly，浏览器端沙箱执行环境 |
| QuickJS | Bellard 开发的轻量级 JS 引擎 |
| Pyodide | Python 的 WASM 运行时（预留） |

### 1.4 参考资料

- V1.0.5_ROADMAP.md - 技术路线图
- Producer Page 现有实现
- QuickJS 文档: https://bellard.org/quickjs/

---

## 2. 总体描述

### 2.1 产品视角

脚本模式是 ProducerPage 的第四种发送模式，与 Single/Batch/Scheduled 并列：

```
ProducerPage
├── SingleMode (现有)
├── BatchMode (现有)
├── ScheduledMode (现有)
└── ScriptMode (NEW v1.0.5)
```

### 2.2 用户特征

- 目标用户：熟悉 JavaScript 的开发者/测试人员
- 技术能力：具备基础 JS 编程能力，了解 Kafka 消息结构
- 使用场景：模拟复杂数据流、压力测试、场景化测试

### 2.3 运行环境

- 浏览器：Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- 内存：建议 4GB+（WASM 运行需要）
- 网络：无需外部网络（脚本沙箱限制）

### 2.4 约束与假设

**技术约束**：
- 脚本执行时间限制：≤100ms/条
- 内存限制：≤1MB/脚本实例
- 单线程执行（Web Worker 可选优化）

**假设**：
- 用户了解 Kafka 消息 Key/Value/Header 结构
- 集群连接状态正常时才能执行脚本发送

---

## 3. 具体需求

### 3.1 功能需求

#### 3.1.1 脚本编辑器 (FE-SCRIPT-001)

**优先级**: P0  
**描述**: 提供 Monaco Editor 集成的脚本编辑界面

| ID | 需求描述 | 验收标准 |
|----|---------|---------|
| FE-SCRIPT-001-1 | 集成 Monaco Editor，支持 JavaScript 语法高亮 | 代码高亮、括号匹配、自动缩进正常 |
| FE-SCRIPT-001-2 | 支持代码折叠和行号显示 | 可折叠函数块，行号连续显示 |
| FE-SCRIPT-001-3 | 编辑器高度自适应，最小 300px | 响应式布局，无内容截断 |
| FE-SCRIPT-001-4 | 支持全屏编辑模式 | 全屏按钮，ESC 退出全屏 |

#### 3.1.2 脚本上下文 API (FE-SCRIPT-002)

**优先级**: P0  
**描述**: 提供脚本可用的内置工具函数

| ID | 需求描述 | 验收标准 |
|----|---------|---------|
| FE-SCRIPT-002-1 | `ctx.random(min, max)` - 随机整数 | 返回 [min, max] 范围内整数 |
| FE-SCRIPT-002-2 | `ctx.randomFloat(min, max)` - 随机浮点数 | 返回 [min, max] 范围内浮点数 |
| FE-SCRIPT-002-3 | `ctx.uuid()` - UUID v4 | 返回标准 UUID 字符串 |
| FE-SCRIPT-002-4 | `ctx.timestamp()` - 当前毫秒时间戳 | 返回 Unix 毫秒时间戳 |
| FE-SCRIPT-002-5 | `ctx.now()` - ISO 格式时间 | 返回 ISO 8601 格式字符串 |
| FE-SCRIPT-002-6 | `ctx.hash(str, algo)` - 哈希计算 | 支持 MD5/SHA1/SHA256 |
| FE-SCRIPT-002-7 | `ctx.base64(str)` - Base64 编码 | 标准 Base64 编码 |
| FE-SCRIPT-002-8 | `ctx.state` - 状态持久对象 | 跨消息调用保持状态 |
| FE-SCRIPT-002-9 | `ctx.index` - 当前消息序号 | 从 0 开始的递增序号 |
| FE-SCRIPT-002-10 | `ctx.faker` - 假数据生成 | 支持 name/address/email/phone 等 |

#### 3.1.3 消息生成脚本 (FE-SCRIPT-003)

**优先级**: P0  
**描述**: 脚本必须返回消息对象或消息数组

| ID | 需求描述 | 验收标准 |
|----|---------|---------|
| FE-SCRIPT-003-1 | 脚本函数签名: `function generate(ctx)` | 引擎自动注入 ctx 参数 |
| FE-SCRIPT-003-2 | 返回单条消息对象: `{ key, value, headers? }` | key/value 为 string \| Buffer |
| FE-SCRIPT-003-3 | 返回消息数组批量生成 | 数组长度 ≥1，每条独立发送 |
| FE-SCRIPT-003-4 | value 支持字符串和 JSON 对象 | JSON 自动序列化 |
| FE-SCRIPT-003-5 | headers 为可选的键值对对象 | 值类型为 string \| number |
| FE-SCRIPT-003-6 | 脚本异常时返回错误信息 | 错误捕获并显示在 UI |

#### 3.1.4 Key 生成策略 (FE-SCRIPT-004)

**优先级**: P0  
**描述**: 支持自定义 Key 生成和默认策略

| ID | 需求描述 | 验收标准 |
|----|---------|---------|
| FE-SCRIPT-004-1 | 自定义 Key 脚本: `function generateKey(ctx)` | 返回 string \| null |
| FE-SCRIPT-004-2 | 默认策略: 轮询 (RoundRobin) | 按分区数循环 |
| FE-SCRIPT-004-3 | 默认策略: 随机 (Random) | 随机选择分区 |
| FE-SCRIPT-004-4 | 默认策略: 固定 (Fixed) | 使用指定 Key 或 null |
| FE-SCRIPT-004-5 | 默认策略: 哈希 (Hash) | 对消息内容哈希 |
| FE-SCRIPT-004-6 | 策略切换 UI | 下拉选择 + 参数输入 |

#### 3.1.5 发送策略 (FE-SCRIPT-005)

**优先级**: P0  
**描述**: 四种发送控制策略

| ID | 需求描述 | 验收标准 |
|----|---------|---------|
| FE-SCRIPT-005-1 | **即时发送**: 立即执行脚本并发送 | 脚本执行完成即发送 |
| FE-SCRIPT-005-2 | **TPS 控制**: 指定目标 TPS | 支持 1-10000 TPS |
| FE-SCRIPT-005-3 | **固定间隔**: 每隔 N 毫秒发送 | 支持 1-3600000ms |
| FE-SCRIPT-005-4 | **Cron 定时**: 按 Cron 表达式触发 | 支持秒级（6字段） |
| FE-SCRIPT-005-5 | **消息数量限制**: 可设置最大发送条数 | 0 表示无限制 |
| FE-SCRIPT-005-6 | **持续时间限制**: 可设置运行时长 | 0 表示无限制 |
| FE-SCRIPT-005-7 | 发送过程中可暂停/继续 | 暂停后保持状态 |
| FE-SCRIPT-005-8 | 发送过程中可停止 | 立即停止，清空队列 |

#### 3.1.6 内置模板库 (FE-SCRIPT-006)

**优先级**: P1  
**描述**: 提供 8 种场景模板

| ID | 模板名称 | 描述 |
|----|---------|------|
| FE-SCRIPT-006-1 | IoT Sensor | 模拟温度/湿度/压力传感器数据 |
| FE-SCRIPT-006-2 | E-commerce Order | 订单创建/支付/发货事件 |
| FE-SCRIPT-006-3 | Log Stream | 应用日志流（多级别） |
| FE-SCRIPT-006-4 | Stock Ticker | 股票行情数据 |
| FE-SCRIPT-006-5 | User Activity | 用户行为事件（PV/点击） |
| FE-SCRIPT-006-6 | Metric Stream | 系统监控指标 |
| FE-SCRIPT-006-7 | Social Feed | 社交媒体动态 |
| FE-SCRIPT-006-8 | Transaction | 金融交易流水 |

#### 3.1.7 实时预览 (FE-SCRIPT-007)

**优先级**: P1  
**描述**: 预览脚本生成的消息

| ID | 需求描述 | 验收标准 |
|----|---------|---------|
| FE-SCRIPT-007-1 | 手动触发预览按钮 | 执行一次脚本，显示结果 |
| FE-SCRIPT-007-2 | 预览显示 Key/Value/Headers | JSON 格式化展示 |
| FE-SCRIPT-007-3 | 预览状态保持 | 保存最近 3 条预览记录 |
| FE-SCRIPT-007-4 | 预览错误提示 | 显示错误信息和行号 |

#### 3.1.8 执行监控 (FE-SCRIPT-008)

**优先级**: P1  
**描述**: 显示发送任务实时状态

| ID | 需求描述 | 验收标准 |
|----|---------|---------|
| FE-SCRIPT-008-1 | 显示已发送数量 | 实时更新计数 |
| FE-SCRIPT-008-2 | 显示当前 TPS | 滑动窗口计算 |
| FE-SCRIPT-008-3 | 显示成功率/失败率 | 百分比统计 |
| FE-SCRIPT-008-4 | 显示运行时长 | 格式: HH:MM:SS |
| FE-SCRIPT-008-5 | 显示错误日志（最近 10 条） | 可清空、可展开详情 |
| FE-SCRIPT-008-6 | 发送完成后显示汇总报告 | 总数/成功/失败/耗时 |

### 3.2 非功能需求

#### 3.2.1 性能需求

| ID | 需求 | 指标 |
|----|-----|------|
| NF-PERF-001 | 脚本执行开销 | ≤10ms/条（不含发送） |
| NF-PERF-002 | 最大 TPS | 10000（脚本生成 + 发送） |
| NF-PERF-003 | 编辑器加载时间 | ≤2s（首次） |
| NF-PERF-004 | 内存占用 | ≤100MB（含 WASM） |

#### 3.2.2 安全需求

| ID | 需求 | 实现方式 |
|----|-----|---------|
| NF-SEC-001 | 禁止网络请求 | 沙箱移除 fetch/XHR/WebSocket |
| NF-SEC-002 | 禁止文件系统访问 | 沙箱移除 File API |
| NF-SEC-003 | 禁止本地存储 | 沙箱移除 localStorage/indexedDB |
| NF-SEC-004 | 执行超时 | 100ms/脚本，超时强制终止 |
| NF-SEC-005 | 内存限制 | 1MB/脚本实例 |
| NF-SEC-006 | 代码注入防护 | 正则检测危险代码模式 |

#### 3.2.3 可用性需求

| ID | 需求 | 说明 |
|----|-----|------|
| NF-UX-001 | 语法错误实时提示 | Monaco lint 集成 |
| NF-UX-002 | 示例代码一键插入 | 模板按钮点击插入 |
| NF-UX-003 | 键盘快捷键 | Ctrl+Enter 预览，F5 开始发送 |
| NF-UX-004 | 状态持久化 | 刷新页面恢复编辑器内容 |

#### 3.2.4 兼容性需求

| ID | 需求 | 说明 |
|----|-----|------|
| NF-COMP-001 | WASM 降级 | 不支持时显示提示 |
| NF-COMP-002 | 移动端适配 | 编辑器最小宽度 320px |

---

## 4. 接口需求

### 4.1 用户界面

#### 4.1.1 页面布局

```
┌─────────────────────────────────────────────────────────────┐
│  [Single] [Batch] [Scheduled] [Script]                      │
├──────────────────────┬──────────────────────────────────────┤
│                      │                                      │
│  Template Selector   │  Monaco Editor (JavaScript)          │
│  ├─ IoT Sensor       │                                      │
│  ├─ E-commerce Order │  function generate(ctx) {            │
│  ├─ Log Stream       │    return {                          │
│  ├─ ...              │      key: ctx.uuid(),                │
│                      │      value: { temp: ctx.random(20,30)│
│  ────────────────────│      }                               │
│                      │    };                                │
│  Key Strategy        │  }                                   │
│  ├─ Custom Script    │                                      │
│  ├─ RoundRobin       │  [Preview] [Format] [FullScreen]     │
│  ├─ Random           │                                      │
│  ├─ Fixed            │                                      │
│  └─ Hash             │                                      │
│                      │                                      │
├──────────────────────┴──────────────────────────────────────┤
│  Sending Strategy                                           │
│  ├─ Mode: [Immediate ▼] [TPS ▼] [Interval ▼] [Cron ▼]      │
│  ├─ TPS: [5000    ] / Interval: [100   ]ms / Cron: [* * *] │
│  ├─ Limit: Messages: [10000   ] Duration: [60   ]min       │
│  └─ [▶ Start] [⏸ Pause] [⏹ Stop]                           │
├─────────────────────────────────────────────────────────────┤
│  Preview Panel                              Monitor Panel   │
│  ┌─────────────────────────┐  ┌───────────────────────────┐ │
│  │ Key: xxx                │  │ Sent: 1,234  TPS: 4,567   │ │
│  │ Value: {                │  │ Success: 99.9%  Time: 12s │ │
│  │   temp: 25.3            │  │ ───────────────────────── │ │
│  │ }                       │  │ Error: timeout at L5      │ │
│  └─────────────────────────┘  └───────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### 4.1.2 交互流程

1. **选择模板** → 代码插入编辑器
2. **编辑脚本** → 实时语法检查
3. **选择 Key 策略** → 配置参数
4. **选择发送策略** → 配置参数
5. **预览测试** → 验证输出
6. **开始发送** → 实时监控

### 4.2 软件接口

#### 4.2.1 QuickJS 集成接口

```typescript
interface ScriptEngine {
  // 初始化引擎
  init(): Promise<void>;
  
  // 执行生成脚本
  execute(
    script: string,
    context: ExecutionContext
  ): Promise<Message | Message[]>;
  
  // 销毁引擎
  destroy(): void;
}

interface ExecutionContext {
  index: number;
  state: Record<string, any>;
  timestamp: number;
}

interface Message {
  key: string | null;
  value: string | object;
  headers?: Record<string, string | number>;
}
```

#### 4.2.2 发送服务接口

```typescript
interface ScriptSendService {
  // 开始发送任务
  start(config: SendConfig): Promise<TaskId>;
  
  // 暂停任务
  pause(taskId: TaskId): void;
  
  // 继续任务
  resume(taskId: TaskId): void;
  
  // 停止任务
  stop(taskId: TaskId): void;
  
  // 获取任务状态
  getStatus(taskId: TaskId): TaskStatus;
}

interface SendConfig {
  script: string;
  keyStrategy: KeyStrategy;
  sendMode: SendMode;
  targetTPS?: number;
  interval?: number;
  cronExpression?: string;
  maxMessages?: number;
  maxDuration?: number;
}
```

---

## 5. 验收标准

### 5.1 功能验收

| 验收项 | 通过标准 |
|-------|---------|
| 脚本编辑 | 能编写、保存、格式化 JS 代码 |
| 消息生成 | 单条/批量消息正确生成 |
| Key 生成 | 自定义/默认策略正常工作 |
| TPS 发送 | 100-10000 TPS 可控 |
| Cron 发送 | 秒级 Cron 表达式正确触发 |
| 监控面板 | 实时数据准确显示 |
| 模板库 | 8 个模板均可正常使用 |

### 5.2 性能验收

| 验收项 | 通过标准 |
|-------|---------|
| 1000 TPS | CPU < 50%，内存 < 100MB |
| 5000 TPS | CPU < 70%，无消息堆积 |
| 10000 TPS | 不崩溃，实际 TPS 误差 < 5% |

### 5.3 安全验收

| 验收项 | 通过标准 |
|-------|---------|
| 网络隔离 | `fetch()` 调用抛出异常 |
| 存储隔离 | `localStorage` 访问抛出异常 |
| 超时保护 | 死循环脚本 100ms 内终止 |
| 内存保护 | 大数组创建被限制 |

---

## 6. 附录

### 6.1 脚本示例

#### 示例 1: IoT 传感器
```javascript
function generate(ctx) {
  const deviceId = `sensor_${ctx.random(1, 100)}`;
  const temp = 20 + ctx.randomFloat(-5, 5);
  
  return {
    key: deviceId,
    value: {
      deviceId,
      temperature: temp.toFixed(2),
      humidity: ctx.random(40, 80),
      timestamp: ctx.now()
    }
  };
}
```

#### 示例 2: 带状态的消息序列
```javascript
function generate(ctx) {
  // 初始化状态
  if (!ctx.state.orderId) {
    ctx.state.orderId = 10000;
    ctx.state.status = 'created';
  }
  
  const orderId = ctx.state.orderId++;
  const statuses = ['created', 'paid', 'shipped', 'delivered'];
  const status = statuses[ctx.index % 4];
  
  return {
    key: `order_${orderId}`,
    value: { orderId, status, time: ctx.now() }
  };
}
```

#### 示例 3: 批量生成
```javascript
function generate(ctx) {
  const messages = [];
  for (let i = 0; i < 10; i++) {
    messages.push({
      key: `batch_${ctx.index}_${i}`,
      value: { index: ctx.index * 10 + i }
    });
  }
  return messages;
}
```

### 6.2 Cron 表达式格式

采用 6 字段格式（含秒）：

```
秒 分 时 日 月 星期
*  *  *  *  *  *
│  │  │  │  │  └─ 星期 (0-7, 0/7=周日)
│  │  │  │  └──── 月 (1-12)
│  │  │  └─────── 日 (1-31)
│  │  └────────── 时 (0-23)
│  └───────────── 分 (0-59)
└──────────────── 秒 (0-59)
```

示例：
- `*/5 * * * * *` - 每 5 秒
- `0 */5 * * * *` - 每 5 分钟
- `0 0 9 * * 1` - 每周一 9:00:00

---

## 7. 审批

| 角色 | 姓名 | 签字 | 日期 |
|-----|-----|-----|-----|
| 产品经理 | ______ | ______ | ______ |
| 技术负责人 | ______ | ______ | ______ |
| 测试负责人 | ______ | ______ | ______ |

---

**确认通过 SRS，进入 Phase 2**

请回复 **"确认通过 SRS，进入 Phase 2"** 开始技术设计阶段。
