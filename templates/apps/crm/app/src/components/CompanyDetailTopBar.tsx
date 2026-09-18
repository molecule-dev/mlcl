import { useState } from 'react'
import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
function CompanyDetailTopBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [notificationsActive, setNotificationsActive] = useState(true)
  return (
    <header
      className={cm.cn(
        cm.flex({ justify: 'between', align: 'center' }),
        cm.sp('px', 8),
        cm.w('full'),
        'bg-surface/85 backdrop-blur-xl h-16 docked full-width top-0 sticky z-50 shadow-[0px_12px_32px_rgba(19,47,106,0.06)]',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-8')}></div>
      <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-4')}>
        <div className={cm.fvdef3facc}>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              'material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant',
            )}
            data-icon="search"
          >
            search
          </span>
          <input
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('pl', 10),
              cm.sp('pr', 4),
              cm.w(64),
              'bg-surface-container-high border-none rounded-lg py-1.5 focus:ring-2 focus:ring-primary/40 transition-all',
            )}
            placeholder={t(
              'companyDetailTopBar.searchPlaceholder',
              {},
              { defaultValue: 'Global Search...' },
            )}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && search.trim())
                navigate(`/search?q=${encodeURIComponent(search.trim())}`)
            }}
          />
        </div>
        <button
          className={cm.cn(
            cm.sp('p', 2),
            'rounded-lg hover:bg-surface-secondary/50 text-on-surface-variant transition-colors',
          )}
          onClick={() => setNotificationsActive((v) => !v)}
        >
          <span className={cm.fv5b245ffa} data-icon="notifications">
            {notificationsActive ? 'notifications' : 'notifications_off'}
          </span>
        </button>
        <div
          className={cm.cn(
            cm.w(8),
            cm.h(8),
            cm.roundedFull,
            'overflow-hidden bg-surface-container-highest',
          )}
        >
          <img
            alt={t('companyDetailTopBar.userAvatarAlt', {}, { defaultValue: 'User profile photo' })}
            className={cm.cn(cm.h('full'), cm.w('full'), 'object-cover')}
            data-alt="Professional headshot of a middle-aged executive man with a friendly expression in a modern office environment"
            src="https://picsum.photos/seed/CompanyDetailTopBar-1/1200/800"
          />
        </div>
      </div>
    </header>
  )
}

export default CompanyDetailTopBar
export { CompanyDetailTopBar }
