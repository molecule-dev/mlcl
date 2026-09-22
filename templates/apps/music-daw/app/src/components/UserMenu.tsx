import { usePanelClose, UserMenu as MoleculeUserMenu } from '@molecule/app-ui-react'

import { SettingsPanel } from './SettingsPanel.js'

function UserMenuPanel() {
  return <SettingsPanel onClose={usePanelClose()} />
}

export function UserMenu() {
  return (
    // Trigger ships 26px tall from the shared bundle — pad it to a 40px
    // touch target here (fleet-known gap; the className composes onto the
    // trigger button without changing its icon or layout).
    <MoleculeUserMenu className="min-h-[40px] min-w-[40px]">
      <UserMenuPanel />
    </MoleculeUserMenu>
  )
}
