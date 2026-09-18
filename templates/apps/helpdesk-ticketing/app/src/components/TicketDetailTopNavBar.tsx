import { useState } from 'react'
import { useNavigate } from 'react-router'

import { useTheme, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * Top nav for ticket-detail. Honors the design two-icon layout
 * (notifications + theme) on the right and a search input + "Tickets"
 * back link on the left. The original baseline shipped a dead "Active"
 * tab that only toggled local state — we drop it because there is no
 * matching route in the SPA.
 */
function TicketDetailTopNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const handleThemeToggle = () => setTheme(theme?.mode === 'dark' ? 'light' : 'dark')
  return (
    <header
      className={cm.cn(
        cm.flex({ justify: 'between', align: 'center' }),
        cm.h(16),
        cm.sp('px', 8),
        'fixed top-0 right-0 left-[240px] bg-surface/80 backdrop-blur-xl shadow-sm dark:shadow-none z-40',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 8 }))}>
        <div className={cm.cn('relative group')}>
          <span
            className={cm.cn(
              'material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors',
            )}
            data-icon="search"
          >
            search
          </span>
          <input
            className={cm.cn(
              cm.sp('pl', 10),
              cm.sp('pr', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.w(64),
              'bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 transition-all',
            )}
            data-mol-id="global-search"
            placeholder={t(
              'ticketDetailTopNavBar.searchTickets',
              {},
              { defaultValue: 'Search tickets...' },
            )}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && search.trim()) {
                navigate(`/tickets?q=${encodeURIComponent(search.trim())}`)
              }
            }}
          />
        </div>
        <nav className={cm.cn(cm.flex({ align: 'center', gap: 6 }))}>
          <button
            type="button"
            className={cm.cn(
              cm.fontWeight('medium'),
              cm.textSize('sm'),
              cm.cursorPointer,
              cm.sp('pb', 5),
              'border-b-2 border-sky-600 dark:border-sky-400 text-sky-600 dark:text-sky-400',
            )}
            data-mol-id="tab-tickets"
            onClick={() => navigate('/tickets')}
          >
            {t('ticketDetailTopNavBar.tickets', {}, { defaultValue: 'Tickets' })}
          </button>
        </nav>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 5 }))}>
        <button
          className={cm.cn(
            cm.sp('p', 2),
            cm.roundedFull,
            'text-foreground-tertiary hover:bg-surface-secondary transition-colors',
          )}
          aria-label={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          data-mol-id="btn-notifications"
          onClick={() => navigate('/notifications')}
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="notifications">
            notifications
          </span>
        </button>
        <button
          className={cm.cn(
            cm.sp('p', 2),
            cm.roundedFull,
            'text-foreground-tertiary hover:bg-surface-secondary transition-colors',
          )}
          aria-label={t('theme.toggle', {}, { defaultValue: 'Toggle theme' })}
          data-mol-id={'btn-theme'}
          onClick={handleThemeToggle}
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="contrast">
            contrast
          </span>
        </button>
        <div className={cm.cn(cm.h(8), cm.sp('mx', 2), 'w-[1px] bg-surface-secondary')}></div>
        <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-cyan-700')}>
          {t('common.appName', { appName: APP_NAME }, { defaultValue: '{{appName}} Support' })}
        </span>
      </div>
    </header>
  )
}

export default TicketDetailTopNavBar
export { TicketDetailTopNavBar }
