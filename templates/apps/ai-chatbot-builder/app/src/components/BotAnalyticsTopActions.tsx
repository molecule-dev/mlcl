/**
 * Analytics top-bar action cluster — search field + notifications link +
 * user menu, rendered inside the shared AppShell's TopBar `actions` slot
 * (BotAnalytics page). The former hand-rolled fixed header (and its dead
 * date-range popover button) is deleted with the shell migration.
 */
import { useState } from 'react'
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { UserMenu } from './UserMenu.js'

export function BotAnalyticsTopActions() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [search, setSearch] = useState('')

  return (
    <div className={cm.flex({ align: 'center', gap: 'md' })}>
      <div
        className={cm.cn(
          cm.sp('px', 4),
          cm.sp('py', 2),
          'hidden md:flex items-center bg-surface-container-high rounded-full focus-within:ring-2 focus-within:ring-primary/20 transition-all w-64',
        )}
      >
        <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined text-outline')}>
          search
        </span>
        <input
          className={cm.cn(
            cm.textSize('sm'),
            cm.w('full'),
            'bg-transparent border-none focus:ring-0 placeholder:text-outline/60',
          )}
          placeholder={t(
            'botAnalyticsTopBar.searchPlaceholder',
            {},
            { defaultValue: 'Search analytics...' },
          )}
          aria-label={t(
            'botAnalyticsTopBar.searchAriaLabel',
            {},
            { defaultValue: 'Search analytics' },
          )}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className={cm.flex({ align: 'center', gap: 'md' })}>
        <Link
          to="/notifications"
          className={cm.cn(
            cm.sp('p', 2),
            'relative text-outline hover:text-primary transition-colors',
          )}
          aria-label={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
        >
          <span className={cm.cn('material-symbols-outlined')}>notifications</span>
        </Link>
        <UserMenu />
      </div>
    </div>
  )
}
