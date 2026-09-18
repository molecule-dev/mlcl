/**
 * App-specific English reference strings for okr-goal-tracking.
 *
 * NOTE: this file is a REFERENCE catalog, not wired at runtime — the i18n
 * bond (`bonds/i18n-default.ts`) registers `locales/en/ui.ts` (empty; English
 * comes from each `t()` call's inline `defaultValue`) plus the per-language
 * `locales/<code>/ui.ts` files. Keep namespaces scoped to product features so
 * handlers / pages can use stable `t('ns.key')` lookups across languages.
 */

export default {
  app: {
    title: 'OKRs',
  },

  auth: {
    unauthorized: 'You must be signed in to do that',
    invalid: 'Invalid email or password',
  },

  authShell: {
    eyebrow: 'OKRs that move teams',
    brandTitle: 'Set the summit. Score the climb. Coach the team.',
    brandBody:
      '{{appName}} threads objectives through key results and weekly check-ins so progress is always visible — and always honest.',
    samplePeriod: 'Q2 2026 · sample objective',
    sampleStatus: 'On track',
    sampleTitle: 'Cut customer onboarding time in half',
    brandFooter: '— {{tagline}}',
  },

  dashboard: {
    title: 'OKRs',
    heading: 'Your dashboard',
  },

  pricing: {
    heading: 'Choose your {{app}} plan',
    // Keys match the flat `pricing.limit.*` ids used by pages/Pricing.tsx.
    limit: {
      checkIns: '{{count}} check-ins',
      keyResults: '{{count}} key-results',
      objectives: '{{count}} objectives',
      advanced: 'Advanced features: {{value}}',
      export: 'Data export: {{value}}',
    },
  },

  objective: {
    notFound: 'Objective not found',
    title: 'Title',
    description: 'Description',
    scope: 'Scope',
    scopes: {
      individual: 'Individual',
      team: 'Team',
      company: 'Company',
    },
    statuses: {
      onTrack: 'On track',
      atRisk: 'At risk',
      offTrack: 'Off track',
      completed: 'Completed',
      archived: 'Archived',
    },
    archive: 'Archive objective',
    keyResults: 'Key results',
    create: 'Create objective',
    edit: 'Edit objective',
    save: 'Save changes',
  },

  keyResult: {
    notFound: 'Key result not found',
    title: 'Key result',
    metrics: {
      number: 'Number',
      percent: 'Percent',
      boolean: 'Done / not done',
      milestone: 'Milestone',
    },
    target: 'Target',
    start: 'Start',
    current: 'Current',
  },

  checkIn: {
    title: 'Weekly check-in',
    value: 'New value',
    confidence: 'Confidence',
    note: 'Notes',
    save: 'Save check-in',
  },

  team: {
    notFound: 'Team not found',
    title: 'Teams',
    create: 'Create team',
  },

  period: {
    notFound: 'Period not found',
    title: 'Period',
    create: 'Create period',
    rollover: 'Roll over period',
  },

  review: {
    notFound: 'Review not found',
    forbidden: 'You cannot read this review',
    title: 'Review',
    summary: 'Summary',
    rating: 'Rating',
    submit: 'Submit review',
  },

  notification: {
    notFound: 'Notification not found',
    markRead: 'Mark as read',
    empty: 'You’re all caught up',
  },

  nav: {
    dashboard: 'Dashboard',
    objectives: 'Objectives',
    checkIns: 'Check-ins',
    team: 'Team',
    reviews: 'Reviews',
    notifications: 'Notifications',
    settings: 'Settings',
    profile: 'Profile',
    billing: 'Billing',
  },

  errors: {
    internalServer: 'Internal server error',
  },

  validation: {
    failed: 'Validation failed',
  },
} as const
