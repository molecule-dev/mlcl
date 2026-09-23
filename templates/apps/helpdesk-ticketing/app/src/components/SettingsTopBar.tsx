import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { MobileNavHamburger } from './MobileNavDrawer.js'

export default function SettingsTopBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <header
      className={cm.cn(
        cm.flex({ justify: 'between', align: 'center' }),
        cm.h(16),
        cm.sp('px', 8),
        cm.w('full'),
        'sticky top-0 z-10 bg-surface-secondary/80 backdrop-blur-xl',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-2')}>
        <MobileNavHamburger />
        <Link
          to="/"
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('medium'),
            'text-on-surface-variant hover:text-on-surface transition-colors',
          )}
        >
          {t('common.home', {}, { defaultValue: 'Home' })}
        </Link>
        <span
          className={cm.cn(cm.textSize('xs'), 'material-symbols-outlined text-outline-variant')}
        >
          chevron_right
        </span>
        <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), cm.textPrimary)}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </span>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-1')}>
        <Link
          to="/notifications"
          className={cm.cn(
            cm.sp('p', 2),
            cm.roundedFull,
            'text-foreground-secondary hover:text-sky-600 hover:bg-surface-container-high transition-all',
          )}
          aria-label={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="notifications">
            notifications
          </span>
        </Link>
        <Link
          to="/knowledge-base"
          className={cm.cn(
            cm.sp('p', 2),
            cm.roundedFull,
            'text-foreground-secondary hover:text-sky-600 hover:bg-surface-container-high transition-all',
          )}
          aria-label={t('common.help', {}, { defaultValue: 'Help' })}
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="help_outline">
            help_outline
          </span>
        </Link>
      </div>
    </header>
  )
}
export { SettingsTopBar }
