import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import UserMenu from './UserMenu.js'

function BotAnalyticsTopBar() {
  const { t } = useTranslation()
  const cm = getClassMap()
  const [search, setSearch] = useState('')
  const [dateOpen, setDateOpen] = useState(false)
  const dateRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!dateOpen) return
    const handler = (e: MouseEvent) => {
      if (dateRef.current && !dateRef.current.contains(e.target as Node)) setDateOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dateOpen])

  return (
    <header
      className={cm.cn(
        cm.flex({ justify: 'between', align: 'center' }),
        cm.sp('px', 8),
        cm.h(16),
        cm.w('full'),
        'fixed top-0 right-0 left-64 z-40 bg-surface/70 backdrop-blur-xl shadow-[0_40px_60px_-5px_rgba(24,20,69,0.04)]',
      )}
      data-mol-id="topbar-01"
    >
      <div className={cm.flex({ align: 'center', gap: 'md' })}>
        <h1
          className={cm.cn(
            cm.textSize('lg'),
            'font-extrabold bg-gradient-to-r from-primary to-tertiary-fixed-dim bg-clip-text text-transparent',
          )}
        >
          {t('botAnalyticsTopBar.title', {}, { defaultValue: 'Analytics Dashboard' })}
        </h1>
        <div className={cm.cn(cm.h(6), 'w-px', cm.sp('ml', 2), 'bg-outline-variant/30')}></div>
        <button
          type="button"
          ref={dateRef}
          aria-expanded={dateOpen}
          aria-label={t(
            'botAnalyticsTopBar.dateRangeAriaLabel',
            {},
            { defaultValue: 'Change date range' },
          )}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 4),
            cm.cursorPointer,
            cm.roundedFull,
            'relative bg-surface-container-high py-1.5 hover:bg-surface-variant transition-colors group',
          )}
          onClick={() => setDateOpen((o) => !o)}
        >
          <span className={cm.cn(cm.textSize('sm'), cm.textPrimary, 'material-symbols-outlined')}>
            calendar_today
          </span>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'text-on-surface-variant',
            )}
          >
            {t(
              'botAnalyticsTopBar.lastNDays',
              { days: 30 },
              { defaultValue: 'Last {{days}} Days' },
            )}
          </span>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              'material-symbols-outlined text-outline group-hover:translate-y-0.5 transition-transform',
            )}
          >
            expand_more
          </span>
        </button>
      </div>
      <div className={cm.flex({ align: 'center', gap: 'lg' })}>
        <div
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.w(64),
            cm.roundedFull,
            'hidden md:flex items-center bg-surface-container-high focus-within:ring-2 focus-within:ring-primary/20 transition-all',
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
    </header>
  )
}

export default BotAnalyticsTopBar
export { BotAnalyticsTopBar }
