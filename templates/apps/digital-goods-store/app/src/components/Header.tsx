import { AppHeader } from '@molecule/app-header-react'

import { APP_NAME, LOGO_SIZE } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

export function Header() {
  return (
    <AppHeader
      appName={APP_NAME}
      logoSize={LOGO_SIZE}
      fixed={false}
      themeToggle={
        <div className="text-on-surface-variant hover:text-on-surface transition-colors rounded-lg hover:bg-surface-container">
          <ThemeToggle />
        </div>
      }
      userMenu={
        <div className="text-on-surface-variant hover:text-on-surface transition-colors">
          <UserMenu />
        </div>
      }
    />
  )
}
