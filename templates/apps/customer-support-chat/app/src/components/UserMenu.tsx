import { usePanelClose, UserMenu as MoleculeUserMenu } from '@molecule/app-ui-react'

import { SettingsPanel } from './SettingsPanel.js'

function UserMenuPanel() {
  return <SettingsPanel onClose={usePanelClose()} />
}

/**
 * Thin wrapper around the shared `UserMenu` that mounts this app's
 * `SettingsPanel` (Account / Auth / Notifications / Devices / sign-out +
 * delete) inside the drawer. The shared component handles the avatar
 * trigger, drawer chrome, and closing on route change. `className` is
 * forwarded onto the trigger button so the host shell can match it to its
 * surface (e.g. white on the cyan inbox rail).
 */
export function UserMenu({ className }: { className?: string } = {}) {
  return (
    <MoleculeUserMenu className={className}>
      <UserMenuPanel />
    </MoleculeUserMenu>
  )
}
