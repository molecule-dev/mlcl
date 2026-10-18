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

export function UserMenu() {
  return (
    // Left-sidebar trigger: the panel opens adjacent to it, not across the screen.
    <MoleculeUserMenu side="left">
      <UserMenuPanel />
    </MoleculeUserMenu>
  )
}
