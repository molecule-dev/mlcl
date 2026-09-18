import { UserMenu as MoleculeUserMenu, usePanelClose } from '@molecule/app-ui-react'

import { SettingsPanel } from './SettingsPanel.js'

// Rendered inside MoleculeUserMenu's drawer, so it can read the drawer's close
// callback via usePanelClose() (no onClose prop-threading from the trigger).
function UserMenuPanel() {
  return <SettingsPanel onClose={usePanelClose()} />
}

export function UserMenu() {
  return (
    <MoleculeUserMenu>
      <UserMenuPanel />
    </MoleculeUserMenu>
  )
}
