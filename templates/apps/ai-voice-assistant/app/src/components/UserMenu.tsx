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
 *
 * `side` passes through to the shared drawer position: the desktop
 * `ParlanceLayout` mounts this trigger in the left sidebar's footer
 * row, so it passes `side="left"` — the mobile top bar keeps the
 * default (`'right'`).
 */
export function UserMenu({ side }: { side?: 'left' | 'right' }) {
  return (
    <MoleculeUserMenu side={side}>
      <UserMenuPanel />
    </MoleculeUserMenu>
  )
}
