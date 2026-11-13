/**
 * Panel-close context shared by `UserMenu` and the settings panel.
 *
 * UserMenu mounts caller-supplied panel content inside its drawer; the panel
 * needs to dismiss that drawer after an action (logout, delete account)
 * without an `onClose` prop threaded through every section. The component
 * provides the close callback via this context and panel content reads it
 * with {@link getPanelClose} — the Svelte-context counterpart of React's
 * `usePanelClose()`.
 */
import { getContext, setContext } from 'svelte'

const PANEL_CLOSE_KEY = Symbol('molecule-panel-close')

/**
 * Publishes the drawer-dismiss callback to descendants. Called by `UserMenu`.
 *
 * @param close - Callback that closes the enclosing drawer.
 */
export function setPanelCloseContext(close: () => void): void {
  setContext(PANEL_CLOSE_KEY, close)
}

/**
 * Returns the callback that dismisses the drawer the current panel is
 * mounted in. Safe to call anywhere — returns a no-op when no enclosing
 * `UserMenu` provides one (e.g. a panel rendered standalone).
 *
 * @returns A function that closes the enclosing drawer, or a no-op.
 */
export function getPanelClose(): () => void {
  return getContext<() => void>(PANEL_CLOSE_KEY) ?? (() => {})
}
