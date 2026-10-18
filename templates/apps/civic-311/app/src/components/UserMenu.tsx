import { lazy, Suspense } from 'react'

import { usePanelClose, UserMenu as MoleculeUserMenu } from '@molecule/app-ui-react'

const SettingsPanel = lazy(() =>
  import('./SettingsPanel.js').then((m) => ({ default: m.SettingsPanel })),
)

function UserMenuPanel() {
  return (
    <Suspense fallback={null}>
      <SettingsPanel onClose={usePanelClose()} />
    </Suspense>
  )
}

/**
 * Thin wrapper around the shared `UserMenu` that injects this app's
 * own `SettingsPanel` as the drawer body.
 */
export function UserMenu() {
  return (
    <MoleculeUserMenu>
      <UserMenuPanel />
    </MoleculeUserMenu>
  )
}
