import { SidebarUserCard, usePanelClose } from '@molecule/app-ui-react'

import { SettingsPanel } from './SettingsPanel.js'

function UserMenuPanel() {
  return <SettingsPanel onClose={usePanelClose()} />
}

export function UserMenu() {
  return (
    <SidebarUserCard ariaLabelKey="userMenu.open">
      <UserMenuPanel />
    </SidebarUserCard>
  )
}
