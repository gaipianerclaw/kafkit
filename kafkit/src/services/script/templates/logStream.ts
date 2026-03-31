import type { ScriptTemplate } from '../../../types/script';

export const logStreamTemplate: ScriptTemplate = {
  id: 'log-stream',
  name: 'Application Logs',
  description: 'Generate structured application log entries',
  category: 'log',
  script: `function generate(ctx) {
  // Log levels with weighted distribution
  const levels = ['DEBUG', 'DEBUG', 'INFO', 'INFO', 'INFO', 'WARN', 'ERROR'];
  const level = levels[ctx.random(0, levels.length - 1)];
  
  // Service names
  const services = ['api-gateway', 'user-service', 'order-service', 'payment-service', 'notification-service'];
  const service = services[ctx.random(0, services.length - 1)];
  
  // Generate log message based on level
  let message;
  switch (level) {
    case 'DEBUG':
      message = \`Processing request #\${ctx.index} for user \${ctx.random(1, 1000)}\`;
      break;
    case 'INFO':
      message = \`Successfully completed operation in \${ctx.random(10, 500)}ms\`;
      break;
    case 'WARN':
      message = \`Slow query detected: took \${ctx.random(1000, 5000)}ms\`;
      break;
    case 'ERROR':
      message = \`Failed to connect to database: timeout after 30s\`;
      break;
    default:
      message = 'Unknown event';
  }
  
  return {
    key: null, // Use round-robin for logs
    value: {
      timestamp: ctx.now(),
      level,
      service,
      message,
      traceId: ctx.uuid(),
      metadata: {
        host: \`server-\${ctx.random(1, 10)}\`,
        version: '2.1.0',
        environment: 'production'
      }
    }
  };
}`,
  defaultKeyStrategy: {
    type: 'roundrobin',
    partitionCount: 6
  }
};
