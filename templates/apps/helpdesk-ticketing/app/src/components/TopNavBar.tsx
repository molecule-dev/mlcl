import { useState } from 'react'
import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { MobileNavHamburger } from './MobileNavDrawer.js'
import { UserMenu } from './UserMenu.js'

function TopNavBar() {
  const cm = getClassMap()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [search, setSearch] = useState('')

  return (
    <header
      className={cm.cn(
        cm.flex({ justify: 'between', align: 'center' }),
        cm.sp('px', 8),
        cm.h(16),
        'fixed top-0 right-0 left-0 md:left-[240px] z-40 bg-surface/80 backdrop-blur-xl shadow-sm dark:shadow-none',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center' }), cm.flex1, 'gap-3 md:gap-8 min-w-0')}>
        <MobileNavHamburger />
        <div className={cm.cn(cm.w('full'), 'max-w-[10rem] sm:max-w-md relative min-w-0')}>
          <span
            className={cm.cn(
              cm.textSize('lg'),
              'material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary',
            )}
            data-icon="search"
          >
            search
          </span>
          <input
            className={cm.cn(
              cm.w('full'),
              cm.textSize('sm'),
              cm.sp('pl', 10),
              cm.sp('pr', 4),
              cm.sp('py', 2),
              'bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 transition-all',
            )}
            placeholder={t(
              'topNavBar.searchHint',
              {},
              { defaultValue: 'Search tickets, customers, or articles...' },
            )}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && search.trim()) {
                // The Tickets page consumes ?q=… as the initial subject
                // filter so the dashboard search lands somewhere with a
                // visible result set instead of bouncing through a 404.
                navigate(`/tickets?q=${encodeURIComponent(search.trim())}`)
              }
            }}
          />
        </div>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }))}>
        <button
          className={cm.cn(
            cm.sp('p', 2),
            cm.roundedFull,
            'text-foreground-secondary hover:opacity-90 transition-colors',
          )}
          aria-label={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          onClick={() => navigate('/notifications')}
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="notifications">
            notifications
          </span>
        </button>
        <UserMenu />
        <button
          className={cm.cn(
            cm.sp('px', 5),
            cm.fontWeight('semibold'),
            cm.textSize('sm'),
            cm.sp('py', 2),
            'bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-xl hover:opacity-90 transition-opacity active:scale-95 duration-150',
          )}
          onClick={() => navigate('/tickets/new')}
        >
          {t('topNavBar.newTicket', {}, { defaultValue: 'New Ticket' })}
        </button>
      </div>
    </header>
  )
}

export default TopNavBar
export { TopNavBar }
