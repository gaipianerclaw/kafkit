// Kafka 错误码处理工具

// Kafka 错误码映射
export interface ErrorInfo {
  code: string;
  message: string;
  solution: string;
  retryable: boolean;
}

// Kafka 错误码到翻译键的映射
const KAFKA_ERROR_MAP: Record<string, string> = {
  'NetworkException': 'errors.kafka.NetworkException',
  'UnknownTopicOrPartition': 'errors.kafka.UnknownTopicOrPartition',
  'NotLeaderForPartition': 'errors.kafka.NotLeaderForPartition',
  'AuthorizationFailed': 'errors.kafka.AuthorizationFailed',
  'AuthenticationFailed': 'errors.kafka.AuthenticationFailed',
  'SSLHandshakeFailed': 'errors.kafka.SSLHandshakeFailed',
  'ConnectionRefused': 'errors.kafka.ConnectionRefused',
  'TimeoutException': 'errors.kafka.TimeoutException',
  'UnknownMemberId': 'errors.kafka.UnknownMemberId',
  'RebalanceInProgress': 'errors.kafka.RebalanceInProgress',
  'InvalidOffset': 'errors.kafka.InvalidOffset',
  'OffsetOutOfRange': 'errors.kafka.OffsetOutOfRange',
};

// 判断错误是否可重试
const RETRYABLE_ERRORS = [
  'NetworkException',
  'NotLeaderForPartition',
  'TimeoutException',
  'RebalanceInProgress',
  'ConnectionRefused',
];

/**
 * 解析 Kafka 错误信息
 */
export function parseKafkaError(error: unknown): ErrorInfo {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // 尝试匹配 Kafka 错误码
  for (const [code, i18nKey] of Object.entries(KAFKA_ERROR_MAP)) {
    if (errorMessage.includes(code) || errorMessage.toLowerCase().includes(code.toLowerCase())) {
      return {
        code,
        message: i18nKey,
        solution: i18nKey,
        retryable: RETRYABLE_ERRORS.includes(code),
      };
    }
  }
  
  // 常见错误模式匹配
  if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('Connection refused')) {
    return {
      code: 'ConnectionRefused',
      message: 'errors.kafka.ConnectionRefused',
      solution: 'errors.kafka.ConnectionRefused',
      retryable: true,
    };
  }
  
  if (errorMessage.includes('ETIMEDOUT') || errorMessage.includes('timeout')) {
    return {
      code: 'TimeoutException',
      message: 'errors.kafka.TimeoutException',
      solution: 'errors.kafka.TimeoutException',
      retryable: true,
    };
  }
  
  if (errorMessage.includes('SSL') || errorMessage.includes('tls') || errorMessage.includes('certificate')) {
    return {
      code: 'SSLHandshakeFailed',
      message: 'errors.kafka.SSLHandshakeFailed',
      solution: 'errors.kafka.SSLHandshakeFailed',
      retryable: false,
    };
  }
  
  // 未知错误
  return {
    code: 'Unknown',
    message: errorMessage,
    solution: 'errors.generic',
    retryable: false,
  };
}

/**
 * 获取错误严重性级别
 */
export function getErrorSeverity(code: string): 'error' | 'warning' | 'info' {
  const warningCodes = ['NotLeaderForPartition', 'RebalanceInProgress', 'TimeoutException'];
  const infoCodes = ['UnknownTopicOrPartition'];
  
  if (infoCodes.includes(code)) return 'info';
  if (warningCodes.includes(code)) return 'warning';
  return 'error';
}

/**
 * 格式化错误信息用于显示
 */
export function formatErrorForDisplay(error: unknown, t: (key: string) => string): {
  title: string;
  message: string;
  solution: string;
  retryable: boolean;
} {
  const errorInfo = parseKafkaError(error);
  
  return {
    title: t('common.error'),
    message: errorInfo.code !== 'Unknown' ? t(errorInfo.message) : errorInfo.message,
    solution: errorInfo.code !== 'Unknown' ? t(errorInfo.solution) : t('errors.generic'),
    retryable: errorInfo.retryable,
  };
}

// 内存警告阈值
export const MEMORY_WARNING_THRESHOLD = 5000; // 5000条消息时警告
export const MEMORY_LIMIT_THRESHOLD = 10000; // 10000条消息时强制清理

/**
 * 检查是否需要显示内存警告
 */
export function shouldShowMemoryWarning(messageCount: number): boolean {
  return messageCount >= MEMORY_WARNING_THRESHOLD;
}

/**
 * 检查是否需要强制清理内存
 */
export function shouldForceMemoryCleanup(messageCount: number): boolean {
  return messageCount >= MEMORY_LIMIT_THRESHOLD;
}
