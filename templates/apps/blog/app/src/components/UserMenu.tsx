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
 *
 * Optional `dataMolId`/`className` are forwarded to the trigger button
 * so top navs can keep their existing e2e ids and blend the trigger
 * into their surrounding icon cluster.
 */
export function UserMenu({ dataMolId, className }: { dataMolId?: string; className?: string }) {
  return (
    <MoleculeUserMenu dataMolId={dataMolId} className={className}>
      <UserMenuPanel />
    </MoleculeUserMenu>
  )
}

export default UserMenu
