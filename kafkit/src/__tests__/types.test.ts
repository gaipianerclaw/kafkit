import { describe, it, expect } from 'vitest';
import type { 
  ConnectionConfig, 
  AuthConfig, 
  KafkaMessage, 
  TopicInfo,
  ConsumerGroupInfo 
} from '../types';

describe('Type Definitions', () => {
  describe('AuthConfig', () => {
    it('should handle none auth type', () => {
      const auth: AuthConfig = { type: 'none' };
      expect(auth.type).toBe('none');
    });

    it('should handle SASL/PLAIN auth', () => {
      const auth: AuthConfig = { 
        type: 'saslPlain', 
        username: 'admin', 
        password: 'secret' 
      };
      expect(auth.type).toBe('saslPlain');
      expect('username' in auth).toBe(true);
    });

    it('should handle SASL/SCRAM auth', () => {
      const auth: AuthConfig = { 
        type: 'saslScram', 
        mechanism: 'SCRAM-SHA-256',
        username: 'admin', 
        password: 'secret' 
      };
      expect(auth.type).toBe('saslScram');
      expect(auth.mechanism).toBe('SCRAM-SHA-256');
    });
  });

  describe('KafkaMessage', () => {
    it('should create a valid message', () => {
      const msg: KafkaMessage = {
        partition: 0,
        offset: 100,
        timestamp: Date.now(),
        key: 'test-key',
        value: '{"message": "hello"}',
        headers: [['header1', 'value1']],
        size: 1024
      };
      
      expect(msg.partition).toBe(0);
      expect(msg.offset).toBe(100);
      expect(msg.headers.length).toBe(1);
    });
  });

  describe('TopicInfo', () => {
    it('should create valid topic info', () => {
      const topic: TopicInfo = {
        name: 'test-topic',
        partitionCount: 3,
        replicationFactor: 1,
        isInternal: false
      };
      
      expect(topic.name).toBe('test-topic');
      expect(topic.partitionCount).toBeGreaterThan(0);
    });
  });

  describe('ConsumerGroupInfo', () => {
    it('should create valid group info', () => {
      const group: ConsumerGroupInfo = {
        groupId: 'test-group',
        state: 'Stable',
        memberCount: 2,
        coordinator: 1
      };
      
      expect(group.groupId).toBe('test-group');
      expect(['Unknown', 'PreparingRebalance', 'CompletingRebalance', 'Stable', 'Dead'])
        .toContain(group.state);
    });
  });
});
