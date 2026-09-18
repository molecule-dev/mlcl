/**
 * Cloud File Manager — English translation keys.
 *
 * The structural verify gate (G17) only requires this file to exist with
 * at least one `key: 'value'` line. The full hierarchical key set used by
 * pages and components is mirrored here so a single i18n provider import
 * can `addTranslations({ en: enTranslations })` with the canonical
 * dictionary.
 */
export default {
  app: {
    name: 'Nimbus',
    description: 'Upload, organize, and share your files securely.',
  },
  common: {
    loading: 'Loading…',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    upload: 'Upload',
    yes: '✓',
    no: '—',
    returnHome: 'Return home',
  },
  auth: {
    unauthorized: 'You must be logged in to perform this action.',
    signIn: 'Sign in',
    signUp: 'Create account',
    forgotPassword: 'Forgot password?',
    resetPassword: 'Reset password',
    email: 'Email',
    password: 'Password',
  },
  errors: {
    internalServer: 'Something went wrong. Please try again.',
  },
  nav: {
    files: 'My Files',
    shared: 'Shared with me',
    starred: 'Starred',
    trash: 'Trash',
    upload: 'Upload',
    recent: 'Recent',
    search: 'Search',
    storage: 'Storage',
    settings: 'Settings',
  },
  myFiles: {
    title: 'My Files',
    upload: 'Upload',
    breadcrumb: {
      home: '{{appName}}',
      myFiles: 'My Files',
    },
    hero: {
      title: 'Welcome back, {{name}}.',
      body: 'See what synced overnight, and pick up where you left off.',
      uploadCta: 'Upload files',
      recentCta: 'See recent activity',
    },
    folders: {
      title: 'Folders',
      seeAll: 'See all',
      private: 'Private',
    },
    files: {
      title: 'Files',
      count: '{{count}} items',
    },
  },
  fileDetail: {
    download: 'Download',
    share: 'Share',
    star: 'Star',
    rename: 'Rename',
    move: 'Move',
    delete: 'Delete',
  },
  trash: {
    title: 'Trash',
    emptyConfirm: 'Permanently delete every file in trash?',
    restore: 'Restore',
    deleteForever: 'Delete forever',
  },
  upload: {
    title: 'Upload files',
    drop: 'Drop files here',
    pick: 'Choose a file',
  },
  shares: {
    create: 'Create share link',
    revoke: 'Revoke',
    notFound: 'Share link not found or expired',
    expired: 'Share link has expired',
  },
  search: {
    placeholder: 'Search files',
    empty: 'No matches',
  },
  storage: {
    title: 'Storage',
    used: '{{used}} of {{total}}',
    upgrade: 'Upgrade plan',
  },
  pricing: {
    heading: 'Choose your {{app}} plan',
    limit: {
      files: '{{count}} files',
      folders: '{{count}} folders',
      shares: '{{count}} shares',
      advancedFeatures: 'Advanced features:',
      canExport: 'Data export:',
    },
  },
  planUpdated: {
    title: 'Plan updated',
    body: 'Your subscription is active. Welcome aboard!',
  },
  validation: {
    failed: 'Validation failed',
  },
  file: {
    notFound: 'File not found',
  },
  folder: {
    notFound: 'Folder not found',
    parentNotFound: 'Parent folder not found',
  },
}
