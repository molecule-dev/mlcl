import type { ReactNode } from 'react'

import { AppHeader } from '@molecule/app-header-react'

import { APP_NAME, LOGO_SIZE } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

interface HeaderProps {
  /**
   * Extra actions rendered between the theme toggle and the user menu.
   * The layout passes its mobile hamburger here — it self-hides ≥768px
   * so it never shows on desktop.
   */
  extraActions?: ReactNode
}

export function Header({ extraActions }: HeaderProps) {
  return (
    <AppHeader
      appName={APP_NAME}
      logoSize={LOGO_SIZE}
      themeToggle={<ThemeToggle />}
      extraActions={extraActions}
      userMenu={<UserMenu />}
    />
  )
}
