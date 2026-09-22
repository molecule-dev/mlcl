import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import MobileNavMenu, { useMainNavItems } from './MobileNavMenu.js'
import UserMenu from './UserMenu.js'
function TestChatTopBar({ botName, botId }: { botName?: string; botId?: string | number }) {
  const cm = getClassMap()
  const navItems = useMainNavItems()
  const { t } = useTranslation()

  return (
    <header
      className={cm.cn(
        cm.flex({ justify: 'between', align: 'center' }),
        cm.h(16),
        cm.w('full'),
        cm.sp('px', 6),
        cm.textSize('sm'),
        cm.fontWeight('semibold'),
        'sticky top-0 z-40 bg-surface/80 backdrop-blur-md shadow-sm dark:shadow-none font-inter tracking-wide',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-4')}>
        {/* Mobile hamburger + drawer (fleet pattern) */}
        <MobileNavMenu items={navItems} />
        <span className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-foreground')}>
          {t('testChatTopBar.brandName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
        </span>
        <div className={cm.cn(cm.h(4), 'w-px', 'bg-outline-variant/30')}></div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.h(16),
            cm.sp('px', 1),
            'gap-2 text-indigo-600 dark:text-indigo-400',
          )}
        >
          <span
            className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
            data-icon="robot_2"
          >
            robot_2
          </span>
          <span>
            {botName ?? t('testChatTopBar.defaultBotName', {}, { defaultValue: 'Untitled bot' })}
          </span>
        </div>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-3')}>
        <span
          className={cm.cn(
            'px-4 py-1.5 rounded text-indigo-600 dark:text-indigo-400 font-semibold hidden sm:block',
          )}
        >
          {t('common.test', {}, { defaultValue: 'Test' })}
        </span>
        <Link
          className={cm.cn(
            'px-4 py-1.5 rounded-lg bg-primary text-on-primary shadow-sm hover:opacity-90 transition-all hidden sm:block',
          )}
          to={botId ? `/bots/${botId}/deploy` : '/bots'}
        >
          {t('common.deploy', {}, { defaultValue: 'Deploy' })}
        </Link>
        <div className={cm.sp('ml', 2)}>
          <UserMenu />
        </div>
      </div>
    </header>
  )
}

export default TestChatTopBar
export { TestChatTopBar }
