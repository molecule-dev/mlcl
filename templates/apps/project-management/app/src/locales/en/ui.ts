/**
 * Default English translations.
 *
 * Add additional locales by creating new files (e.g., es.ts, fr.ts)
 * and registering them with the i18n provider in config.ts.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  'kpi.tasksDueLabel': 'Tasks Due Today',
  'taskList.title': 'My Tasks',
  'taskList.loadError': 'Failed to load tasks',
  'taskList.deleteError': 'Failed to delete task',
  'common.confirmDelete': 'Delete this task?',
  'common.retry': 'Retry',
}
