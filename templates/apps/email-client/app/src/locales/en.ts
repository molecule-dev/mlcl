/**
 * English translations for email-client — page-level keys.
 *
 * The `en/` directory ships ui / privacy / terms locale modules consumed
 * by the auth UI, footer, and legal pages. This file aggregates the
 * page-specific keys (Landing, Inbox, Compose, ThreadView, Drafts,
 * Starred, Settings, Pricing) that templates use directly via
 * `t('namespace.key', …)` calls.
 *
 * `defaultValue:` fallbacks live alongside each `t()` call in pages, so
 * this file can be safely overridden per-deployment without breaking the
 * UI. Translators editing this file replace the right-hand strings only.
 */

export default {
  app: {
    name: 'Courier',
    tagline: 'Where every message finds its line',
  },
  common: {
    loading: 'Loading…',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    search: 'Search',
    submit: 'Submit',
    back: 'Back',
  },
  meridian: {
    inbox: {
      tab: {
        primary: 'Primary',
        social: 'Social',
        promos: 'Promotions',
        updates: 'Updates',
      },
      archive: 'Archive',
      delete: 'Delete',
      spam: 'Spam',
      snooze: 'Snooze',
      move: 'Move',
      reply: 'Reply',
      replyAll: 'Reply all',
      forward: 'Forward',
      send: 'Send',
      replyPlaceholder: 'Write a reply…',
      ofTotal: '{{current}} of {{total}}',
      relativeTime: '18 hours ago',
      recipients: 'me, design-team',
      sample: {
        greeting: 'Hi team,',
        body1:
          "I've finalized the new Shared Components JSON mapping for the TopNavBar and SideNav elements — it's ready for review.",
        body2: "Let me know if you have any questions before tomorrow's sprint planning meeting.",
      },
    },
    compose: {
      title: 'New message',
      to: 'To',
      cc: 'Cc',
      bcc: 'Bcc',
      subject: 'Subject',
      body: 'Body',
      send: 'Send',
      saveDraft: 'Save draft',
      attach: 'Attach files',
      discard: 'Discard',
    },
    drafts: {
      title: 'Drafts',
      empty: 'No drafts yet',
    },
    starred: {
      title: 'Starred',
      empty: 'Nothing starred',
    },
    thread: {
      reply: 'Reply',
      replyAll: 'Reply all',
      forward: 'Forward',
    },
    settings: {
      title: 'Settings',
      profile: 'Profile',
      mailbox: 'Mailbox',
      signature: 'Signature',
      theme: 'Theme',
      dangerZone: 'Danger zone',
    },
    auth: {
      signIn: 'Sign in',
      signUp: 'Create account',
      forgot: 'Forgot password?',
      reset: 'Reset password',
    },
  },
  pricing: {
    title: 'Plans that scale with your inbox',
    cta: 'Choose plan',
    free: 'Free',
    pro: 'Pro',
    team: 'Team',
  },
  landing: {
    hero: {
      title: 'Inbox zero, finally.',
      subtitle: 'A modern email client built for focus.',
      cta: 'Get started',
    },
  },
  errors: {
    generic: 'Something went wrong. Please try again.',
    notFound: 'Not found',
    unauthorized: 'Authentication required',
    validation: 'Validation failed',
  },
}
