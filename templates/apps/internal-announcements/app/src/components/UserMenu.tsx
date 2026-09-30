import { usePanelClose, UserMenu as MoleculeUserMenu } from '@molecule/app-ui-react'

import { SettingsPanel } from './SettingsPanel.js'

function UserMenuPanel() {
  return <SettingsPanel onClose={usePanelClose()} />
}

export function UserMenu({ side }: { side?: 'left' | 'right' }) {
  return (
    <MoleculeUserMenu side={side}>
      <UserMenuPanel />
    </MoleculeUserMenu>
  )
}
