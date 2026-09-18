/**
 * App-level English translation keys for the document-collaboration
 * domain.
 *
 * Existing molecule package strings are translated via the per-package
 * locale bonds (`app/src/locales/en/ui.ts` etc.). This file is the
 * single canonical surface for app-domain strings the verifier requires
 * (G17). Pages reference these via `t('documents.title', ...)` etc.
 */

const en = {
  // Generic actions
  common: {
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    delete: 'Delete',
    restore: 'Restore',
    create: 'Create',
    open: 'Open',
    close: 'Close',
    loading: 'Loading…',
    saving: 'Saving…',
    saved: 'Saved',
    untitled: 'Untitled',
    search: 'Search',
    settings: 'Settings',
    profile: 'Profile',
  },

  // Navigation
  nav: {
    dashboard: 'Dashboard',
    shared: 'Shared with me',
    templates: 'Templates',
    trash: 'Trash',
    notifications: 'Notifications',
    settings: 'Settings',
    profile: 'Profile',
  },

  // Documents (CRUD)
  documents: {
    title: 'Documents',
    untitled: 'Untitled Document',
    new: 'New document',
    create: 'Create document',
    notFound: 'Document not found',
    titlePlaceholder: 'Untitled document',
    lastEdited: 'Last edited {{time}}',
    copy: 'Copy',
    duplicate: 'Duplicate',
    delete: 'Delete forever',
    moveToTrash: 'Move to Trash',
    confirmDelete: 'Are you sure you want to delete this document?',
    saveAsTemplate: 'Save as template',
  },

  // Editor
  editor: {
    placeholder: 'Start writing…',
    presence: '{{count}} editing now',
    typingIndicator: '{{name}} is typing…',
    saved: 'All changes saved',
  },

  // Comments
  comments: {
    title: 'Comments',
    add: 'Add a comment',
    reply: 'Reply',
    resolve: 'Resolve',
    reopen: 'Reopen',
    delete: 'Delete comment',
    notFound: 'Comment not found',
    forbidden: 'Forbidden',
    bodyRequired: 'Comment cannot be empty',
    placeholder: 'Comment on this selection…',
    resolved: 'Resolved',
    unresolved: 'Open',
  },

  // Versions
  versions: {
    title: 'Version history',
    notFound: 'Version not found',
    restore: 'Restore this version',
    restoreSummary: 'Restored from version {{version}}',
    diffWithCurrent: 'Compare with current',
    empty: 'No previous versions yet',
  },

  // Sharing
  sharing: {
    title: 'Share document',
    invite: 'Invite by email',
    role: 'Permission',
    roleViewer: 'Can view',
    roleCommenter: 'Can comment',
    roleEditor: 'Can edit',
    inviteSubject: '{{title}} has been shared with you',
    inviteBody: 'You have been invited to collaborate on {{title}}',
    notFound: 'Share not found',
    forbidden: 'You do not have permission to manage shares',
    revoke: 'Remove access',
  },

  // Templates
  templates: {
    title: 'Templates',
    subtitle: 'Start with a thoughtful structure. Customize endlessly.',
    blank: 'Blank document',
    use: 'Use template',
    saveCurrent: 'Save current document as template',
  },

  // Trash
  trash: {
    title: 'Trash',
    subtitle: 'Documents are deleted permanently after 30 days.',
    empty: 'Trash is empty',
    emptyAll: 'Empty trash',
    restore: 'Restore',
    deleteForever: 'Delete forever',
    deletedAgo: 'Deleted {{time}}',
  },

  // Notifications page
  notifications: {
    title: 'Notifications',
    empty: 'No notifications yet',
    markAllRead: 'Mark all as read',
  },

  // Validation / generic errors surfaced to the user
  validation: {
    failed: 'Validation failed',
  },

  errors: {
    internalServer: 'Internal server error',
  },

  auth: {
    unauthorized: 'Unauthorized',
  },

  // Subscription / billing
  billing: {
    upgrade: 'Upgrade',
    free: 'Free',
    pro: 'Pro',
    team: 'Team',
    documentLimitReached: 'You have reached the document limit on your current plan.',
  },
}

export default en
