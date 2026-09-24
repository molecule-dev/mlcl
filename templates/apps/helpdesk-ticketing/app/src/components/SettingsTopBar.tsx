import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

/**
 * Settings top bar — the shared `ResponsiveAppShell.TopBar` (the mobile menu
 * trigger is the shell's). The Home › Settings breadcrumb is the brand slot;
 * the notifications/help links the actions slot.
 */
export default function SettingsTopBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ResponsiveAppShell.TopBar
      className="w-full h-16 px-4 md:px-8 bg-surface-secondary/80 backdrop-blur-xl"
      brand={
        <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-2')}>
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
      }
      actions={
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
      }
    />
  )
}
export { SettingsTopBar }
