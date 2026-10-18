import { lazy, Suspense } from 'react'

import { UserMenu as MoleculeUserMenu, usePanelClose } from '@molecule/app-ui-react'

// The settings panel is split out of the entry: it mounts only when the user
// opens the drawer, and it is the heaviest thing the app shell can pull in
// (account, auth, billing, devices and notifications sections plus their
// translation bundles). A static import here ships all of that on every page.
const SettingsPanel = lazy(() =>
  import('./SettingsPanel.js').then((m) => ({ default: m.SettingsPanel })),
)

// Rendered inside MoleculeUserMenu's drawer, so it can read the drawer's close
// callback via usePanelClose() (no onClose prop-threading from the trigger).
function UserMenuPanel() {
  return (
    <Suspense fallback={null}>
      <SettingsPanel onClose={usePanelClose()} />
    </Suspense>
  )
}

export function UserMenu() {
  return (
    <MoleculeUserMenu>
      <UserMenuPanel />
    </MoleculeUserMenu>
  )
}
