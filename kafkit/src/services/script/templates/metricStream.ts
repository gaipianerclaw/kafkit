import type { ScriptTemplate } from '../../../types/script';

export const metricStreamTemplate: ScriptTemplate = {
  id: 'metric-stream',
  nameKey: 'producer.script.templates.metricStream.name',
  descriptionKey: 'producer.script.templates.metricStream.desc',
  category: 'system',
  script: `function generate(ctx) {
  // Metric types
  const metricTypes = ['cpu', 'memory', 'disk', 'network', 'load'];
  const metricType = metricTypes[ctx.index % metricTypes.length];
  
  // Server ID
  const serverId = \`server-\${(ctx.index % 5) + 1}\`;
  
  let value, unit, labels;
  
  switch (metricType) {
    case 'cpu':
      value = ctx.randomFloat(5, 95);
      unit = 'percent';
      labels = { core: \`cpu\${ctx.random(0, 7)}\` };
      break;
    case 'memory':
      value = ctx.randomFloat(20, 90);
      unit = 'percent';
      labels = { type: ['used', 'cached', 'free'][ctx.random(0, 2)] };
      break;
    case 'disk':
      value = ctx.randomFloat(30, 85);
      unit = 'percent';
      labels = { mount: ['/data', '/logs', '/tmp'][ctx.random(0, 2)] };
      break;
    case 'network':
      value = ctx.random(1000, 100000);
      unit = 'bytes/sec';
      labels = { interface: 'eth0', direction: ['in', 'out'][ctx.random(0, 1)] };
      break;
    case 'load':
      value = ctx.randomFloat(0.1, 8.0);
      unit = 'load average';
      labels = { interval: '1m' };
      break;
  }
  
  return {
    key: \`\${serverId}.\${metricType}\`,
    value: {
      timestamp: ctx.timestamp(),
      metric: metricType,
      serverId,
      value: typeof value === 'number' ? parseFloat(value.toFixed(2)) : value,
      unit,
      labels,
      tags: {
        env: 'production',
        datacenter: ['us-east', 'us-west', 'eu-central'][ctx.random(0, 2)],
        cluster: 'kafka-cluster-1'
      }
    }
  };
}`,
  defaultKeyStrategy: {
    type: 'roundrobin',
    partitionCount: 3
  }
};
