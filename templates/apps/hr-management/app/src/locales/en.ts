/**
 * Aggregate of app-level English keys, exposed at `locales/en.ts` so the
 * flagship-rollout verify gate (G17) can find a key-count for the app. The
 * runtime locale is loaded from `locales/en/ui.ts` via the i18n bond — this
 * file is a static index for verification + tooling.
 */

export default {
  app: {
    name: 'Arbor',
    tagline: 'Where talent takes root',
  },
  nav: {
    dashboard: 'Dashboard',
    employees: 'Employees',
    orgChart: 'Org chart',
    pto: 'Time off',
    documents: 'Documents',
    onboarding: 'Onboarding',
    performance: 'Performance',
    reports: 'Reports',
    notifications: 'Notifications',
    settings: 'Settings',
    billing: 'Billing',
  },
  employee: {
    add: 'Add employee',
    edit: 'Edit employee',
    delete: 'Delete employee',
    firstName: 'First name',
    lastName: 'Last name',
    workEmail: 'Work email',
    personalEmail: 'Personal email',
    phone: 'Phone',
    title: 'Title',
    department: 'Department',
    manager: 'Manager',
    startDate: 'Start date',
    employmentType: 'Employment type',
    location: 'Office location',
    pronouns: 'Pronouns',
    timezone: 'Timezone',
    bio: 'Bio',
    statusActive: 'Active',
    statusOnLeave: 'On leave',
    statusTerminated: 'Terminated',
    notFound: 'Employee not found',
  },
  department: {
    new: 'New department',
    edit: 'Edit department',
    delete: 'Delete department',
    name: 'Name',
    head: 'Department head',
    parent: 'Parent department',
    notFound: 'Department not found',
  },
  pto: {
    request: 'Request time off',
    approve: 'Approve',
    deny: 'Deny',
    kind: 'Type',
    startDate: 'Start date',
    endDate: 'End date',
    hours: 'Hours',
    reason: 'Reason',
    statusPending: 'Pending',
    statusApproved: 'Approved',
    statusDenied: 'Denied',
    notFound: 'PTO request not found',
  },
  document: {
    upload: 'Upload document',
    delete: 'Delete document',
    title: 'Title',
    kind: 'Kind',
    notFound: 'Document not found',
  },
  performance: {
    cycle: 'Review cycle',
    rating: 'Rating',
    summary: 'Summary',
    statusDraft: 'Draft',
    statusInProgress: 'In progress',
    statusCompleted: 'Completed',
    notFound: 'Performance review not found',
  },
  reports: {
    headcount: 'Headcount',
    attrition: 'Attrition',
    byDepartment: 'By department',
  },
  pricing: {
    heading: 'Choose your plan',
    limits: {
      departments: 'departments',
      documents: 'documents',
      employees: 'employees',
      pto: 'pto requests',
      advanced: 'Advanced features',
      export: 'Data export',
    },
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
  billing: {
    error: {
      unknownPriceId: 'Unknown price.',
      providerUnavailable: 'Billing provider unavailable. Try again later.',
      checkoutFailed: 'Could not start checkout. Try again later.',
      cancelFailed: 'No active subscription to cancel.',
    },
  },
}
