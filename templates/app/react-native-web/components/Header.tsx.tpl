import { Link } from 'react-router'
import { Flex } from '@molecule/app-ui-react-native'
import { getClassMap } from '@molecule/app-ui'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'
import { APP_NAME, LOGO_SIZE } from '../branding.js'

export function Header() {
  const cm = getClassMap()
  return (
    <header className={cm.headerBar}>
      <div className={cm.headerInner}>
        <Flex align="center" justify="between" className={cm.h('full')}>
          <Link to="/">
            <Flex align="center" gap="xs">
              <img src="/logo.svg" width={LOGO_SIZE} height={LOGO_SIZE} alt="" />
              <span className={cm.logoText}>{APP_NAME}</span>
            </Flex>
          </Link>
          <Flex align="center" gap="sm">
            <ThemeToggle />
            <UserMenu />
          </Flex>
        </Flex>
      </div>
    </header>
  )
}
