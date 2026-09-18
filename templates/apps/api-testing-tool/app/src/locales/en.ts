/**
 * App-level English translations.
 *
 * The bond-level UI strings live under `./en/ui.ts` (auto-merged by the
 * i18n provider). This module collects the api-testing-tool–specific
 * page/feature keys so they show up in the verify-script's en-key audit.
 */

export default {
  app: {
    name: 'Pylon',
    description: 'Build, save, and run HTTP requests with environments, history, and monitors.',
  },
  nav: {
    workspace: 'Workspace',
    collections: 'Collections',
    environments: 'Environments',
    history: 'History',
    mocks: 'Mocks',
    tests: 'Tests',
    monitors: 'Monitors',
    settings: 'Settings',
    profile: 'Profile',
    pricing: 'Pricing',
  },
  common: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    create: 'Create',
    send: 'Send',
    run: 'Run',
    loading: 'Loading…',
    empty: 'No results',
    confirm: 'Confirm',
  },
  collections: {
    title: 'Collections',
    notFound: 'Collection not found',
    new: 'New collection',
    namePlaceholder: 'Collection name',
    description: 'Description',
  },
  requests: {
    title: 'Requests',
    notFound: 'Request not found',
    executionFailed: 'Request execution failed.',
    new: 'New request',
    method: 'Method',
    url: 'URL',
    headers: 'Headers',
    body: 'Body',
    auth: 'Auth',
    send: 'Send request',
  },
  environments: {
    title: 'Environments',
    notFound: 'Environment not found',
    new: 'New environment',
    activate: 'Set as active',
    variables: 'Variables',
  },
  history: {
    title: 'History',
    notFound: 'History entry not found',
    clear: 'Clear history',
    empty: 'No history yet — send a request to populate this list.',
  },
  mocks: {
    title: 'Mocks',
    notFound: 'Mock not found',
    new: 'New mock',
    pathPattern: 'Path pattern',
    method: 'Method',
    responseStatus: 'Response status',
    responseBody: 'Response body',
  },
  tests: {
    title: 'Tests',
    notFound: 'Test not found',
    run: 'Run test',
    assertions: 'Assertions',
    lastStatus: 'Last status',
    new: 'New test',
  },
  monitors: {
    title: 'Monitors',
    notFound: 'Monitor not found',
    cron: 'Cron schedule',
    successRate24h: 'Success rate (24h)',
    p95Latency: 'p95 latency',
    new: 'New monitor',
  },
  pricing: {
    heading: 'Choose your {{app}} plan',
    maxCollections: '{{count}} collections',
    maxRequests: '{{count}} requests',
    maxEnvironments: '{{count}} environments',
    maxHistory: '{{count}} history entries',
    advancedFeatures: 'Advanced features: {{yes}}',
    canExport: 'Data export: {{yes}}',
    retentionDays: '{{days}} days retention',
  },
  errors: {
    internalServer: 'Internal server error',
    unauthorized: 'You are not authorized to perform this action.',
  },
}
