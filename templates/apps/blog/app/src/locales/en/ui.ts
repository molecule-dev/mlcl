/**
 * Default English translations.
 *
 * Add additional locales by creating new files (e.g., es.ts, fr.ts)
 * and registering them with the i18n provider in config.ts.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  'topNavBar.searchPlaceholder': 'Search (Cmd+K)',
  'sideNavBar.editorialSuite': 'Editorial Suite',
  'sideNavBar.myPosts': 'My Posts',
  'sideNavBar.categories': 'Categories',
  'postListHeader.myStories': 'My Stories',
  'postListHeader.archiveSubtitle': 'Manage and curate your intellectual archive.',
  'postListPagination.ofTotalStories': 'of {{count}} stories',
}
