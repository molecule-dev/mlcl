import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function BotsListTopNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  return (
    <header
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between' }),
        cm.sp('px', 8),
        cm.h(16),
        'sticky top-0 z-30 bg-background/70 backdrop-blur-xl',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center' }), cm.flex1, 'gap-4')}>
        <h1
          className={cm.cn(
            cm.textSize('lg'),
            cm.fontWeight('bold'),
            'tracking-tight text-on-surface',
          )}
        >
          {t('botsListTopNavBar.pageTitle', {}, { defaultValue: 'My Bots' })}
        </h1>
        <div className={cm.cn(cm.w('full'), cm.maxW('md'), 'relative')}>
          <span
            className={cm.cn(
              cm.textSize('xl'),
              'material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant',
            )}
          >
            search
          </span>
          <input
            className={cm.cn(
              cm.w('full'),
              cm.sp('pl', 10),
              cm.sp('pr', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'bg-surface-container-highest border-none rounded-lg focus:ring-2 focus:ring-primary/40 focus:bg-surface-container-lowest transition-all',
            )}
            placeholder={t(
              'botsListTopNavBar.searchPlaceholder',
              {},
              { defaultValue: 'Search your bots...' },
            )}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-6')}>
        <button
          type="button"
          aria-expanded={notificationsOpen}
          className={cm.cn(
            cm.sp('p', 2),
            'material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors',
          )}
          onClick={() => setNotificationsOpen((o) => !o)}
        >
          notifications
        </button>
        <button
          className={cm.cn(
            cm.sp('p', 2),
            'material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors',
          )}
          onClick={() => navigate('/profile')}
        >
          account_circle
        </button>
        <Link
          to="/bots/new"
          className={cm.cn(
            'btn-gradient text-on-primary px-5 py-2 rounded-full font-bold text-sm flex items-center gap-2 active:scale-95 transition-transform',
          )}
        >
          <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>add</span>
          {t('botsListTopNavBar.createBot', {}, { defaultValue: 'Create Bot' })}
        </Link>
      </div>
    </header>
  )
}

export default BotsListTopNavBar
export { BotsListTopNavBar }
