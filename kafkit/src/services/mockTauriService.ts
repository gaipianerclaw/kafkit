/**
 * Mock Tauri Service for Browser Preview
 * 在浏览器环境中模拟 Tauri API，用于界面演示
 */

import type {
  Connection,
  ConnectionConfig,
  ConnectionSummary,
  ConnectionTestResult,
  ConsumerGroupInfo,
  KafkaMessage,
  PartitionLag,
  ProduceMessage,
  ProduceResult,
  TopicDetail,
  TopicInfo,
} from '../types';

// 模拟延迟
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 模拟连接存储
let mockConnections: Connection[] = [
  {
    id: 'mock-1',
    name: 'EC2 Kafka (Mock)',
    bootstrapServers: ['ec2-dmz-kafka-01:9092'],
    auth: { type: 'none' },
    security: { protocol: 'PLAINTEXT' },
    options: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// 模拟 Topics
const mockTopics: TopicInfo[] = [
  { name: 'user-events', partitionCount: 3, replicationFactor: 1, isInternal: false },
  { name: 'order-events', partitionCount: 6, replicationFactor: 1, isInternal: false },
  { name: 'system-logs', partitionCount: 1, replicationFactor: 1, isInternal: false },
  { name: '__consumer_offsets', partitionCount: 50, replicationFactor: 1, isInternal: true },
];

// 模拟消息
const generateMockMessages = (topic: string, count: number): KafkaMessage[] => {
  const messages: KafkaMessage[] = [];
  const now = Date.now();
  
  for (let i = 0; i < count; i++) {
    messages.push({
      partition: Math.floor(Math.random() * 3),
      offset: 1000 + i,
      timestamp: now - (count - i) * 1000,
      key: `key-${i}`,
      value: JSON.stringify({
        id: 1000 + i,
        topic: topic,
        message: `Mock message ${i}`,
        timestamp: new Date(now - (count - i) * 1000).toISOString(),
        data: {
          userId: `user-${i}`,
          action: ['login', 'logout', 'purchase', 'view'][Math.floor(Math.random() * 4)],
        },
      }, null, 2),
      headers: [['source', 'mock'], ['version', '1.0']],
      size: 256 + Math.floor(Math.random() * 1000),
    });
  }
  
  return messages;
};

// ================= 连接管理 Mock =================

export async function getConnections(): Promise<ConnectionSummary[]> {
  await delay(300);
  return mockConnections.map(c => ({
    id: c.id,
    name: c.name,
    bootstrapServers: c.bootstrapServers,
    authType: c.auth.type,
    isConnected: true,
  }));
}

export async function getConnection(id: string): Promise<Connection> {
  await delay(200);
  const conn = mockConnections.find(c => c.id === id);
  if (!conn) throw new Error('Connection not found');
  return conn;
}

export async function testConnection(config: ConnectionConfig): Promise<ConnectionTestResult> {
  await delay(800);
  
  // 模拟连接测试
  if (config.bootstrapServers.includes('ec2-dmz-kafka-01')) {
    return {
      success: true,
      message: '连接成功！\n发现 4 个 Topics，Broker 版本: 3.5.1',
      details: {
        brokerCount: 1,
        topicCount: 4,
        version: '3.5.1',
      },
    };
  }
  
  return {
    success: false,
    message: '无法连接到 Kafka 集群，请检查地址和端口',
  };
}

export async function createConnection(config: ConnectionConfig): Promise<Connection> {
  await delay(500);
  const newConn: Connection = {
    id: `conn-${Date.now()}`,
    name: config.name,
    bootstrapServers: config.bootstrapServers.split(',').map(s => s.trim()),
    auth: config.auth,
    security: config.security,
    options: config.options || {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mockConnections.push(newConn);
  return newConn;
}

export async function updateConnection(id: string, config: ConnectionConfig): Promise<Connection> {
  await delay(400);
  const idx = mockConnections.findIndex(c => c.id === id);
  if (idx === -1) throw new Error('Connection not found');
  
  mockConnections[idx] = {
    ...mockConnections[idx],
    name: config.name,
    bootstrapServers: config.bootstrapServers.split(',').map(s => s.trim()),
    auth: config.auth,
    security: config.security,
    options: config.options || {},
    updatedAt: new Date().toISOString(),
  };
  return mockConnections[idx];
}

export async function deleteConnection(id: string): Promise<void> {
  await delay(300);
  mockConnections = mockConnections.filter(c => c.id !== id);
}

// ================= Topic 管理 Mock =================

export async function listTopics(_connectionId: string): Promise<TopicInfo[]> {
  await delay(600);
  return [...mockTopics];
}

export async function getTopicDetail(_connectionId: string, topic: string): Promise<TopicDetail> {
  await delay(400);
  
  const topicInfo = mockTopics.find(t => t.name === topic);
  if (!topicInfo) throw new Error('Topic not found');
  
  const partitions = Array.from({ length: topicInfo.partitionCount }, (_, i) => ({
    partition: i,
    leader: 1,
    replicas: [1],
    isr: [1],
    earliestOffset: 0,
    latestOffset: 10000 + Math.floor(Math.random() * 5000),
    messageCount: 10000 + Math.floor(Math.random() * 5000),
  }));
  
  return {
    name: topic,
    partitions,
    configs: [
      { name: 'retention.ms', value: '604800000', default: false, source: 'DYNAMIC_TOPIC_CONFIG' },
      { name: 'cleanup.policy', value: 'delete', default: true, source: 'DEFAULT_CONFIG' },
      { name: 'segment.bytes', value: '1073741824', default: true, source: 'DEFAULT_CONFIG' },
    ],
  };
}

export async function createTopic(
  _connectionId: string,
  name: string,
  numPartitions: number,
  replicationFactor: number,
  _configs?: Record<string, string>
): Promise<void> {
  await delay(800);
  
  if (mockTopics.some(t => t.name === name)) {
    throw new Error('Topic already exists');
  }
  
  mockTopics.push({
    name,
    partitionCount: numPartitions,
    replicationFactor,
    isInternal: false,
  });
}

export async function deleteTopic(_connectionId: string, topic: string): Promise<void> {
  await delay(500);
  const idx = mockTopics.findIndex(t => t.name === topic);
  if (idx === -1) throw new Error('Topic not found');
  if (mockTopics[idx].isInternal) throw new Error('Cannot delete internal topic');
  mockTopics.splice(idx, 1);
}

// ================= 消息消费 Mock =================

let mockConsumerSession: string | null = null;
let messageInterval: ReturnType<typeof setInterval> | null = null;

export async function startConsuming(
  _connectionId: string,
  topic: string,
  _partition: number | undefined,
  _startOffset: { type: string; timestamp?: number; offset?: number }
): Promise<string> {
  await delay(300);
  mockConsumerSession = `session-${Date.now()}-${topic}`;
  return mockConsumerSession;
}

export async function stopConsuming(_sessionId: string): Promise<void> {
  await delay(200);
  if (messageInterval) {
    clearInterval(messageInterval);
    messageInterval = null;
  }
  mockConsumerSession = null;
}

export async function fetchMessages(
  _connectionId: string,
  topic: string,
  _partition: number,
  _offset: number,
  limit: number
): Promise<{ messages: KafkaMessage[]; total: number }> {
  await delay(500);
  const messages = generateMockMessages(topic, limit);
  return { messages, total: messages.length };
}

// ================= 消息生产 Mock =================

export async function produceMessage(
  _connectionId: string,
  _topic: string,
  _message: ProduceMessage
): Promise<ProduceResult> {
  await delay(200);
  return {
    partition: Math.floor(Math.random() * 3),
    offset: Date.now(),
    timestamp: Date.now(),
  };
}

export async function produceBatch(
  _connectionId: string,
  _topic: string,
  messages: ProduceMessage[],
  _options?: { rateLimit?: number }
): Promise<{ success: number; failed: number; errors: { index: number; error: string }[] }> {
  await delay(messages.length * 50);
  return {
    success: messages.length,
    failed: 0,
    errors: [],
  };
}

// ================= Consumer Group Mock =================

const mockGroups: ConsumerGroupInfo[] = [
  { groupId: 'user-service', state: 'Stable', memberCount: 3, coordinator: 1 },
  { groupId: 'order-service', state: 'Stable', memberCount: 2, coordinator: 1 },
  { groupId: 'analytics-consumer', state: 'Stable', memberCount: 0, coordinator: 1 },
];

export async function listConsumerGroups(_connectionId: string): Promise<ConsumerGroupInfo[]> {
  await delay(400);
  return [...mockGroups];
}

export async function getConsumerLag(_connectionId: string, _groupId: string): Promise<PartitionLag[]> {
  await delay(300);
  
  return [
    { topic: 'user-events', partition: 0, currentOffset: 9500, logEndOffset: 10000, lag: 500 },
    { topic: 'user-events', partition: 1, currentOffset: 9800, logEndOffset: 10000, lag: 200 },
    { topic: 'user-events', partition: 2, currentOffset: 9900, logEndOffset: 10000, lag: 100 },
    { topic: 'order-events', partition: 0, currentOffset: 5000, logEndOffset: 8000, lag: 3000 },
  ];
}

export async function resetConsumerOffset(
  _connectionId: string,
  _groupId: string,
  _topic: string,
  _partition: number | undefined,
  _resetTo: { type: string; timestamp?: number; offset?: number }
): Promise<void> {
  await delay(500);
}

// ================= 事件监听 Mock =================

export function listen(event: string, callback: (payload: unknown) => void): () => void {
  // 模拟实时消息推送
  if (event === 'kafka-message' && !messageInterval) {
    messageInterval = setInterval(() => {
      const mockMsg: KafkaMessage = {
        partition: Math.floor(Math.random() * 3),
        offset: Date.now(),
        timestamp: Date.now(),
        key: `key-${Date.now()}`,
        value: JSON.stringify({
          id: Date.now(),
          message: 'Real-time mock message',
          timestamp: new Date().toISOString(),
        }),
        headers: [['source', 'mock-stream']],
        size: 256,
      };
      callback({ payload: mockMsg });
    }, 2000);
  }
  
  return () => {
    if (messageInterval) {
      clearInterval(messageInterval);
      messageInterval = null;
    }
  };
}
