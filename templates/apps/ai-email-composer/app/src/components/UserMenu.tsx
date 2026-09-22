import { SidebarUserCard, usePanelClose } from '@molecule/app-ui-react'

import { SettingsPanel } from './SettingsPanel.js'

function UserMenuPanel() {
  return <SettingsPanel onClose={usePanelClose()} />
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
