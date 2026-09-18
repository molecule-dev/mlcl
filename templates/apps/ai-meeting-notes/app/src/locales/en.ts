/**
 * App-level English translation barrel.
 *
 * The framework-level i18n provider is wired through `app/src/locales/en/`
 * (see `config.ts`); this barrel groups the app-domain keys (meetings,
 * actions, calendar, pricing, etc.) used by `app/src/pages/*.tsx`. Both
 * shapes are loaded into the same i18n provider at startup.
 */
export default {
  app: {
    name: 'Murmur',
    description:
      'Record or import meetings, transcribe with Whisper, summarize and extract action items with Claude.',
  },
  nav: {
    dashboard: 'Dashboard',
    meetings: 'Meetings',
    record: 'Record',
    actions: 'Action items',
    calendar: 'Calendar',
    integrations: 'Integrations',
    search: 'Search',
    notifications: 'Notifications',
    team: 'Team',
    profile: 'Profile',
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
  meetings: {
    title: 'Meetings',
    heading: 'Meetings',
    subheading: 'Every recorded, uploaded, and synced meeting.',
    loading: 'Loading…',
    loadError: 'Failed to load meetings.',
    notFound: 'Meeting not found.',
    audioRequired: 'Audio file is required.',
    notesRequired: 'Meeting notes are required.',
    defaultTitle: 'Untitled Meeting',
    recordCta: 'Record meeting',
    'empty.heading': 'No meetings yet',
    'empty.body': 'Start a recording or upload an audio file to get a transcript and AI summary.',
    'source.recorded': 'Recorded',
    'source.uploaded': 'Uploaded',
    'source.zoom': 'Zoom',
    'source.meet': 'Google Meet',
    'source.teams': 'Microsoft Teams',
    'status.pending': 'Pending',
    'status.transcribing': 'Transcribing',
    'status.ready': 'Ready',
    'status.failed': 'Failed',
  },
  actionItems: {
    title: 'Action items',
    notFound: 'Action item not found.',
    loadError: 'Failed to load action items.',
  },
  transcripts: {
    notFound: 'Transcript segment not found.',
  },
  calendar: {
    title: 'Calendar',
    notFound: 'Calendar event not found.',
  },
  team: {
    title: 'Team',
    notFound: 'Team member not found.',
  },
  notifications: {
    title: 'Notifications',
    notFound: 'Notification not found.',
  },
  apiTokens: {
    title: 'API tokens',
    notFound: 'API token not found.',
  },
  search: {
    title: 'Search',
  },
  dashboard: {
    title: 'Dashboard',
    loading: 'Loading…',
    loadError: 'Failed to load dashboard.',
  },
  pricing: {
    heading: 'Choose your {{app}} plan',
    actionsLabel: 'action items',
    meetingsLabel: 'meetings',
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
  billing: {
    error: {
      unknownPriceId: 'Unknown priceId "{{priceId}}".',
      providerUnavailable: 'Billing provider unavailable. Try again later.',
      checkoutFailed: 'Could not start checkout. Try again later.',
      cancelFailed: 'No active subscription to cancel.',
    },
  },
  auth: {
    unauthorized: 'You must be logged in to perform this action.',
  },
  errors: {
    internalServer: 'Something went wrong. Please try again.',
  },
}
