/**
 * App-level translation namespace for `contract-management`.
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
    notFound: 'Not found',
  },
  landing: {
    title: 'Vellum',
    subtitle: 'Manage every contract from draft to renewal — without the chaos.',
    getStarted: 'Get started',
    seePricing: 'See pricing',
  },
  pricing: {
    title: 'Pricing',
    subtitle: 'Pick the tier that fits your contract volume.',
    chooseHeading: 'Choose your {{appName}} plan',
    contracts: '{{count}} contracts',
    signatures: '{{count}} signatures',
    templates: '{{count}} templates',
    advancedFeatures: 'Advanced features',
    dataExport: 'Data export',
    enabled: 'Yes',
    disabled: 'No',
    unlimited: 'Unlimited',
  },
  contract: {
    notFound: 'Contract not found',
    list: 'Contracts',
    create: 'New contract',
    title: 'Title',
    counterparty: 'Counterparty',
    status: 'Status',
    expiresAt: 'Expires',
    amount: 'Value',
    draft: 'Draft',
    pending: 'Pending',
    active: 'Active',
    expiring: 'Expiring',
    expired: 'Expired',
    terminated: 'Terminated',
    sendForSignature: 'Send for signature',
    addSigner: 'Add signer',
    renew: 'Renew',
    audit: 'Audit log',
  },
  template: {
    notFound: 'Template not found',
    list: 'Templates',
    name: 'Name',
    type: 'Type',
    version: 'Version',
    useTemplate: 'Use template',
    save: 'Save template',
  },
  counterparty: {
    notFound: 'Counterparty not found',
    list: 'Counterparties',
    create: 'New counterparty',
    organization: 'Organization',
    contactName: 'Contact name',
    email: 'Email',
    phone: 'Phone',
    type: 'Type',
    notes: 'Notes',
  },
  signature: {
    notFound: 'Signature not found',
    pending: 'Pending',
    viewed: 'Viewed',
    signed: 'Signed',
    declined: 'Declined',
    requestedAt: 'Requested',
    signedAt: 'Signed',
    addSignerRequired: 'Signer name and email are required',
  },
  notification: {
    notFound: 'Notification not found',
    title: 'Notifications',
    empty: 'No notifications yet.',
    markAllRead: 'Mark all as read',
  },
  reports: {
    title: 'Reports',
    portfolioValue: 'Portfolio value',
    activeCount: 'Active',
    pendingCount: 'Pending',
    expiringCount: 'Expiring 30d',
    throughput: 'Volume by month',
  },
  settings: {
    title: 'Settings',
    profileTab: 'Profile',
    teamTab: 'Team',
    integrationsTab: 'Integrations',
    billingTab: 'Billing',
  },
  validation: {
    required: 'This field is required.',
    invalidEmail: 'Enter a valid email address.',
  },
} as const
