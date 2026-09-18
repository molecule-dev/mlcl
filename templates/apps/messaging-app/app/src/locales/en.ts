/**
 * Aggregate English translation map for messaging-app.
 *
 * The bond-side `app/src/locales/en/` directory holds the curated UI +
 * legal-content translations consumed by the i18n provider. Phase 2 of
 * the flagship rollout (gate G17) additionally requires a single
 * `app/src/locales/en.ts` file at the locales root that exposes a
 * canonical en-translation object — both for the verify check and so
 * future tooling can introspect translations without crawling
 * sub-modules.
 *
 * The keys below are grouped by domain (auth, inbox, conversation,
 * groups, contacts, profile, settings, search, notifications, archive,
 * pricing, billing, plus per-handler error keys that the API surfaces
 * via t()). They mirror the wording shipped by the existing flagship
 * pages so neither the UI nor the API have to rebind on import.
 */

const en = {
  app: {
    name: 'Hush',
    tagline: 'Private by nature',
  },
  common: {
    loading: 'Loading…',
    saving: 'Saving…',
    cancel: 'Cancel',
    close: 'Close',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    confirm: 'Confirm',
    back: 'Back',
    error: 'Something went wrong. Please try again.',
  },
  inbox: {
    heading: 'Inbox',
    subheading: 'Encrypted by default. Quiet by design.',
    newLabel: 'New message',
    searchPlaceholder: 'Search threads, people, content…',
    empty: 'No conversations match.',
    loading: 'Loading…',
    loadError: 'Failed to load conversations.',
  },
  conversation: {
    heading: 'Conversation',
    composerPlaceholder: 'Write a message…',
    send: 'Send',
    edited: '(edited)',
    deleted: 'Message deleted',
    typing: 'Typing…',
    encryptionBanner: 'Messages are end-to-end encrypted.',
    notFound: 'Conversation not found.',
    loadError: 'Failed to load conversation.',
  },
  conversations: {
    notFound: 'Conversation not found',
    listError: 'Failed to list conversations',
    readError: 'Failed to read conversation',
    createError: 'Failed to create conversation',
    updateError: 'Failed to update conversation',
    deleteError: 'Failed to delete conversation',
    archiveError: 'Failed to archive conversation',
    unarchiveError: 'Failed to unarchive conversation',
    readMarkError: 'Failed to mark conversation read',
    messagesError: 'Failed to load messages',
    participantsError: 'Failed to load participants',
    statsError: 'Failed to compute stats',
  },
  messages: {
    notFound: 'Message not found',
    listError: 'Failed to list messages',
    readError: 'Failed to read message',
    createError: 'Failed to create message',
    updateError: 'Failed to update message',
    deleteError: 'Failed to delete message',
    readMarkError: 'Failed to mark message read',
    deliveredMarkError: 'Failed to mark message delivered',
    conversationIdRequired: 'conversation_id query parameter required',
  },
  contacts: {
    heading: 'Contacts',
    addContact: 'Add contact',
    block: 'Block',
    unblock: 'Unblock',
    notFound: 'Contact not found',
    listError: 'Failed to list contacts',
    readError: 'Failed to read contact',
    createError: 'Failed to add contact',
    updateError: 'Failed to update contact',
    deleteError: 'Failed to delete contact',
    blockError: 'Failed to block contact',
    unblockError: 'Failed to unblock contact',
  },
  groups: {
    heading: 'Groups',
    createGroup: 'Create group',
    addMember: 'Add member',
    removeMember: 'Remove member',
    leaveGroup: 'Leave group',
    notFound: 'Group not found',
    memberNotFound: 'Member not found',
    listError: 'Failed to list groups',
    readError: 'Failed to read group',
    createError: 'Failed to create group',
    updateError: 'Failed to update group',
    deleteError: 'Failed to delete group',
    membersError: 'Failed to list members',
    addMemberError: 'Failed to add member',
    removeMemberError: 'Failed to remove member',
  },
  media: {
    notFound: 'Media not found',
    listError: 'Failed to list media',
    readError: 'Failed to read media',
    createError: 'Failed to register media',
    deleteError: 'Failed to delete media',
  },
  reactions: {
    notFound: 'Reaction not found',
    listError: 'Failed to list reactions',
    createError: 'Failed to add reaction',
    deleteError: 'Failed to delete reaction',
  },
  archive: {
    heading: 'Archive',
    empty: 'No archived conversations.',
  },
  search: {
    heading: 'Search',
    placeholder: 'Search messages, contacts, groups…',
    noResults: 'No results',
  },
  notifications: {
    heading: 'Notifications',
    empty: 'You\u2019re all caught up.',
  },
  profile: {
    heading: 'Profile',
    statusPlaceholder: 'What\u2019s on your mind?',
  },
  settings: {
    heading: 'Settings',
    notifications: 'Notifications',
    encryption: 'Encryption',
    danger: 'Danger zone',
  },
  pricing: {
    heading: 'Pricing',
    subheading: 'Pick a plan that grows with your team.',
    cta: 'Choose plan',
    perMonth: 'per month',
    perYear: 'per year',
  },
  billing: {
    error: {
      unknownPriceId: 'Unknown priceId "{{priceId}}".',
      providerUnavailable: 'Billing provider unavailable. Try again later.',
      checkoutFailed: 'Could not start checkout. Try again later.',
      cancelFailed: 'No active subscription to cancel.',
    },
  },
  auth: {
    required: 'Authentication required',
    unauthorized: 'Authentication required.',
  },
  validation: {
    failed: 'Validation failed',
  },
}

export default en
export type MessagingAppTranslations = typeof en
