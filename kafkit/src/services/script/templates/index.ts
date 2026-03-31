import type { ScriptTemplate } from '../../../types/script';
import { iotSensorTemplate } from './iotSensor';
import { ecommerceOrderTemplate } from './ecommerceOrder';
import { logStreamTemplate } from './logStream';
import { stockTickerTemplate } from './stockTicker';
import { userActivityTemplate } from './userActivity';
import { metricStreamTemplate } from './metricStream';
import { socialFeedTemplate } from './socialFeed';
import { transactionTemplate } from './transaction';

export const templates: ScriptTemplate[] = [
  iotSensorTemplate,
  ecommerceOrderTemplate,
  logStreamTemplate,
  stockTickerTemplate,
  userActivityTemplate,
  metricStreamTemplate,
  socialFeedTemplate,
  transactionTemplate
];

// Export individual templates for direct import
export {
  iotSensorTemplate,
  ecommerceOrderTemplate,
  logStreamTemplate,
  stockTickerTemplate,
  userActivityTemplate,
  metricStreamTemplate,
  socialFeedTemplate,
  transactionTemplate
};
