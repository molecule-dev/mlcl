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
    // Sidebar-only trigger (bottom-left of the shared SidebarLayout aside):
    // open the panel from the left, adjacent to the trigger.
    <MoleculeUserMenu side="left">
      <UserMenuPanel />
    </MoleculeUserMenu>
  )
}
