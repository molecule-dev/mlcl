/**
 * App-level English translation catalog.
 *
 * The active i18n provider (see `bonds/i18n-default.ts`) loads the actual
 * translations from `locales/en/ui.ts`. This file mirrors the structural
 * shape used by the verify gate (`G17` checks for at least one key) and
 * gives a single nested catalog for app-level strings emitted by pages
 * that haven't been migrated to the per-locale `ui.ts` yet.
 */

export default {
  app: {
    name: 'Arcanum',
    description: 'Encrypted secret storage with rotation, access policies, and audit trails',
  },
  nav: {
    vaults: 'Vaults',
    rotations: 'Rotations',
    audit: 'Audit Log',
    integrations: 'Integrations',
    team: 'Team',
    tokens: 'API Tokens',
    notifications: 'Notifications',
    settings: 'Settings',
    profile: 'Profile',
  },
  common: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    create: 'Create',
    edit: 'Edit',
    close: 'Close',
    loading: 'Loading…',
    noData: 'No data available',
    yes: 'Yes',
    no: 'No',
  },
  vaults: {
    title: 'Vaults',
    create: 'New vault',
    name: 'Name',
    description: 'Description',
    environment: 'Environment',
    members: 'Members',
    secrets: 'Secrets',
    notFound: 'Vault not found',
  },
  secrets: {
    title: 'Secrets',
    path: 'Path',
    key: 'Key',
    value: 'Value',
    version: 'Version',
    rotation: 'Rotation',
    reveal: 'Reveal',
    hide: 'Hide',
    noRotation: 'None',
    expired: 'expired',
    filterEnv: 'Environment',
    production: 'Production',
    staging: 'Staging',
    development: 'Development',
    notFound: 'Secret not found',
  },
  policies: {
    title: 'Access policies',
    create: 'New policy',
    pathPattern: 'Path pattern',
    permissions: 'Permissions',
    expires: 'Expires',
    notFound: 'Access policy not found',
  },
  rotations: {
    title: 'Rotations',
    pending: 'Pending',
    completed: 'Completed',
    schedule: 'Schedule rotation',
    runNow: 'Rotate now',
  },
  tokens: {
    title: 'API Tokens',
    create: 'Generate token',
    name: 'Token name',
    scopes: 'Scopes',
    expires: 'Expires',
    revoke: 'Revoke',
    notFound: 'API token not found',
  },
  integrations: {
    title: 'Integrations',
    connect: 'Connect',
    sync: 'Sync',
    lastSync: 'Last sync',
    notFound: 'Integration not found',
  },
  team: {
    title: 'Team',
    invite: 'Invite member',
    role: 'Role',
    status: 'Status',
    notFound: 'Team member not found',
  },
  audit: {
    title: 'Audit Log',
    action: 'Action',
    secretKey: 'Secret',
    user: 'User',
    timestamp: 'Timestamp',
  },
  notifications: {
    title: 'Notifications',
    markAllRead: 'Mark all as read',
    empty: "You're all caught up.",
  },
  errors: {
    internalServer: 'Internal server error',
    unauthorized: 'Unauthorized',
    forbidden: 'Forbidden',
    notFound: 'Not found',
  },
}
