import { invoke } from '@tauri-apps/api/core';
import { listen as tauriListen } from '@tauri-apps/api/event';
import type {
  Connection,
  ConnectionConfig,
  ConnectionSummary,
  ConnectionTestResult,
  ConsumerGroupInfo,
  PartitionLag,
  OffsetResetSpec,
  KafkaMessage,
  ProduceMessage,
  ProduceResult,
  BatchProduceOptions,
  BatchProduceResult,
  TopicDetail,
  TopicInfo,
  OffsetSpec,
  ConfigEntry,
} from '../types';

// ================= 连接管理 =================

export async function getConnections(): Promise<ConnectionSummary[]> {
  return invoke('get_connections');
}

export async function getConnection(id: string): Promise<Connection> {
  return invoke('get_connection', { id });
}

export async function testConnection(config: ConnectionConfig): Promise<ConnectionTestResult> {
  console.log('[Kafkit] Calling test_connection with:', config);
  try {
    const result = await invoke('test_connection', { config });
    console.log('[Kafkit] test_connection result:', result);
    return result as ConnectionTestResult;
  } catch (error) {
    console.error('[Kafkit] test_connection failed:', error);
    throw error;
  }
}

export async function createConnection(config: ConnectionConfig): Promise<Connection> {
  console.log('[Kafkit] Calling create_connection with:', JSON.stringify(config, null, 2));
  try {
    const result = await invoke('create_connection', { config });
    console.log('[Kafkit] create_connection succeeded:', result);
    return result as Connection;
  } catch (error) {
    console.error('[Kafkit] create_connection failed:', error);
    throw error;
  }
}

export async function updateConnection(id: string, config: ConnectionConfig): Promise<Connection> {
  return invoke('update_connection', { id, config });
}

export async function deleteConnection(id: string): Promise<void> {
  return invoke('delete_connection', { id });
}

// ================= Topic 管理 =================

export async function listTopics(connectionId: string): Promise<TopicInfo[]> {
  return invoke('list_topics', { connectionId });
}

export async function getTopicDetail(connectionId: string, topic: string): Promise<TopicDetail> {
  return invoke('get_topic_detail', { connectionId, topic });
}

export async function createTopic(
  connectionId: string,
  name: string,
  numPartitions: number,
  replicationFactor: number,
  configs?: Record<string, string>
): Promise<void> {
  return invoke('create_topic', {
    connectionId,
    name,
    numPartitions,
    replicationFactor,
    configs,
  });
}

export async function deleteTopic(connectionId: string, topic: string): Promise<void> {
  return invoke('delete_topic', { connectionId, topic });
}

// ================= Topic 配置管理 =================

export async function getTopicConfigs(connectionId: string, topic: string): Promise<ConfigEntry[]> {
  return invoke('get_topic_configs', { connectionId, topic });
}

export async function updateTopicConfigs(
  connectionId: string,
  topic: string,
  configs: Record<string, string>
): Promise<void> {
  return invoke('update_topic_configs', { connectionId, topic, configs });
}

// ================= 消息消费 =================

export async function startConsuming(
  connectionId: string,
  topic: string,
  partition: number | undefined,
  startOffset: OffsetSpec
): Promise<string> {
  return invoke('start_consuming', {
    connectionId,
    topic,
    partition,
    startOffset,
  });
}

export async function stopConsuming(sessionId: string): Promise<void> {
  return invoke('stop_consuming', { sessionId });
}

export async function fetchMessages(
  connectionId: string,
  topic: string,
  partition: number,
  offset: number,
  limit: number
): Promise<{ messages: KafkaMessage[]; total: number }> {
  return invoke('fetch_messages', {
    connectionId,
    topic,
    partition,
    offset,
    limit,
  });
}

// ================= 消息生产 =================

export async function produceMessage(
  connectionId: string,
  topic: string,
  message: ProduceMessage
): Promise<ProduceResult> {
  return invoke('produce_message', {
    connectionId,
    topic,
    message,
  });
}

export async function produceBatch(
  connectionId: string,
  topic: string,
  messages: ProduceMessage[],
  options?: BatchProduceOptions
): Promise<BatchProduceResult> {
  return invoke('produce_batch', {
    connectionId,
    topic,
    messages,
    options,
  });
}

// ================= Consumer Group =================

export async function listConsumerGroups(connectionId: string): Promise<ConsumerGroupInfo[]> {
  return invoke('list_consumer_groups', { connectionId });
}

export async function getConsumerLag(
  connectionId: string,
  groupId: string
): Promise<PartitionLag[]> {
  return invoke('get_consumer_lag', { connectionId, groupId });
}

export async function resetConsumerOffset(
  connectionId: string,
  groupId: string,
  topic: string,
  partition: number | undefined,
  resetTo: OffsetResetSpec
): Promise<void> {
  return invoke('reset_consumer_offset', {
    connectionId,
    groupId,
    topic,
    partition,
    resetTo,
  });
}

// ================= 事件监听 =================

export function listen(event: string, callback: (payload: unknown) => void): Promise<() => void> {
  return tauriListen(event, callback);
}
