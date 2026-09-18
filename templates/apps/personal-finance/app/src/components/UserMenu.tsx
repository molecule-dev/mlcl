import { usePanelClose, UserMenu as MoleculeUserMenu } from '@molecule/app-ui-react'

import { SettingsPanel } from './SettingsPanel.js'

function UserMenuPanel() {
  return <SettingsPanel onClose={usePanelClose()} />
}

/**
 * Thin wrapper around the shared `UserMenu` that injects this app's
 * own `SettingsPanel` as the drawer body.
 */
export function UserMenu() {
  return (
    <MoleculeUserMenu ariaLabelKey="userMenu.openButton">
      <UserMenuPanel />
    </MoleculeUserMenu>
  )
}
