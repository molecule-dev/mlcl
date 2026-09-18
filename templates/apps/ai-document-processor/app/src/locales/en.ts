/**
 * App-level English translation barrel.
 *
 * The framework-level i18n provider is wired through `app/src/locales/en/`
 * (see `config.ts`); this barrel groups the app-domain keys (documents,
 * dashboard, pricing, etc.) used by `app/src/pages/*.tsx`. Both shapes are
 * loaded into the same i18n provider at startup.
 */
export default {
  app: {
    name: 'Parcela',
    description:
      'OCR + AI extraction, classification, and filing for invoices, receipts, contracts, and forms.',
  },
  nav: {
    dashboard: 'Dashboard',
    documents: 'Documents',
    upload: 'Upload',
    rules: 'Rules',
    settings: 'Settings',
  },
  common: {
    yes: '✓',
    no: '—',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    loading: 'Loading...',
    returnHome: 'Return home',
  },
  documents: {
    title: 'Documents',
    upload: 'Upload',
    notFound: 'Document not found.',
    fieldNotFound: 'Document field not found.',
    deleteConfirm: 'Are you sure you want to delete this document?',
  },
  dashboard: {
    title: 'Dashboard',
    loading: 'Loading…',
    loadError: 'Failed to load dashboard.',
  },
  upload: {
    title: 'Upload',
    drop: 'Drop files here',
    invalidType: 'This file type is not supported.',
  },
  rules: {
    title: 'Rules',
    add: 'Add rule',
    notFound: 'Rule not found.',
  },
  folders: {
    title: 'Folders',
    notFound: 'Folder not found.',
  },
  apiTokens: {
    title: 'API tokens',
    notFound: 'API token not found.',
  },
  pricing: {
    heading: 'Choose your {{app}} plan',
    documentsLabel: 'documents',
    processingLabel: 'processing jobs',
    advancedFeaturesLabel: 'Advanced features',
    canExportLabel: 'Data export',
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
  settings: {
    deleteAccountConfirm: 'Are you sure? This action cannot be undone.',
  },
  auth: {
    unauthorized: 'You must be logged in to perform this action.',
  },
  errors: {
    internalServer: 'Something went wrong. Please try again.',
  },
}
