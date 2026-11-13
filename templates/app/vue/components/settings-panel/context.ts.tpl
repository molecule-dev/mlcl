/**
 * Settings-panel context — publishes the drawer's `onClose` to the section
 * sub-components (Vue provide/inject port of `settings-panel-react`'s
 * `SettingsPanelContext`), so `<LogOutDeleteSection>` etc. can dismiss the
 * panel after an action without explicit prop threading.
 *
 * @module
 */
import { inject, provide, type InjectionKey } from 'vue'

/** Value published by `<SettingsContainer>` and consumed by its sections. */
export interface SettingsPanelContextValue {
  /** Dismisses the enclosing settings drawer. */
  onClose: () => void
}

const SettingsPanelKey: InjectionKey<SettingsPanelContextValue> = Symbol('SettingsPanelContext')

/**
 * Publishes the settings-panel context from `<SettingsContainer>`.
 *
 * @param value - The context value (the drawer's close callback).
 */
export function provideSettingsPanelContext(value: SettingsPanelContextValue): void {
  provide(SettingsPanelKey, value)
}

/**
 * Returns the nearest settings-panel context value, throwing when a section
 * renders outside `<SettingsContainer>`.
 *
 * @returns The context value.
 */
export function useSettingsPanelContext(): SettingsPanelContextValue {
  const value = inject(SettingsPanelKey)
  if (!value) {
    throw new Error('Settings sections must be rendered inside <SettingsContainer>')
  }
  return value
}
