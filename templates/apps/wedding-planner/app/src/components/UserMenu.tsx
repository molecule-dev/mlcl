import { usePanelClose, UserMenu as MoleculeUserMenu } from '@molecule/app-ui-react'

import { SettingsPanel } from './SettingsPanel.js'

function UserMenuPanel() {
  return <SettingsPanel onClose={usePanelClose()} />
}

export function UserMenu() {
  return (
    <MoleculeUserMenu className="min-h-[36px] min-w-[36px]">
      <UserMenuPanel />
    </MoleculeUserMenu>
  )
}
