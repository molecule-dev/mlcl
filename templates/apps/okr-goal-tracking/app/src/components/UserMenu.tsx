import { usePanelClose, UserMenu as MoleculeUserMenu } from '@molecule/app-ui-react'

import { SettingsPanel } from './SettingsPanel.js'

function UserMenuPanel() {
  return <SettingsPanel onClose={usePanelClose()} />
}

export function UserMenu() {
  return (
    // 44px trigger — the shared ghost `sm` button is ~36px, under the 40px
    // mobile tap-target floor (fleet-qa 2026-09-22). className composes last
    // onto the trigger button, so this overrides the size classes.
    <MoleculeUserMenu className="h-11 w-11">
      <UserMenuPanel />
    </MoleculeUserMenu>
  )
}
