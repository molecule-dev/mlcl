import { lazy, Suspense } from 'react'

import { SidebarUserCard, usePanelClose } from '@molecule/app-ui-react'

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
    <SidebarUserCard
      ariaLabelKey="userMenu.open"
      ariaLabelDefault="Open account menu"
      dataMolId="user-menu"
    >
      <UserMenuPanel />
    </SidebarUserCard>
  )
}
