/**
 * App-level English translation keys introduced by ai-data-analyst pages
 * and components. The G17 verify gate scans this file for top-level
 * `key:` lines, so each new translation domain (page / shell / component)
 * gets its own object.
 *
 * Companion-bond locale strings (auth, forms, http, etc.) live in their
 * respective `@molecule/{api,app}-locales-*` packages — keeping
 * app-specific keys here avoids duplicating canonical translations.
 */
export default {
  app: {
    name: 'Clarion',
    tagline: 'Signal from the noise',
  },
  common: {
    yes: '✓',
    no: '—',
    loading: 'Loading…',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
  },
  nav: {
    dashboard: 'Dashboard',
    datasets: 'Datasets',
    upload: 'Upload',
    query: 'Query',
    reports: 'Reports',
    notifications: 'Notifications',
    settings: 'Settings',
  },
  pricing: {
    heading: 'Choose your {{appName}} plan',
    limits: {
      analyses: '{{count}} analyses',
      datasets: '{{count}} datasets',
      advanced: 'Advanced features',
      export: 'Data export',
    },
  },
  landing: {
    eyebrow: 'Clarion · AI data analyst',
    heroTitle: 'Ask. Chart. Decide.',
    heroSubtitle:
      'Upload your tabular data and ask questions in plain English. Clarion writes the SQL, picks the chart, and surfaces the insight.',
    cta: 'Try it free',
  },
  dashboard: {
    pageTitle: 'Dashboard',
    insightsHeroLabel: 'Insights surfaced this month',
    askCta: 'Ask {{appName}}',
    datasetsKpi: 'Active datasets',
    queriesKpi: 'Queries this week',
    reportsKpi: 'Saved reports',
  },
  datasets: {
    pageTitle: 'Datasets',
    notFound: 'Dataset not found',
    fileRequired: 'File is required',
    columns: 'Columns',
    rows: 'Rows',
    lastAnalyzed: 'Last analyzed',
    status: 'Status',
    name: 'Name',
    upload: 'Upload dataset',
  },
  datasetDetail: {
    schema: 'Schema',
    sample: 'Sample',
    insights: 'AI insights',
    rerun: 'Re-run analysis',
  },
  upload: {
    pageTitle: 'Upload',
    drop: 'Drop a CSV, JSON, or Parquet file here',
    pickFile: 'Choose file',
    invalidFile: 'Only CSV, JSON, JSONL, or Parquet files are accepted.',
    uploading: 'Uploading…',
    success: 'Upload complete',
    failed: 'Upload failed',
  },
  queryEditor: {
    eyebrow: 'Ask {{appName}} · Natural-language query',
    heading: 'What do you want to know?',
    subhead:
      'Type a question in plain English. {{appName}} picks the chart, runs the SQL, and shows you the lineage.',
    emptyHeading: 'Pick a suggestion or type your own',
    emptyBody:
      '{{appName}} answers in three pieces: a chart, the underlying data table, and the SQL that ran.',
    questionEyebrow: 'You asked',
    aiBadge: 'AI generated',
    dataHeading: 'Data',
    sqlHeading: 'Generated SQL',
    aiSummary: 'AI summary',
    exportCsv: 'CSV',
    copyCta: 'Copy',
  },
  analysis: {
    eyebrow: 'Saved analysis',
    loadingTitle: 'Loading analysis…',
    loading: 'Loading…',
    error: 'Could not load analysis: {{error}}',
    narrativeHeading: 'AI narrative',
    sqlHeading: 'Generated SQL',
    notFound: 'Analysis not found',
    datasetNotFound: 'Dataset not found',
    questionRequired: 'Question is required',
    chartConfigRequired: 'Chart configuration is required',
  },
  reports: {
    pageTitle: 'Reports',
    name: 'Name',
    lastRun: 'Last run',
    save: 'Save as report',
    share: 'Share',
  },
  notifications: {
    pageTitle: 'Notifications',
    empty: 'You\u2019re all caught up.',
    markRead: 'Mark as read',
  },
  settings: {
    pageTitle: 'Settings',
    profileTab: 'Profile',
    securityTab: 'Security',
    billingTab: 'Billing',
  },
  askClarionBar: {
    placeholder:
      'Ask a question about your data \u2014 e.g. \u201Ctop 10 customers by Q3 revenue\u201D',
    ariaLabel: 'Ask {{appName}} a question',
    askCta: 'Ask',
    thinking: 'Thinking\u2026',
    suggestionsLabel: 'Try',
  },
  insightHeroCard: {
    subtitle:
      'Trends, anomalies, and correlations {{appName}} has surfaced from your datasets this month.',
  },
  auth: {
    unauthorized: 'Authentication required.',
  },
  errors: {
    internalServer: 'Internal server error',
    notFound: 'Not found',
  },
}
