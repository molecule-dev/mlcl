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
 * Thin wrapper around the shared `UserMenu` that mounts this app's
 * `SettingsPanel` in the drawer. The shared component handles the
 * avatar trigger, the drawer chrome, and closing on route change.
 */
export function UserMenu() {
  return (
    <MoleculeUserMenu>
      <UserMenuPanel />
    </MoleculeUserMenu>
  )
}
