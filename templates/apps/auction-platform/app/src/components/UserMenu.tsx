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
 * Sidebar-resident account card. `className` lands on the popover ROOT (a
 * flex item in the shell's chrome row) — pass `min-w-0 …` where the row is
 * narrow (mobile top bar) so the name/email truncate instead of clipping
 * past the viewport edge.
 */
export function UserMenu({ className }: { className?: string }) {
  return (
    <SidebarUserCard ariaLabelKey="userMenu.open" className={className}>
      <UserMenuPanel />
    </SidebarUserCard>
  )
}
