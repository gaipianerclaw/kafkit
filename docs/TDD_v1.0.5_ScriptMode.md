# 技术设计文档 (TDD)

## v1.0.5 Producer Script Mode

> **版本**: 1.0  
> **日期**: 2026-03-31  
> **分支**: dev/v1.0.5  
> **状态**: 待审批

---

## 1. 设计目标

### 1.1 核心目标

- 在保留现有 Single/Batch/Scheduled 模式的前提下，新增 Script Mode
- 实现基于 QuickJS 的 JavaScript 脚本执行引擎
- 支持高 TPS（10000）消息生成与发送
- 提供完整的脚本编辑器与调试工具

### 1.2 兼容性承诺

```
ProducerPage (现有)
├── SingleMode    <- 完全保留，不做修改
├── BatchMode     <- 完全保留，不做修改
├── ScheduledMode <- 完全保留，不做修改
└── ScriptMode    <- 新增，独立组件
```

**零侵入原则**: Script Mode 的所有实现都在新文件/新目录中，不修改现有模式代码。

---

## 2. 架构设计

### 2.1 整体架构

```
+-------------------+     +-------------------+     +-------------------+
|    UI Layer       |     |  Script Engine    |     |   Service Layer   |
+-------------------+     +-------------------+     +-------------------+
| ProducerPage      |---->| ScriptEngineMgr   |---->| ScriptSendService |
|   - ScriptMode    |     |   - QuickJS Eng   |     |   - TPSController |
|   - ScriptEditor  |     |   - KeyStrategy   |     |   - CronScheduler |
|   - MonitorPanel  |     +-------------------+     |   - Kafka Service |
+-------------------+                               +-------------------+
```

### 2.2 组件关系

```
ProducerPage
├── Header (Mode Tabs)
└── Content Area
    ├── SingleMode Component    <- 现有
    ├── BatchMode Component     <- 现有
    ├── ScheduledMode Component <- 现有
    └── ScriptMode Component    <- NEW
        ├── ScriptEditor (Monaco)
        ├── TemplateSelector
        ├── KeyStrategyPanel
        ├── StrategyConfig
        ├── PreviewPanel
        └── MonitorPanel
```

---

## 3. 目录结构

```
kafkit/src/
├── pages/
│   └── Producer/
│       ├── ProducerPage.tsx          # 主页面（添加 script mode）
│       ├── SingleMode.tsx            # 抽取现有 single mode
│       ├── BatchMode.tsx             # 抽取现有 batch mode
│       ├── ScheduledMode.tsx         # 抽取现有 scheduled mode
│       └── ScriptMode/               # NEW
│           ├── index.tsx
│           ├── ScriptEditor.tsx
│           ├── TemplateSelector.tsx
│           ├── KeyStrategyPanel.tsx
│           ├── StrategyConfig.tsx
│           ├── PreviewPanel.tsx
│           └── MonitorPanel.tsx
├── services/
│   └── script/                       # NEW
│       ├── ScriptEngine.ts
│       ├── ScriptSendService.ts
│       ├── TPSController.ts
│       ├── CronScheduler.ts
│       └── templates/
│           ├── iotSensor.ts
│           ├── ecommerceOrder.ts
│           ├── logStream.ts
│           ├── stockTicker.ts
│           ├── userActivity.ts
│           ├── metricStream.ts
│           ├── socialFeed.ts
│           └── transaction.ts
├── hooks/
│   └── useScriptEngine.ts            # NEW
├── types/
│   └── script.ts                     # NEW
├── workers/
│   └── script.worker.ts              # NEW
└── utils/
    └── script/
        ├── validators.ts
        └── sandbox.ts
```

---

## 4. 类型定义

### 4.1 核心类型 (types/script.ts)

```typescript
export interface ScriptMessage {
  key: string | null;
  value: string | object;
  headers?: Record<string, string | number>;
}

export interface ScriptContext {
  index: number;
  state: Record<string, any>;
  timestamp: number;
  random(min: number, max: number): number;
  randomFloat(min: number, max: number): number;
  uuid(): string;
  timestamp(): number;
  now(): string;
  hash(str: string, algo: 'md5' | 'sha1' | 'sha256'): string;
  base64(str: string): string;
  faker: FakerAPI;
}

export interface FakerAPI {
  name(): string;
  email(): string;
  phone(): string;
  address(): string;
  company(): string;
  lorem(words: number): string;
}

export type KeyStrategyType = 'custom' | 'roundrobin' | 'random' | 'fixed' | 'hash';

export interface KeyStrategy {
  type: KeyStrategyType;
  script?: string;
  fixedKey?: string;
  partitionCount?: number;
}

export type SendMode = 'immediate' | 'tps' | 'interval' | 'cron';

export interface SendConfig {
  mode: SendMode;
  script: string;
  keyStrategy: KeyStrategy;
  targetTPS?: number;
  intervalMs?: number;
  cronExpression?: string;
  maxMessages?: number;
  maxDurationMs?: number;
}

export type TaskStatus = 'idle' | 'running' | 'paused' | 'completed' | 'error';

export interface SendTask {
  id: string;
  status: TaskStatus;
  config: SendConfig;
  sentCount: number;
  successCount: number;
  failedCount: number;
  startTime?: number;
  endTime?: number;
  errors: TaskError[];
  currentTPS: number;
}

export interface TaskError {
  timestamp: number;
  message: string;
  context?: string;
}

export interface ScriptTemplate {
  id: string;
  name: string;
  description: string;
  category: 'iot' | 'ecommerce' | 'log' | 'finance' | 'social' | 'system';
  script: string;
  defaultKeyStrategy: KeyStrategy;
}
```

---

## 5. ScriptEngine 接口

```typescript
export interface ScriptEngine {
  init(): Promise<void>;
  
  executeGenerate(
    script: string,
    context: ScriptContext
  ): Promise<ScriptMessage | ScriptMessage[]>;
  
  executeKeyScript(
    script: string,
    context: ScriptContext
  ): Promise<string | null>;
  
  validate(script: string): Promise<string | null>;
  destroy(): void;
}

export class ScriptTimeoutError extends Error {
  constructor(public readonly executionTime: number) {
    super(`Script execution timeout after ${executionTime}ms`);
  }
}

export class ScriptRuntimeError extends Error {
  constructor(
    message: string,
    public readonly line?: number,
    public readonly column?: number
  ) {
    super(message);
  }
}
```

---

## 6. ScriptSendService 接口

```typescript
export interface ScriptSendService {
  start(config: SendConfig): Promise<string>;
  pause(taskId: string): void;
  resume(taskId: string): void;
  stop(taskId: string): void;
  getStatus(taskId: string): SendTask | undefined;
  subscribe(taskId: string, callback: (task: SendTask) => void): () => void;
  getAllTasks(): SendTask[];
  cleanup(): void;
}
```

---

## 7. 核心算法设计

### 7.1 令牌桶 TPS 控制

```typescript
export class TokenBucketController {
  private tokens: number;
  private lastUpdate: number;
  private readonly capacity: number;
  private readonly fillRate: number;
  
  constructor(tps: number) {
    this.capacity = Math.max(tps, 100);
    this.tokens = this.capacity;
    this.fillRate = tps / 1000;
    this.lastUpdate = Date.now();
  }
  
  acquire(): number {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return 0;
    }
    const needed = 1 - this.tokens;
    return Math.ceil(needed / this.fillRate);
  }
  
  private refill(): void {
    const now = Date.now();
    const delta = now - this.lastUpdate;
    this.lastUpdate = now;
    this.tokens = Math.min(this.capacity, this.tokens + delta * this.fillRate);
  }
}
```

### 7.2 Cron 调度器

```typescript
import { parseExpression } from 'cron-parser';

export class CronScheduler {
  private expression: any;
  
  constructor(cronExpression: string) {
    this.expression = parseExpression(cronExpression, {
      iterator: true,
      utc: false
    });
  }
  
  next(): Date {
    return this.expression.next().toDate();
  }
  
  getWaitTime(): number {
    const next = this.next();
    return Math.max(0, next.getTime() - Date.now());
  }
  
  static validate(expression: string): string | null {
    try {
      parseExpression(expression);
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : 'Invalid';
    }
  }
}
```

---

## 8. 安全沙箱设计

### 8.1 QuickJS 安全配置

```typescript
export class QuickJSEngine implements ScriptEngine {
  async init(): Promise<void> {
    const module = await getQuickJS();
    this.runtime = module.newRuntime();
    
    // 资源限制
    this.runtime.setMemoryLimit(1024 * 1024);      // 1MB
    this.runtime.setMaxStackSize(1024 * 512);       // 512KB
    
    this.setupSandbox();
  }
  
  private setupSandbox(): void {
    const context = this.runtime.newContext();
    
    // 移除危险全局对象
    const dangerous = [
      'fetch', 'XMLHttpRequest', 'WebSocket',
      'localStorage', 'sessionStorage', 'indexedDB',
      'Worker', 'SharedArrayBuffer'
    ];
    
    for (const name of dangerous) {
      context.setProp(context.global, name, { undefined: true });
    }
  }
}
```

---

## 9. UI 布局设计

```
+-------------------------------------------------------------+
|  [Single] [Batch] [Scheduled] [Script]                      |
+----------------------+--------------------------------------+
| Template Selector    | ScriptEditor (Monaco)                |
| - IoT Sensor         |                                      |
| - E-commerce Order   | function generate(ctx) {             |
| - Log Stream         |   return {                           |
| - Stock Ticker       |     key: ctx.uuid(),                 |
| - User Activity      |     value: {                         |
| - Metric Stream      |       temp: ctx.random(20, 30)       |
| - Social Feed        |     }                                |
| - Transaction        |   };                                 |
|                      | }                                    |
+----------------------+                                      |
| Key Strategy         | [Preview] [Format] [Fullscreen]      |
| (*) Round Robin      |                                      |
| ( ) Random           |                                      |
| ( ) Fixed Key        |                                      |
| ( ) Custom Script    |                                      |
+----------------------+--------------------------------------+
| Sending Strategy                                            |
| Mode: [Immediate] [TPS: 5000] [Interval] [Cron: * * * * * *]|
| Limit: Messages: [0] Duration: [0] min                      |
|              [Start] [Pause] [Stop]                         |
+--------------------------+----------------------------------+
| Preview Panel            | Monitor Panel                   |
| {                        | Sent: 12,345    TPS: 5,000      |
|   "key": "uuid",         | Success: 99.9%  Time: 00:02:30  |
|   "value": {...}         | Errors: 2                       |
| }                        |                                 |
+--------------------------+----------------------------------+
```

---

## 10. 测试策略

### 10.1 单元测试覆盖

| 模块 | 目标覆盖率 |
|-----|-----------|
| QuickJSEngine | 90% |
| TPSController | 95% |
| CronScheduler | 90% |
| ScriptSendService | 85% |

### 10.2 性能测试基准

| 测试项 | 目标 |
|-------|-----|
| 单条执行延迟 | < 5ms |
| 1000 TPS | CPU < 50% |
| 5000 TPS | 误差 < 5% |
| 10000 TPS | 不崩溃，> 9500 |

### 10.3 安全测试

- fetch/XHR 访问被阻止
- localStorage 访问被阻止
- 死循环脚本 100ms 内终止
- 大内存分配被拒绝

---

## 11. 迁移计划

### 11.1 ProducerPage 重构（向后兼容）

```typescript
export function ProducerPage() {
  const [mode, setMode] = useState<'single'|'batch'|'scheduled'|'script'>('single');
  
  return (
    <div>
      <ModeTabs mode={mode} onChange={setMode} />
      {mode === 'single' && <SingleMode />}
      {mode === 'batch' && <BatchMode />}
      {mode === 'scheduled' && <ScheduledMode />}
      {mode === 'script' && <ScriptMode />}  // NEW
    </div>
  );
}
```

### 11.2 实现顺序

**Week 1**: 基础架构
- 拆分 ProducerPage 组件
- Monaco Editor 集成
- QuickJS 基础封装

**Week 2**: 脚本引擎
- ScriptEngine 完整实现
- ctx 工具函数
- Web Worker 集成
- 模板库

**Week 3**: 发送控制
- TPSController
- CronScheduler
- ScriptSendService
- 监控面板

**Week 4**: 测试优化
- 集成测试
- 性能优化
- 文档完善

---

## 12. 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|-----|-----|-----|---------|
| WASM 加载失败 | 低 | 高 | 提供降级方案 |
| 高 TPS UI 卡顿 | 中 | 中 | Web Worker 隔离 |
| 内存泄漏 | 中 | 高 | 定期测试，设置上限 |

---

## 13. 审批

**确认通过设计，进入 Phase 3**

请回复 **"确认通过设计，进入 Phase 3"** 开始开发实现。
