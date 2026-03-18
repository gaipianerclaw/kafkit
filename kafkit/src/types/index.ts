// ================= 连接相关类型 =================

export type AuthType = 'none' | 'saslPlain' | 'saslScram' | 'saslGssapi' | 'ssl';

export interface ConnectionSummary {
  id: string;
  name: string;
  bootstrapServers: string[];
  authType: AuthType;
  isConnected: boolean;
}

export interface Connection {
  id: string;
  name: string;
  bootstrapServers: string[];
  auth: AuthConfig;
  security: SecurityConfig;
  options: ConnectionOptions;
  createdAt: string;
  updatedAt: string;
}

export type AuthConfig =
  | { type: 'none' }
  | { type: 'saslPlain'; username: string; password: string }
  | { type: 'saslScram'; mechanism: 'SCRAM-SHA-256' | 'SCRAM-SHA-512'; username: string; password: string }
  | { type: 'saslGssapi'; principal: string; keytabPath?: string; serviceName: string }
  | { type: 'ssl'; caCert?: string; clientCert?: string; clientKey?: string };

export interface SecurityConfig {
  protocol: 'PLAINTEXT' | 'SSL' | 'SASL_PLAINTEXT' | 'SASL_SSL';
  sslVerifyHostname?: boolean;
}

export interface ConnectionOptions {
  requestTimeoutMs?: number;
  metadataMaxAgeMs?: number;
}

export interface ConnectionConfig {
  name: string;
  bootstrapServers: string;
  auth: AuthConfig;
  security: SecurityConfig;
  options?: ConnectionOptions;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}

// ================= Topic 相关类型 =================

export interface TopicInfo {
  name: string;
  partitionCount: number;
  replicationFactor: number;
  isInternal: boolean;
}

export interface PartitionInfo {
  partition: number;
  leader: number;
  replicas: number[];
  isr: number[];
  earliestOffset: number;
  latestOffset: number;
  messageCount: number;
}

export interface ConfigEntry {
  name: string;
  value: string;
  default: boolean;
  source: string;
}

export interface TopicDetail {
  name: string;
  partitions: PartitionInfo[];
  configs: ConfigEntry[];
}

// ================= 消息相关类型 =================

export interface KafkaMessage {
  partition: number;
  offset: number;
  timestamp?: number;
  key?: string;
  value: string;
  headers: [string, string][];
  size: number;
}

export interface ProduceMessage {
  partition?: number;
  key?: string;
  value: string;
  headers?: Record<string, string>;
}

export interface ProduceResult {
  partition: number;
  offset: number;
  timestamp: number;
}

export interface BatchProduceOptions {
  rateLimit?: number; // messages per second
}

export interface BatchProduceResult {
  success: number;
  failed: number;
  errors: { index: number; error: string }[];
}

export type OffsetSpec =
  | { type: 'latest' }
  | { type: 'earliest' }
  | { type: 'timestamp'; timestamp: number }
  | { type: 'offset'; offset: number };

// ================= Consumer Group 相关类型 =================

export interface ConsumerGroupInfo {
  groupId: string;
  state: 'Unknown' | 'PreparingRebalance' | 'CompletingRebalance' | 'Stable' | 'Dead';
  memberCount: number;
  coordinator: number;
}

export interface PartitionLag {
  topic: string;
  partition: number;
  currentOffset: number;
  logEndOffset: number;
  lag: number;
}

export type OffsetResetSpec =
  | { type: 'earliest' }
  | { type: 'latest' }
  | { type: 'timestamp'; timestamp: number }
  | { type: 'offset'; offset: number };

// ================= App 状态类型 =================

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  defaultPageSize: number;
  autoCheckUpdate: boolean;
}
