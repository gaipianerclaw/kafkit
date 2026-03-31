import type { ScriptTemplate } from '../../../types/script';

export const transactionTemplate: ScriptTemplate = {
  id: 'transaction',
  name: 'Financial Transactions',
  description: 'Payment and transfer transactions',
  category: 'finance',
  script: `function generate(ctx) {
  // Transaction types
  const types = ['payment', 'transfer', 'withdrawal', 'deposit', 'refund'];
  const type = types[ctx.index % types.length];
  
  // Status
  const statuses = ['pending', 'completed', 'failed'];
  const statusWeights = [0.1, 0.85, 0.05]; // 10% pending, 85% completed, 5% failed
  const random = Math.random();
  let status;
  if (random < statusWeights[0]) status = statuses[0];
  else if (random < statusWeights[0] + statusWeights[1]) status = statuses[1];
  else status = statuses[2];
  
  // Amount based on transaction type
  let amount;
  switch (type) {
    case 'payment':
      amount = ctx.randomFloat(10, 500);
      break;
    case 'transfer':
      amount = ctx.randomFloat(100, 10000);
      break;
    case 'withdrawal':
      amount = ctx.randomFloat(50, 1000);
      break;
    case 'deposit':
      amount = ctx.randomFloat(100, 5000);
      break;
    case 'refund':
      amount = ctx.randomFloat(10, 200);
      break;
  }
  
  // Currency
  const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CNY'];
  const currency = currencies[ctx.random(0, currencies.length - 1)];
  
  // Accounts
  const fromAccount = \`ACC-\${ctx.random(100000, 999999)}\`;
  const toAccount = type === 'transfer' 
    ? \`ACC-\${ctx.random(100000, 999999)}\`
    : 'MERCHANT-' + ctx.random(1, 1000);
  
  const txId = ctx.uuid();
  
  return {
    key: txId,
    value: {
      transactionId: txId,
      timestamp: ctx.now(),
      type,
      status,
      amount: parseFloat(amount.toFixed(2)),
      currency,
      fromAccount,
      toAccount,
      description: \`\${type} of \${amount.toFixed(2)} \${currency}\`,
      metadata: {
        ipAddress: \`192.168.\${ctx.random(1, 255)}.\${ctx.random(1, 255)}\`,
        deviceId: ctx.hash(txId, 'md5').substring(0, 16),
        riskScore: ctx.random(1, 100),
        merchantCategory: ['retail', 'food', 'travel', 'technology'][ctx.random(0, 3)]
      }
    },
    headers: {
      'tx-priority': status === 'failed' ? 'high' : 'normal',
      'settlement-batch': ctx.hash(ctx.now().toString(), 'md5').substring(0, 8)
    }
  };
}`,
  defaultKeyStrategy: {
    type: 'fixed'
  }
};
