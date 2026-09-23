import { AppHeader } from '@molecule/app-header-react'

import { APP_NAME, LOGO_SIZE } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

export function Header() {
  return (
    <AppHeader
      appName={APP_NAME}
      logoSize={LOGO_SIZE}
      themeToggle={<ThemeToggle />}
      // Nudge the shared UserMenu trigger to a 36px+ tap target (fleet QA:
      // the bare trigger is ~24px — under the 40px mobile target floor).
      userMenu={
        <span className="inline-flex [&_button]:min-h-[36px] [&_button]:min-w-[36px]">
          <UserMenu />
        </span>
      }
    />
  )
}
