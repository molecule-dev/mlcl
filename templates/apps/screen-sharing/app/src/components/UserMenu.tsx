import { usePanelClose, UserMenu as MoleculeUserMenu } from '@molecule/app-ui-react'

import { SettingsPanel } from './SettingsPanel.js'

function UserMenuPanel() {
  return <SettingsPanel onClose={usePanelClose()} />
}

export function UserMenu() {
  return (
    // Left-sidebar trigger: the panel opens adjacent to it, not across the screen.
    <MoleculeUserMenu side="left">
      <UserMenuPanel />
    </MoleculeUserMenu>
  )
}
