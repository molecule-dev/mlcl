import { A } from '@solidjs/router'
import { Flex } from '@molecule/app-ui-solid'
import { getClassMap } from '@molecule/app-ui'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'
import { APP_NAME, LOGO_SIZE } from '../branding.js'

/**
 * Sticky top app-shell header — logo + appName on the left, actions on the
 * right (`cm.headerFixed` included, matching the shared AppHeader default).
 */
export function Header() {
  const cm = getClassMap()

  return (
    <header class={cm.cn(cm.headerBar, cm.headerFixed)}>
      <div class={cm.headerInner}>
        <Flex align="center" justify="between" className={cm.h('full')}>
          <A href="/">
            <Flex align="center" gap="xs">
              <img src="/logo.svg" width={LOGO_SIZE} height={LOGO_SIZE} alt="" />
              <span class={cm.logoText}>{APP_NAME}</span>
            </Flex>
          </A>
          <Flex align="center" gap="sm">
            <ThemeToggle />
            <UserMenu />
          </Flex>
        </Flex>
      </div>
    </header>
  )
}
