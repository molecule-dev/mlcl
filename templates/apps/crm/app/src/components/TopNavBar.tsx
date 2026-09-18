import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function TopNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  return (
    <header
      className={cm.cn(
        cm.w('full'),
        cm.flex({ align: 'center', justify: 'between' }),
        cm.sp('px', 6),
        cm.textSize('sm'),
        "h-14 bg-background font-['Inter'] tracking-tight sticky top-0 z-10",
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-4')}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.sp('px', 3),
            'py-1.5 bg-surface-container-high rounded text-on-surface-variant',
          )}
        >
          <span className={cm.cn(cm.textSize('sm'), cm.sp('mr', 2), 'material-symbols-outlined')}>
            search
          </span>
          <input
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('p', 0),
              cm.w(64),
              'bg-transparent border-none focus:ring-0',
            )}
            placeholder={t(
              'topNavBar.searchPlaceholder',
              {},
              { defaultValue: 'Search resources...' },
            )}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-4')}>
        <button
          className={cm.cn(
            cm.sp('p', 2),
            'text-on-background opacity-70 hover:bg-surface-container-low transition-colors rounded',
          )}
          onClick={() => setNotificationsOpen((o) => !o)}
          aria-expanded={notificationsOpen}
        >
          <span className={cm.fv5b245ffa}>notifications</span>
        </button>
        <button
          className={cm.cn(
            cm.sp('p', 2),
            'text-on-background opacity-70 hover:bg-surface-container-low transition-colors rounded',
          )}
          onClick={() => setAccountOpen((o) => !o)}
          aria-expanded={accountOpen}
        >
          <span className={cm.fv5b245ffa}>account_circle</span>
        </button>
      </div>
    </header>
  )
}

export default TopNavBar
export { TopNavBar }
