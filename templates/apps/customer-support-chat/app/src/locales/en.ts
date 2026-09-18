/**
 * English translations for customer-support-chat — page-level keys.
 *
 * The `en/` directory ships ui / privacy / terms locale modules consumed
 * by the auth UI, footer, and legal pages. This file aggregates the
 * page-specific keys (Landing, Inbox, Conversation Detail, Contacts,
 * Reports, Automations, Settings, Notifications, Pricing) that templates
 * use directly via `t('namespace.key', …)` calls.
 *
 * `defaultValue:` fallbacks live alongside each `t()` call in pages, so
 * this file can be safely overridden per-deployment without breaking the
 * UI. Translators editing this file replace the right-hand strings only.
 */

export default {
  app: {
    name: 'Liaison',
    tagline: 'Conversational support workspace',
  },
  common: {
    loading: 'Loading…',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    search: 'Search',
    submit: 'Submit',
  },
  landing: {
    nav: {
      product: 'Product',
      solutions: 'Solutions',
      pricing: 'Pricing',
      signIn: 'Sign in',
      startTrial: 'Start free trial',
    },
    hero: {
      badge: 'Conversational support workspace',
      title: 'Every message matters.',
      subtitle:
        'The empathetic support workspace built for modern teams. Connect with your customers like humans, not tickets.',
      cta: 'Start free trial',
      secondary: 'Book a demo',
    },
    footer: {
      privacy: 'Privacy',
      terms: 'Terms',
      copyright: '© {{year}} {{appName}}. All rights reserved.',
    },
  },
  login: {
    heading: 'Welcome back',
    noAccount: 'New to {{appName}}?',
    signUpLink: 'Start a free trial',
    emailLabel: 'Email address',
    passwordLabel: 'Password',
    forgotLink: 'Forgot password?',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    submit: 'Sign in',
    submitting: 'Signing in…',
    failed: 'Login failed. Please try again.',
  },
  signup: {
    heading: 'Create your {{appName}} account',
    haveAccount: 'Already have an account?',
    signInLink: 'Sign in',
    firstNameLabel: 'First name',
    lastNameLabel: 'Last name',
    emailLabel: 'Work email',
    passwordLabel: 'Password',
    confirmLabel: 'Confirm password',
    submit: 'Create account',
    submitting: 'Creating account…',
    passwordMismatch: 'Passwords do not match.',
    failed: 'Account creation failed.',
  },
  forgotPassword: {
    heading: 'Reset your password',
    backToSignIn: 'Back to Sign in',
    emailLabel: 'Email',
    submit: 'Send reset link',
    submitting: 'Submitting…',
    success: 'If an account exists for that email, a reset link is on the way.',
  },
  resetPassword: {
    heading: 'Set a new password',
    backToSignIn: 'Back to Sign in',
    passwordLabel: 'New password',
    confirmLabel: 'Confirm password',
    submit: 'Reset password',
    submitting: 'Updating…',
    passwordMismatch: 'Passwords do not match.',
    failed: 'Could not reset password.',
  },
  inbox: {
    heading: 'Inbox',
    empty: 'No conversations yet — your team is all caught up.',
    searchPlaceholder: 'Search conversations',
    filter: {
      open: 'Open',
      pending: 'Pending',
      closed: 'Closed',
    },
  },
  conversationDetail: {
    listTitle: 'Inbox',
    resolveAction: 'Mark resolved',
    send: 'Send',
    tab: {
      reply: 'Reply',
      note: 'Internal note',
      canned: 'Canned response',
    },
  },
  contacts: {
    eyebrow: 'Customer directory',
    heading: 'Contacts',
    subheading:
      'Showing {{count}} customers across all channels. Click any row to open the profile.',
    col: {
      customer: 'Customer',
      plan: 'Plan',
      csat: 'CSAT',
      conversations: 'Conversations',
      lastSeen: 'Last seen',
    },
  },
  reports: {
    eyebrow: 'Last 30 days',
    heading: 'Reports',
    subheading: 'Team performance, CSAT and conversation volume — refreshed every 5 minutes.',
    live: 'Live',
    volumeChartTitle: 'Daily conversation volume',
    teamTitle: 'Team performance',
    teamHint: 'Sorted by resolved conversations',
    kpi: {
      volume: 'Conversations',
      volumeTrend: '+8% vs last 30d',
      firstReply: 'First response',
      firstReplyTrend: '−18s',
      csat: 'CSAT',
      csatTrend: '+0.2 vs prev. month',
      bot: 'Auto-resolved',
      botTrend: '+6 pts',
    },
    team: {
      col: {
        agent: 'Agent',
        resolved: 'Resolved',
        csat: 'CSAT',
        response: 'Avg. first reply',
        status: 'Status',
      },
    },
  },
  automations: {
    heading: 'Automations',
    subheading:
      'Bots, canned responses and routing rules that run automatically when conversations come in.',
  },
  settings: {
    heading: 'Settings',
    eyebrow: 'Workspace',
    account: {
      title: 'Account',
      workspaceName: 'Workspace name',
      subdomain: 'Subdomain',
      timezone: 'Timezone',
      businessHours: 'Business hours',
    },
    widget: {
      title: 'Widget appearance',
      greeting: 'Greeting',
      brandColor: 'Brand color (hex)',
      position: 'Position',
      previewTitle: 'Liaison',
      previewSend: 'Send',
    },
    integrations: {
      title: 'Integrations',
      manage: 'Manage',
      connect: 'Connect',
    },
  },
  notifications: {
    eyebrow: 'Activity feed',
    heading: 'Notifications',
    unread: 'New',
  },
  pricing: {
    heading: 'Choose your {{appName}} plan',
    limits: {
      agents: '{{count}} agents',
      cannedResponses: '{{count}} canned-responses',
      conversations: '{{count}} conversations',
      messages: '{{count}} messages',
      advancedFeatures: 'Advanced features',
      canExport: 'Data export',
      yes: '✓',
      no: '—',
    },
  },
  privacy: {
    title: 'Privacy',
    intro: 'This is the Privacy page. Replace this placeholder with real content.',
  },
  terms: {
    title: 'Terms',
    intro: 'This is the Terms page. Replace this placeholder with real content.',
  },
  notFound: {
    title: 'Page not found',
    description: 'The page you are looking for does not exist.',
    home: 'Return home',
  },
} as const
