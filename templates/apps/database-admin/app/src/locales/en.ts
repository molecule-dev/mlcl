/**
 * App-level English translations.
 *
 * The bond-level UI strings live under `./en/ui.ts` (auto-merged by the i18n
 * provider). This module collects the database-admin–specific page/feature
 * keys so they show up in the verify-script's en-key audit and so handler-
 * scoped strings (`connections.notFound` etc.) resolve via `t()`.
 */

export default {
  app: {
    name: 'Quarry',
    description: 'Extract. Query. Command. — admin every database from one console.',
  },
  nav: {
    connections: 'Connections',
    queries: 'Queries',
    schema: 'Schema',
    history: 'History',
    monitoring: 'Monitoring',
    settings: 'Settings',
    pricing: 'Pricing',
  },
  common: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    create: 'Create',
    run: 'Run',
    loading: 'Loading…',
    empty: 'No results',
    confirm: 'Confirm',
  },
  login: {
    heading: 'Sign in to {{appName}}',
    tagline: 'Extract. Query. Command.',
    email: 'Email',
    password: 'Password',
    submit: 'Sign in',
    signingIn: 'Signing in…',
    forgot: 'Forgot password?',
    noAccount: 'Need an account?',
    requestAccess: 'Request access',
  },
  signup: {
    heading: 'Create your {{appName}} account',
    submit: 'Create account',
    haveAccount: 'Already have an account?',
    signIn: 'Sign in',
  },
  forgotPassword: {
    heading: 'Reset password',
    subtext: 'Enter your email to receive a reset link.',
    submit: 'Send reset link',
    backToLogin: 'Back to Sign in',
  },
  resetPassword: {
    heading: 'Set new password',
    submit: 'Reset password',
  },
  connections: {
    title: 'Connections',
    new: 'New connection',
    edit: 'Edit connection',
    test: 'Test connection',
    notFound: 'Connection not found',
    limitReached: 'Connection limit reached on your current plan.',
    testFailed: 'Connection test failed.',
    namePlaceholder: 'Connection name',
    host: 'Host',
    port: 'Port',
    databaseName: 'Database name',
    username: 'Username',
    password: 'Password',
    ssl: 'Use SSL',
    color: 'Color label',
    deleteConfirm: 'Delete this connection? Saved queries that reference it will be orphaned.',
  },
  queries: {
    title: 'Queries',
    editorTitle: 'Query editor',
    historyTitle: 'Query history',
    savedTitle: 'Saved queries',
    notFound: 'Query not found',
    savedNotFound: 'Saved query not found',
    executionFailed: 'Query execution failed.',
    rerun: 'Re-run query',
    save: 'Save query',
    namePlaceholder: 'Saved query name',
  },
  schema: {
    title: 'Schema explorer',
    connectionRequired: 'connection_id is required.',
    tables: 'Tables',
    columns: 'Columns',
    indexes: 'Indexes',
    foreignKeys: 'Foreign keys',
    rowCount: 'Rows',
  },
  tableBrowser: {
    title: 'Table browser',
    rowCount: '{{count}} rows',
    page: 'Page {{page}} of {{total}}',
  },
  monitoring: {
    title: 'Monitoring',
    activeConnections: 'Active connections',
    avgLatency: 'Avg latency',
    slowQueries: 'Slow queries',
  },
  history: {
    title: 'History',
    empty: 'No queries yet — run one to populate the log.',
  },
  settings: {
    title: 'Settings',
    profile: 'Profile',
    dangerZone: 'Danger zone',
    deleteAccountConfirm: 'Are you sure? This action cannot be undone.',
  },
  pricing: {
    heading: 'Choose your {{app}} plan',
    maxConnections: '{{count}} connections',
    maxQueries: '{{count}} saved queries',
    maxSchema: '{{count}} schema introspections',
    advancedFeatures: 'Advanced features: {{yes}}',
    canExport: 'Data export: {{yes}}',
    retentionDays: '{{days}} days retention',
  },
  planUpdated: {
    confirmation: 'Your plan has been updated',
    thankYou: 'Thank you!',
  },
  privacy: {
    title: 'Privacy',
    intro: 'We respect your privacy. Replace this placeholder with your real privacy policy.',
  },
  terms: {
    title: 'Terms',
    intro: 'Replace this placeholder with your real terms of service.',
  },
  notFound: {
    title: 'Page not found',
    message: 'The requested page does not exist.',
    returnHome: 'Return home',
  },
  auth: {
    unauthorized: 'You must be logged in to perform this action.',
  },
  errors: {
    internalServer: 'Internal server error',
  },
}
