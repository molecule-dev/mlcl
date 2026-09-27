import { usePanelClose, UserMenu as MoleculeUserMenu } from '@molecule/app-ui-react'

import { SettingsPanel } from './SettingsPanel.js'

function UserMenuPanel() {
  return <SettingsPanel onClose={usePanelClose()} />
}

/**
 * Thin wrapper around the shared `UserMenu` that injects this app's
 * own `SettingsPanel` as the drawer body. The shared trigger ships the
 * `user` icon, `data-mol-id="user-menu"`, and closes the drawer on any
 * route change (back/forward included).
 */
export function UserMenu() {
  return (
    <MoleculeUserMenu>
      <UserMenuPanel />
    </MoleculeUserMenu>
  )
}
