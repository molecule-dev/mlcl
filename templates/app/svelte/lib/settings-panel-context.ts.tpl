/**
 * Context published by `<SettingsContainer>` to its sections.
 *
 * The container owns the dismiss-the-panel handler; sections that need to
 * close after an action (logout, delete account) read it from context rather
 * than threading the prop down.
 */
import { getContext, setContext } from 'svelte'

const SETTINGS_PANEL_KEY = Symbol('molecule-settings-panel')

/** The `onClose` handler exposed by the parent `<SettingsContainer>`. */
export interface SettingsPanelContextValue {
  onClose: () => void
}

/**
 * Publishes the panel-close handler to descendant sections. Called by
 * `<SettingsContainer>`.
 *
 * @param value - The container's close handler.
 */
export function setSettingsPanelContext(value: SettingsPanelContextValue): void {
  setContext(SETTINGS_PANEL_KEY, value)
}

/**
 * Reads the `onClose` handler exposed by the parent `<SettingsContainer>`.
 * Throws if used outside the container so component misuse is loud.
 *
 * @returns The container's close handler.
 */
export function getSettingsPanelContext(): SettingsPanelContextValue {
  const value = getContext<SettingsPanelContextValue | null>(SETTINGS_PANEL_KEY)
  if (!value) {
    throw new Error(
      'Settings panel section components must be rendered inside <SettingsContainer>.',
    )
  }
  return value
}
