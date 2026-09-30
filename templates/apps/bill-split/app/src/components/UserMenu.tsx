import { usePanelClose, UserMenu as MoleculeUserMenu } from '@molecule/app-ui-react'

import { SettingsPanel } from './SettingsPanel.js'

function UserMenuPanel() {
  return <SettingsPanel onClose={usePanelClose()} />
}

/**
 * Thin wrapper around the shared `UserMenu` that injects this app's
 * own `SettingsPanel` as the drawer body.
 *
 * `side` passes through to the shared drawer position: `BillSplitLayout`
 * renders this trigger in the left sidebar's footer row (and the mobile
 * drawer's footer, the same left-panel geometry), so it passes
 * `side="left"` — the `AppHeader` top bar keeps the default (`'right'`).
 */
export function UserMenu({ side }: { side?: 'left' | 'right' }) {
  return (
    <MoleculeUserMenu side={side}>
      <UserMenuPanel />
    </MoleculeUserMenu>
  )
}
