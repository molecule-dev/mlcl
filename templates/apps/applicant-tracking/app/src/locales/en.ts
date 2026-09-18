/**
 * Aggregate of app-level English keys, exposed at `locales/en.ts` so the
 * flagship-rollout verify gate (G17) can find a key-count for the app. The
 * runtime locale is loaded from `locales/en/ui.ts` via the i18n bond — this
 * file is a static index for verification + tooling.
 */

export default {
  app: {
    name: 'Shortlist',
    tagline: 'Hire with clarity',
  },
  nav: {
    dashboard: 'Dashboard',
    pipeline: 'Pipeline',
    candidates: 'Candidates',
    jobs: 'Jobs',
    interviews: 'Interviews',
    reports: 'Reports',
    notifications: 'Notifications',
    settings: 'Settings',
    billing: 'Billing',
  },
  job: {
    new: 'New Job',
    edit: 'Edit Job',
    delete: 'Delete Job',
    title: 'Job title',
    department: 'Department',
    location: 'Location',
    description: 'Description',
    requirements: 'Requirements',
    salaryMin: 'Salary min',
    salaryMax: 'Salary max',
    statusOpen: 'Open',
    statusFilled: 'Filled',
    statusPaused: 'Paused',
    statusClosed: 'Closed',
    notFound: 'Job not found',
  },
  candidate: {
    add: 'Add candidate',
    edit: 'Edit candidate',
    delete: 'Delete candidate',
    firstName: 'First name',
    lastName: 'Last name',
    email: 'Email',
    phone: 'Phone',
    source: 'Source',
    aiScore: 'AI score',
    notFound: 'Candidate not found',
  },
  application: {
    notFound: 'Application not found',
    stage: 'Stage',
    appliedAt: 'Applied at',
    daysInStage: 'Days in stage',
  },
  pipeline: {
    sourced: 'Sourced',
    screening: 'Screening',
    interview: 'Interview',
    offer: 'Offer',
    hired: 'Hired',
    rejected: 'Rejected',
  },
  interview: {
    schedule: 'Schedule interview',
    duration: 'Duration',
    panel: 'Panel',
    notes: 'Notes',
  },
  scorecard: {
    overall: 'Overall rating',
    skills: 'Skills',
    culture: 'Culture',
    notes: 'Notes',
    recommendation: 'Recommendation',
  },
  reports: {
    timeToHire: 'Time to hire',
    sourceOfHire: 'Source of hire',
    funnel: 'Funnel',
  },
  pricing: {
    heading: 'Choose your plan',
  },
  validation: {
    failed: 'Validation failed',
  },
  auth: {
    unauthorized: 'Unauthorized',
  },
  errors: {
    internalServer: 'Internal server error',
  },
  actions: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
  },
}
