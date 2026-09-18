import { useState } from 'react'
import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function DashboardTopBar() {
  const cm = getClassMap()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [, setNotificationsOpen] = useState(false)
  return (
    <header
      className={cm.cn(
        cm.flex({ justify: 'between', align: 'center' }),
        cm.sp('px', 8),
        cm.w('full'),
        cm.shrink0,
        'h-16 sticky top-0 z-40 bg-surface/80 backdrop-blur-md border-b border-border',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center' }), cm.flex1, cm.maxW('xl'))}>
        <div className={cm.cn(cm.w('full'), 'relative')}>
          <span
            className={cm.cn(
              cm.textSize('lg'),
              'material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary',
            )}
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
              'bg-surface-container-low border-none rounded-full focus:ring-2 focus:ring-primary/20 placeholder:text-foreground-tertiary',
            )}
            placeholder={t(
              'dashboardTopBar.searchPlaceholder',
              {},
              { defaultValue: 'Search deals, contacts, or tasks...' },
            )}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-4')}>
        <button
          aria-label={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          className={cm.cn(
            cm.sp('p', 2),
            'text-foreground-secondary hover:bg-surface-secondary rounded-full transition-all relative',
          )}
          data-mol-id="btn-notifications"
          onClick={() => setNotificationsOpen((o) => !o)}
        >
          <span className={cm.fv5b245ffa}>notifications</span>
          <span
            className={cm.cn(
              cm.w(2),
              cm.h(2),
              'absolute top-2 right-2.5 bg-error rounded-full border-2 border-surface',
            )}
          ></span>
        </button>
        <button
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            cm.flex({ align: 'center' }),
            'bg-primary text-white rounded-full gap-2 hover:opacity-90 active:opacity-80 transition-all shadow-sm',
          )}
          data-mol-id="btn-new-contact"
          onClick={() => navigate('/contacts/new')}
        >
          <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>add</span>
          {t('dashboardTopBar.newContact', {}, { defaultValue: 'New Contact' })}
        </button>
      </div>
    </header>
  )
}

export default DashboardTopBar
export { DashboardTopBar }
