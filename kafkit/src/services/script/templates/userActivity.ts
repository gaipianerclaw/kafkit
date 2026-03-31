import type { ScriptTemplate } from '../../../types/script';

export const userActivityTemplate: ScriptTemplate = {
  id: 'user-activity',
  name: 'User Activity Events',
  description: 'Track user interactions and page views',
  category: 'social',
  script: `function generate(ctx) {
  // Event types
  const events = ['page_view', 'click', 'scroll', 'search', 'add_to_cart', 'purchase', 'login', 'logout'];
  const event = events[ctx.random(0, events.length - 1)];
  
  // Generate user ID (some returning users, some new)
  const isReturning = ctx.random(1, 10) <= 7; // 70% returning
  const userId = isReturning 
    ? \`user_\${ctx.random(1, 1000)}\`
    : \`user_\${10000 + ctx.index}\`;
  
  // Page paths based on event
  const pages = {
    'page_view': ['/home', '/products', '/about', '/contact', '/cart'],
    'click': ['/products', '/home', '/search'],
    'search': ['/search'],
    'add_to_cart': ['/products'],
    'purchase': ['/checkout'],
    'login': ['/login'],
    'logout': ['/logout']
  };
  
  const possiblePages = pages[event] || ['/'];
  const page = possiblePages[ctx.random(0, possiblePages.length - 1)];
  
  // Device info
  const devices = ['desktop', 'mobile', 'tablet'];
  const device = devices[ctx.random(0, devices.length - 1)];
  
  return {
    key: userId,
    value: {
      event,
      timestamp: ctx.now(),
      userId,
      sessionId: ctx.hash(userId + ctx.timestamp().toString(), 'md5'),
      properties: {
        page,
        device,
        browser: ['Chrome', 'Safari', 'Firefox', 'Edge'][ctx.random(0, 3)],
        referrer: ['google.com', 'direct', 'facebook.com', ''][ctx.random(0, 3)],
        duration: ctx.random(1, 300) // seconds on page
      },
      geo: {
        country: ['US', 'UK', 'CA', 'DE', 'FR', 'JP'][ctx.random(0, 5)],
        city: ctx.faker.lorem(1)
      }
    }
  };
}`,
  defaultKeyStrategy: {
    type: 'hash'
  }
};
