/**
 * App-level translation namespace for `ai-customer-service-bot`.
 *
 * Synthase / Phase 2 verify gate G17 enforces this file's existence and
 * non-emptiness — every user-visible string in `app/src/pages/*.tsx`
 * resolves a key here via `t('key', values, { defaultValue: '...' })`.
 *
 * Companion `locales/en/{ui,privacyPolicy,termsOfService}.ts` cover the
 * shared molecule UI surface; this file is reserved for app-scoped keys.
 */

export default {
  common: {
    actions: 'Actions',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    loading: 'Loading...',
    serverError: 'Internal server error',
  },
  landing: {
    title: 'AI Customer Service',
    subtitle: 'Resolve more tickets, faster — with a bot grounded in your knowledge base.',
    getStarted: 'Get started',
    seePricing: 'See pricing',
  },
  pricing: {
    title: 'Pricing',
    subtitle: 'Pick the tier that fits your support volume.',
    free: 'Free',
    pro: 'Pro',
    team: 'Team',
    perMonth: '/mo',
    perYear: '/yr',
    selectPlan: 'Select plan',
    currentPlan: 'Current plan',
  },
  dashboard: {
    title: 'Dashboard',
    activeConversations: 'Active conversations',
    resolutionRate: 'Resolution rate',
    csat: 'CSAT',
    avgResponse: 'Avg response',
    escalations: 'Escalations',
    recent: 'Recent escalations',
    noEscalations: 'No escalations yet.',
  },
  conversations: {
    title: 'Conversations',
    notFound: 'Conversation not found',
    anonymous: 'Anonymous',
    botNotDeployed: 'Bot is not available',
    contentRequired: 'Message content is required',
    statusFilter: 'Status',
    open: 'Open',
    escalated: 'Escalated',
    resolved: 'Resolved',
    takeOver: 'Take over',
    close: 'Close conversation',
  },
  conversationDetail: {
    title: 'Conversation',
    transcript: 'Transcript',
    sentiment: 'Sentiment',
    resolved: 'Resolved',
    escalate: 'Escalate to human',
    customer: 'Customer',
    bot: 'Bot',
    agent: 'Agent',
  },
  knowledge: {
    title: 'Knowledge base',
    newArticle: 'New article',
    titleContentRequired: 'Title and content are required',
    notFound: 'Article not found',
    drafts: 'Drafts',
    published: 'Published',
    archived: 'Archived',
    searchPlaceholder: 'Search articles…',
    empty: 'No articles yet.',
  },
  knowledgeArticle: {
    title: 'Article',
    titleLabel: 'Title',
    bodyLabel: 'Body (Markdown)',
    categoryLabel: 'Category',
    publish: 'Publish',
    saveDraft: 'Save draft',
    archive: 'Archive',
    embeddingStatus: 'Indexing status',
  },
  analytics: {
    title: 'Analytics',
    containmentRate: 'Containment rate',
    csatTrend: 'CSAT trend',
    topUnanswered: 'Top unanswered questions',
    suggestArticle: 'Suggest article',
  },
  notifications: {
    title: 'Notifications',
    empty: 'No notifications yet.',
    markAllRead: 'Mark all as read',
  },
  settings: {
    title: 'Settings',
    profileTab: 'Profile',
    securityTab: 'Security',
    billingTab: 'Billing',
    channelTab: 'Channels',
    apiTab: 'API tokens',
  },
  profile: {
    title: 'Profile',
    name: 'Name',
    email: 'Email',
    save: 'Save profile',
  },
  chat: {
    welcome: 'Hi! How can I help you today?',
    placeholder: 'Type your question...',
    thinking: 'Thinking...',
    send: 'Send',
    escalate: 'Talk to a human',
  },
  escalations: {
    notFound: 'Escalation not found',
    requestFailed: 'Could not escalate the conversation',
    summaryRequired: 'Summary is required',
  },
  feedback: {
    invalidRating: 'Rating must be 1 (down) or 5 (up)',
    saved: 'Thanks for your feedback!',
  },
  apiTokens: {
    title: 'API tokens',
    createNew: 'New token',
    label: 'Label',
    scopes: 'Scopes',
    revoke: 'Revoke',
    copyOnce: 'Copy this token now — it will not be shown again.',
    notFound: 'Token not found',
    labelRequired: 'Label is required',
  },
  bots: {
    notFound: 'Bot not found',
    searchRequired: 'Search query is required',
  },
} as const
