import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { useIsMobile } from '../lib/use-is-mobile.js'
import { MobileNavShell } from './MobileNavShell.js'
import { buildNavItems } from './nav-items.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

export function VotingPollingLayout() {
  const { t } = useTranslation()
  const isMobile = useIsMobile()

  // Below md (768px) the shared SidebarLayout's fixed rail crushes the
  // content column, so the template-local sticky-top-bar + drawer shell
  // takes over (fleet mobile-shell pattern — conditionally rendered, never
  // CSS-hidden, so nav data-mol-ids are never duplicated in the DOM).
  if (isMobile) {
    return <MobileNavShell />
  }

  const navItems = buildNavItems(t)
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/dashboard"
      navItems={navItems}
      // Both slots styled — without the wrappers the sidebar footer renders
      // the controls as bare browser controls on the bordered row.
      userMenu={
        <div className="text-on-surface-variant hover:text-on-surface transition-colors">
          <UserMenu />
        </div>
      }
      themeToggle={
        <div className="text-on-surface-variant hover:text-on-surface transition-colors rounded-lg hover:bg-surface-container">
          <ThemeToggle />
        </div>
      }
      navAriaLabel={t(
        'votingPollingLayout.primaryNavLabel',
        {},
        { defaultValue: 'Primary navigation' },
      )}
    />
  )
}
