/**
 * App-level English translations for clipboard-manager.
 *
 * The canonical molecule UI / auth / forms translation tree lives under
 * `./en/ui.ts`; this file holds the clipboard-domain keys that the
 * per-app `t('key', values, { defaultValue: '…' })` calls reference.
 * Keys here mirror the defaults baked into the page components — this
 * file is the source of truth when other locales translate the app.
 */

export default {
  app: {
    name: 'Yank',
    tagline: 'Copy once, find forever.',
  },
  nav: {
    clips: 'Clips',
    pinned: 'Pinned',
    favorites: 'Favorites',
    categories: 'Categories',
    devices: 'Devices',
    settings: 'Settings',
    profile: 'Profile',
    billing: 'Billing',
    commandPalette: 'Command Palette',
  },
  clip: {
    untitled: 'Untitled',
    new: 'New Clip',
    notFound: 'Clip not found',
    sensitive: 'Sensitive',
    reveal: 'Reveal',
    copy: 'Copy',
    pin: 'Pin',
    unpin: 'Unpin',
    favorite: 'Favorite',
    unfavorite: 'Unfavorite',
    delete: 'Delete',
    edit: 'Edit',
    empty: 'No clips yet. Copy something to get started.',
    searchRequired: 'Search query is required',
    contentRequired: 'Clip content is required',
    placeholder: 'Paste or type your clip...',
    titlePlaceholder: 'Untitled',
    type: {
      text: 'Text',
      image: 'Image',
      link: 'Link',
      code: 'Code',
    },
  },
  category: {
    untitled: 'Untitled',
    new: 'New Category',
    rename: 'Rename Category',
    delete: 'Delete Category',
    notFound: 'Category not found',
    nameRequired: 'Category name is required',
    placeholder: 'Category name',
    empty: 'No categories yet — create your first one.',
  },
  search: {
    title: 'Search',
    placeholder: 'Search clips...',
    loading: 'Searching...',
    noResults: 'No clips found',
  },
  shortcuts: {
    hint: 'Cmd+C copy · Cmd+P pin · Cmd+Backspace delete · ↑↓ navigate · Cmd+K commands',
    title: 'Keyboard shortcuts',
    open: 'Open Command Palette',
    new: 'New clip',
    copy: 'Copy selected',
    pin: 'Pin selected',
    delete: 'Delete selected',
  },
  actions: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    pin: 'Pin',
    favorite: 'Favorite',
  },
  pricing: {
    heading: 'Choose your {{app}} plan',
    period: {
      month: 'Monthly',
      year: 'Yearly',
    },
    limits: {
      maxClips: '{{count}} clips',
      maxCategories: '{{count}} categories',
      maxPinned: '{{count}} pinned',
      advancedFeatures: 'Advanced features',
      dataExport: 'Data export',
    },
  },
  validation: {
    failed: 'Validation failed',
  },
  errors: {
    internalServer: 'Internal server error',
  },
  auth: {
    unauthorized: 'Unauthorized',
  },
}
