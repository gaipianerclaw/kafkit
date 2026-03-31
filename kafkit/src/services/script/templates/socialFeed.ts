import type { ScriptTemplate } from '../../../types/script';

export const socialFeedTemplate: ScriptTemplate = {
  id: 'social-feed',
  name: 'Social Media Posts',
  description: 'User posts, likes, and comments',
  category: 'social',
  script: `function generate(ctx) {
  // Content types
  const contentTypes = ['text', 'image', 'video', 'link', 'poll'];
  const contentType = contentTypes[ctx.random(0, contentTypes.length - 1)];
  
  // Action types
  const actions = ['post', 'like', 'comment', 'share', 'follow'];
  const action = actions[ctx.random(0, actions.length - 1)];
  
  // User info
  const userId = \`user_\${ctx.random(1, 5000)}\`;
  const username = ctx.faker.name().toLowerCase().replace(/\\s+/g, '_');
  
  let content, metadata;
  
  switch (action) {
    case 'post':
      content = contentType === 'text' 
        ? ctx.faker.lorem(ctx.random(5, 30))
        : \`Check out this \${contentType}!\`;
      metadata = {
        mediaUrls: contentType !== 'text' ? [\`https://cdn.example.com/\${ctx.uuid()}.jpg\`] : [],
        mentions: ctx.random(0, 3),
        hashtags: ctx.random(0, 5)
      };
      break;
    case 'like':
      content = 'Liked a post';
      metadata = { targetPostId: ctx.uuid() };
      break;
    case 'comment':
      content = ctx.faker.lorem(ctx.random(3, 15));
      metadata = { targetPostId: ctx.uuid(), parentCommentId: null };
      break;
    case 'share':
      content = 'Shared a post';
      metadata = { targetPostId: ctx.uuid(), shareType: ['repost', 'quote'][ctx.random(0, 1)] };
      break;
    case 'follow':
      content = 'Started following';
      metadata = { targetUserId: \`user_\${ctx.random(1, 5000)}\` };
      break;
  }
  
  return {
    key: userId,
    value: {
      action,
      timestamp: ctx.now(),
      user: {
        id: userId,
        username,
        displayName: ctx.faker.name()
      },
      content,
      contentType: action === 'post' ? contentType : null,
      metadata,
      engagement: action === 'post' ? {
        likes: ctx.random(0, 100),
        comments: ctx.random(0, 20),
        shares: ctx.random(0, 10),
        views: ctx.random(100, 10000)
      } : null,
      visibility: ['public', 'followers', 'private'][ctx.random(0, 2)]
    }
  };
}`,
  defaultKeyStrategy: {
    type: 'hash'
  }
};
