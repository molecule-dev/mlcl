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

/**
 * Props are forwarded to the underlying SidebarUserCard so callers can
 * adapt the trigger to their surface (e.g. the mobile top bar passes
 * `secondaryLine=""` to hide the email and a max-width style so the
 * brand wordmark keeps room).
 */
export function UserMenu(
  props: Omit<Parameters<typeof SidebarUserCard>[0], 'children'>,
): ReturnType<typeof SidebarUserCard> {
  return (
    <SidebarUserCard ariaLabelKey="userMenu.open" {...props}>
      <UserMenuPanel />
    </SidebarUserCard>
  )
}
