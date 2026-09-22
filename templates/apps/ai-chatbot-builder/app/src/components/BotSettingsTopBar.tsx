import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import MobileNavMenu, { useMainNavItems } from './MobileNavMenu.js'
import UserMenu from './UserMenu.js'

interface BotSettingsTopBarProps {
  botName?: string
}
function BotSettingsTopBar({ botName }: BotSettingsTopBarProps) {
  const cm = getClassMap()
  const navItems = useMainNavItems()
  const { t } = useTranslation()

  return (
    <header
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between' }),
        cm.sp('px', 8),
        'fixed top-0 right-0 left-0 md:left-64 h-16 bg-background z-10',
      )}
    >
      {/* Mobile hamburger + drawer (fleet pattern) */}
      <MobileNavMenu items={navItems} />
      <div className={cm.flex({ align: 'center' })}>
        <h2
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('lg'),
            'font-headline tracking-tight text-on-surface',
          )}
        >
          {t('botSettingsTopBar.title', {}, { defaultValue: 'Bot Settings' })}
        </h2>
        <div className={cm.cn(cm.sp('mx', 4), 'h-4 w-px bg-outline-variant/30')}></div>
        <span
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-on-surface-variant')}
        >
          {botName || t('botSettingsTopBar.untitledBot', {}, { defaultValue: 'Untitled bot' })}
        </span>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-6')}>
        <Link
          to="/notifications"
          aria-label={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          className={cm.cn('text-on-surface-variant hover:text-primary transition-colors')}
        >
          <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
            notifications
          </span>
        </Link>
        <Link
          to="/help"
          aria-label={t('botSettingsTopBar.help', {}, { defaultValue: 'Help' })}
          className={cm.cn('text-on-surface-variant hover:text-primary transition-colors')}
        >
          <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
            help
          </span>
        </Link>
        <UserMenu />
      </div>
    </header>
  )
}

export default BotSettingsTopBar
export { BotSettingsTopBar }
