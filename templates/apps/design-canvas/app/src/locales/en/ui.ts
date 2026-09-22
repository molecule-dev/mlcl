import type { UiTranslations } from '../types.js'

/**
 * English UI strings. The app mostly relies on inline `defaultValue`s in
 * `t()` calls; entries land here when a string needs facilities the inline
 * default can't express — plural forms included (the provider resolves
 * `key_one`/`key_other` whenever `count` is passed).
 */
export const ui: UiTranslations = {
  'dashboard.gridTitle_one': '{{count}} project',
  'dashboard.gridTitle_other': '{{count}} projects',
  'editor.shapeCount_one': '{{count}} shape',
  'editor.shapeCount_other': '{{count}} shapes',
}
