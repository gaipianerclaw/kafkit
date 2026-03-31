/**
 * Script Mode Type Definitions
 * 
 * @version 1.0.5
 */

// ==================== 核心消息类型 ====================

export interface ScriptMessage {
  /** Message key (null for random partition) */
  key: string | null;
  /** Message value (string or object, auto-serialized) */
  value: string | object;
  /** Optional message headers */
  headers?: Record<string, string | number>;
}

// ==================== Script Context API ====================

export interface FakerAPI {
  /** Generate random full name */
  name(): string;
  /** Generate random email address */
  email(): string;
  /** Generate random phone number */
  phone(): string;
  /** Generate random address */
  address(): string;
  /** Generate random company name */
  company(): string;
  /** Generate random text (lorem ipsum style) */
  lorem(words: number): string;
}

export interface ScriptContext {
  /** Current message index (0-based, auto-incremented) */
  index: number;
  /** State object for persistence across executions */
  state: Record<string, any>;
  /** Current timestamp in milliseconds */
  timestamp: number;
  
  // === Utility Functions ===
  
  /** Generate random integer in [min, max] */
  random(min: number, max: number): number;
  /** Generate random float in [min, max] */
  randomFloat(min: number, max: number): number;
  /** Generate UUID v4 */
  uuid(): string;
  /** Get current time in ISO 8601 format */
  now(): string;
  /** Calculate hash (md5, sha1, sha256) */
  hash(str: string, algo: 'md5' | 'sha1' | 'sha256'): string;
  /** Base64 encode string */
  base64(str: string): string;
  /** Faker data generation API */
  faker: FakerAPI;
}

// ==================== Key Strategy ====================

export type KeyStrategyType = 'custom' | 'roundrobin' | 'random' | 'fixed' | 'hash';

export interface KeyStrategy {
  type: KeyStrategyType;
  /** Custom script for 'custom' type */
  script?: string;
  /** Fixed key value for 'fixed' type */
  fixedKey?: string;
  /** Partition count for 'roundrobin' calculation */
  partitionCount?: number;
}

// ==================== Send Strategy ====================

export type SendMode = 'immediate' | 'tps' | 'interval' | 'cron';

export interface SendConfig {
  /** Send mode */
  mode: SendMode;
  /** JavaScript code for message generation */
  script: string;
  /** Key generation strategy */
  keyStrategy: KeyStrategy;
  
  // TPS mode
  /** Target TPS (1-10000) */
  targetTPS?: number;
  
  // Interval mode
  /** Interval in milliseconds (1-3600000) */
  intervalMs?: number;
  
  // Cron mode
  /** Cron expression (6 fields with seconds) */
  cronExpression?: string;
  
  // Limits
  /** Maximum messages to send (0 = unlimited) */
  maxMessages?: number;
  /** Maximum duration in milliseconds (0 = unlimited) */
  maxDurationMs?: number;
}

// ==================== Task Management ====================

export type TaskStatus = 'idle' | 'running' | 'paused' | 'completed' | 'error';

export interface TaskError {
  /** Error timestamp */
  timestamp: number;
  /** Error message */
  message: string;
  /** Additional context */
  context?: string;
}

export interface SendTask {
  /** Unique task ID */
  id: string;
  /** Current status */
  status: TaskStatus;
  /** Send configuration */
  config: SendConfig;
  
  // Statistics
  /** Total sent count */
  sentCount: number;
  /** Successful count */
  successCount: number;
  /** Failed count */
  failedCount: number;
  /** Start timestamp */
  startTime?: number;
  /** End timestamp */
  endTime?: number;
  
  // Errors
  /** Recent errors (max 10) */
  errors: TaskError[];
  
  // Performance
  /** Current TPS (sliding window) */
  currentTPS: number;
}

// ==================== Template ====================

export interface ScriptTemplate {
  /** Template ID */
  id: string;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** Category */
  category: 'iot' | 'ecommerce' | 'log' | 'finance' | 'social' | 'system';
  /** Template script code */
  script: string;
  /** Default key strategy */
  defaultKeyStrategy: KeyStrategy;
}

// ==================== Engine Interfaces ====================

export interface ScriptEngine {
  /** Initialize the engine */
  init(): Promise<void>;
  
  /** Execute message generation script */
  executeGenerate(
    script: string,
    context: ScriptContext
  ): Promise<ScriptMessage | ScriptMessage[]>;
  
  /** Execute key generation script */
  executeKeyScript(
    script: string,
    context: ScriptContext
  ): Promise<string | null>;
  
  /** Validate script syntax */
  validate(script: string): Promise<string | null>;
  
  /** Destroy engine and release resources */
  destroy(): void;
}

// ==================== Errors ====================

export class ScriptTimeoutError extends Error {
  constructor(public readonly executionTime: number) {
    super(`Script execution timeout after ${executionTime}ms`);
    this.name = 'ScriptTimeoutError';
  }
}

export class ScriptRuntimeError extends Error {
  constructor(
    message: string,
    public readonly line?: number,
    public readonly column?: number
  ) {
    super(message);
    this.name = 'ScriptRuntimeError';
  }
}

export class SecurityError extends Error {
  constructor(message: string) {
    super(`Security violation: ${message}`);
    this.name = 'SecurityError';
  }
}
