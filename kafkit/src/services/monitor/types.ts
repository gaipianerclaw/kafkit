/**
 * 告警系统类型定义
 */

/**
 * 告警级别
 */
export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * 告警类型
 */
export type AlertType = 
  | 'consumer_lag'      // 消费延迟
  | 'connection_lost'   // 连接断开
  | 'produce_error'     // 生产错误
  | 'consume_error';    // 消费错误

/**
 * 告警规则
 */
export interface AlertRule {
  id: string;
  name: string;
  enabled: boolean;
  type: AlertType;
  
  // 触发条件
  condition: {
    metric: string;
    operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq';
    threshold: number;
    duration: number;        // 持续多少秒触发（防抖）
    cooldown: number;        // 冷却时间（秒）
  };
  
  // 通知配置
  notification: {
    desktop: boolean;
    sound: boolean;
    badge: boolean;
    autoDismiss: number;     // 自动消失时间（秒），0表示不自动消失
  };
}

/**
 * 告警实例
 */
export interface Alert {
  id: string;
  ruleId: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  metadata: AlertMetadata;
  
  // 状态
  status: 'active' | 'acknowledged' | 'resolved';
  createdAt: number;
  acknowledgedAt?: number;
  resolvedAt?: number;
  
  // 通知状态
  notified: {
    desktop: boolean;
    sound: boolean;
  };
}

/**
 * 告警元数据 - 根据类型不同而变化
 */
export type AlertMetadata = 
  | ConsumerLagMetadata
  | ConnectionLostMetadata
  | ErrorMetadata;

export interface ConsumerLagMetadata {
  connectionId: string;
  consumerGroup: string;
  topic: string;
  partition: number;
  currentLag: number;
  threshold: number;
}

export interface ConnectionLostMetadata {
  connectionId: string;
  connectionName: string;
  error?: string;
  retryCount: number;
  maxRetries: number;
}

export interface ErrorMetadata {
  connectionId: string;
  operation: string;
  errorCode: string;
  errorMessage: string;
  retryable: boolean;
}

/**
 * 告警统计
 */
export interface AlertStats {
  total: number;
  active: number;
  warning: number;
  error: number;
  critical: number;
  resolved: number;
}

/**
 * 监控配置
 */
export interface MonitorConfig {
  enabled: boolean;
  checkInterval: number;     // 检查间隔（毫秒）
  maxAlerts: number;         // 最大保留告警数
  retentionDays: number;     // 告警保留天数
}

// 默认配置
export const DEFAULT_MONITOR_CONFIG: MonitorConfig = {
  enabled: true,
  checkInterval: 10000,      // 10秒
  maxAlerts: 100,
  retentionDays: 7
};

// 默认告警规则
export const DEFAULT_ALERT_RULES: Omit<AlertRule, 'id'>[] = [
  {
    name: '消费延迟警告',
    enabled: true,
    type: 'consumer_lag',
    condition: {
      metric: 'lag',
      operator: 'gt',
      threshold: 10000,
      duration: 60,
      cooldown: 300
    },
    notification: {
      desktop: true,
      sound: true,
      badge: true,
      autoDismiss: 0
    }
  },
  {
    name: '连接断开告警',
    enabled: true,
    type: 'connection_lost',
    condition: {
      metric: 'connection_status',
      operator: 'eq',
      threshold: 0,
      duration: 0,
      cooldown: 60
    },
    notification: {
      desktop: true,
      sound: true,
      badge: true,
      autoDismiss: 0
    }
  }
];
