import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
function DealDetailTopBar() {
  const navigate = useNavigate()
  const cm = getClassMap()
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [notificationsOn, setNotificationsOn] = useState(true)
  return (
    <header
      className={cm.cn(
        cm.h(16),
        cm.sp('px', 8),
        cm.flex({ justify: 'between', align: 'center' }),
        'bg-surface-container-low/80 backdrop-blur-md sticky top-0 z-40',
      )}
    >
      <div className={cm.flex({ align: 'center', gap: 'md' })}>
        <button
          type="button"
          className={cm.cn(cm.cursorPointer, 'material-symbols-outlined text-outline')}
          onClick={() => navigate(-1)}
          aria-label={t('dealDetailTopBar.back', {}, { defaultValue: 'Go back' })}
        >
          arrow_back
        </button>
        <nav className={cm.cn(cm.flex({ gap: 'lg' }), cm.textSize('sm'), cm.fontWeight('medium'))}>
          <Link className={cm.fv7ef0d26e} to="/">
            {t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
          </Link>
          <Link className={cm.fvd3cabf96} to="/deals">
            {t('dealDetailTopBar.dealsLink', {}, { defaultValue: 'Deals' })}
          </Link>
        </nav>
      </div>
      <div className={cm.flex({ align: 'center', gap: 'lg' })}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 3),
            cm.roundedFull,
            'py-1.5 bg-surface-container-high',
          )}
        >
          <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>search</span>
          <input
            className={cm.cn(
              cm.textSize('sm'),
              cm.w(48),
              'bg-transparent border-none focus:ring-0',
            )}
            placeholder={t(
              'dealDetailTopBar.searchPlaceholder',
              {},
              { defaultValue: 'Quick Search' },
            )}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          type="button"
          className={cm.cn(
            cm.cursorPointer,
            'material-symbols-outlined text-outline hover:text-primary',
          )}
          onClick={() => setNotificationsOn((v) => !v)}
          aria-pressed={notificationsOn}
          aria-label={t(
            'dealDetailTopBar.toggleNotifications',
            {},
            { defaultValue: 'Toggle notifications' },
          )}
        >
          {notificationsOn ? 'notifications' : 'notifications_off'}
        </button>
        <img
          className={cm.cn(cm.w(8), cm.h(8), cm.roundedFull, 'object-cover')}
          alt=""
          data-alt="portrait of a professional executive man in a grey suit with soft office lighting"
          src="https://picsum.photos/seed/DealDetailTopBar-1/1200/800"
        />
      </div>
    </header>
  )
}

export default DealDetailTopBar
export { DealDetailTopBar }
