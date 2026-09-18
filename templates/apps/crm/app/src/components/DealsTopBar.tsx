import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function DealsTopBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [notifsEnabled, setNotifsEnabled] = useState(true)

  return (
    <header
      className={cm.cn(
        cm.flex({ justify: 'between', align: 'center' }),
        cm.sp('px', 6),
        cm.textSize('sm'),
        cm.h(16),
        "bg-surface/80 backdrop-blur-md shadow-sm sticky top-0 z-50 font-['Inter'] antialiased tracking-tight",
      )}
      data-mol-id="top-nav"
    >
      <div className={cm.cn(cm.flex({ align: 'center' }), cm.flex1, 'gap-4')}>
        <div className={cm.cn(cm.w(96), cm.maxW('md'), 'relative')}>
          <span className={cm.fvf3f0b9f4}>search</span>
          <input
            className={cm.cn(
              cm.w('full'),
              cm.sp('pl', 10),
              cm.sp('pr', 4),
              cm.sp('py', 2),
              cm.textSize('xs'),
              cm.roundedFull,
              'bg-surface-secondary border-none focus:ring-2 focus:ring-primary/20 transition-all',
            )}
            placeholder={t(
              'dealsTopBar.searchPlaceholder',
              {},
              { defaultValue: 'Search deals, companies, or contacts...' },
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
            cm.flex({ align: 'center' }),
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            'bg-primary text-white rounded-lg hover:bg-primary-container active:scale-95 transition-all gap-2',
          )}
          data-mol-id="action-new-deal"
          onClick={() => navigate('/deals/new')}
        >
          <span className={cm.fv5b245ffa} style={{ fontSize: '18px' }}>
            add
          </span>
          {t('dealsTopBar.newDeal', {}, { defaultValue: 'New Deal' })}
        </button>
        <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-2 text-foreground-secondary')}>
          <button
            className={cm.cn(
              cm.sp('p', 2),
              cm.roundedFull,
              'hover:bg-surface-secondary transition-colors',
            )}
            data-mol-id="icon-notif"
            onClick={() => setNotifsEnabled((v) => !v)}
            aria-pressed={notifsEnabled}
          >
            <span className={cm.fv5b245ffa}>
              {notifsEnabled ? 'notifications' : 'notifications_off'}
            </span>
          </button>
          <button
            className={cm.cn(
              cm.sp('p', 2),
              cm.roundedFull,
              'hover:bg-surface-secondary transition-colors',
            )}
            data-mol-id="icon-help"
            onClick={() => {
              /* TODO: wire when help route exists */
            }}
          >
            <span className={cm.fv5b245ffa}>help</span>
          </button>
          <Link className={cm.fv64c9d35b} data-mol-id="icon-settings" to="/settings">
            <span className={cm.fv5b245ffa}>settings</span>
          </Link>
        </div>
        <div className={cm.cn(cm.h(8), cm.sp('mx', 2), 'w-[1px] bg-border')}></div>
        <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-3')}>
          <img
            alt={t('dealsTopBar.userProfileAlt', {}, { defaultValue: 'User Profile' })}
            className={cm.cn(cm.roundedFull, 'h-9 w-9 object-cover border-2 border-primary/10')}
            data-alt="professional portrait of a high-end corporate executive woman in a soft-lit office background with warm skin tones"
            src="https://picsum.photos/seed/DealsTopBar-1/1200/800"
          />
        </div>
      </div>
    </header>
  )
}

export default DealsTopBar
export { DealsTopBar }
