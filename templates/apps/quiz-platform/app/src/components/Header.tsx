import { AppHeader } from '@molecule/app-header-react'

import { APP_NAME, LOGO_SIZE } from '../branding.js'
import { MainNavLinks } from './MainNav.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

export function Header() {
  return (
    <AppHeader
      appName={APP_NAME}
      logoSize={LOGO_SIZE}
      themeToggle={<ThemeToggle />}
      extraActions={<MainNavLinks />}
      userMenu={<UserMenu />}
    />
  )
}
