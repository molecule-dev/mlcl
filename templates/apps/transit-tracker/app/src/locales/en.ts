/**
 * English source strings for keys whose UI call sites carry only a
 * `defaultValue` fallback. The full per-language key sets live in
 * `locales/<code>/ui.ts` (imported by bonds/i18n-default.ts); this file is
 * the canonical English reference for the shared `common.*` strings and the
 * action-site keys added with the QA pass. (The previous content of this
 * file was dead donor copy — flight-deal strings no page referenced.)
 */
export default {
  common: {
    loading: 'Loading...',
    delete: 'Delete',
    back: 'Back',
    retry: 'Retry',
    undo: 'Undo',
    saveChanges: 'Save changes',
    savingEllipsis: 'Saving…',
    savedPeriod: 'Saved.',
    couldNotSaveChanges: 'Could not save changes.',
    toggleLightDark: 'Toggle between light and dark mode.',
    copyrightAllRightsReserved: '© {{year}} {{app}}. All rights reserved.',
    about: 'About',
    chooseTheLanguage: 'Choose the language used throughout the app.',
  },
  stopBoard: {
    saveError: 'Could not update your saved stops. Please try again.',
  },
  savedStops: {
    actionError: 'Could not update your saved stops. Please try again.',
    removedToast: 'Removed {{stop}}',
  },
  tripPlanner: {
    stopsError: 'Could not load the stop list.',
  },
}
