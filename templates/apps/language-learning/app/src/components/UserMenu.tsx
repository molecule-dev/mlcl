import { usePanelClose, UserMenu as MoleculeUserMenu } from '@molecule/app-ui-react'

import { SettingsPanel } from './SettingsPanel.js'

function UserMenuPanel() {
  return <SettingsPanel onClose={usePanelClose()} />
}

export function UserMenu() {
  return (
    // Sidebar-only trigger (bottom-left of the shared SidebarLayout aside):
    // open the panel from the left, adjacent to the trigger.
    <MoleculeUserMenu side="left">
      <UserMenuPanel />
    </MoleculeUserMenu>
  )
}
