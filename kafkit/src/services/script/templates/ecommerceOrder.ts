import type { ScriptTemplate } from '../../../types/script';

export const ecommerceOrderTemplate: ScriptTemplate = {
  id: 'ecommerce-order',
  name: 'E-commerce Orders',
  description: 'Simulate order lifecycle events (created, paid, shipped)',
  category: 'ecommerce',
  script: `function generate(ctx) {
  // Order status progression
  const statuses = ['created', 'paid', 'processing', 'shipped', 'delivered'];
  const status = statuses[ctx.index % statuses.length];
  
  // Generate order ID
  const orderId = \`ORD-\${100000 + ctx.index}\`;
  
  // Random order amount between $10 and $500
  const amount = ctx.randomFloat(10, 500).toFixed(2);
  
  // Generate items
  const itemCount = ctx.random(1, 5);
  const items = [];
  for (let i = 0; i < itemCount; i++) {
    items.push({
      sku: \`SKU-\${ctx.random(1000, 9999)}\`,
      name: ctx.faker.lorem(2),
      qty: ctx.random(1, 3),
      price: ctx.randomFloat(5, 100).toFixed(2)
    });
  }
  
  return {
    key: orderId,
    value: {
      orderId,
      timestamp: ctx.now(),
      customer: {
        id: \`CUST-\${ctx.random(1, 10000)}\`,
        email: ctx.faker.email(),
        name: ctx.faker.name()
      },
      status,
      amount: parseFloat(amount),
      currency: 'USD',
      items,
      shipping: {
        address: ctx.faker.address(),
        method: ['standard', 'express', 'overnight'][ctx.random(0, 2)]
      }
    }
  };
}`,
  defaultKeyStrategy: {
    type: 'hash'
  }
};
