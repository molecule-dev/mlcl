import { useState } from 'react'
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
export default function BotDeployTopNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  return (
    <header
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between' }),
        cm.sp('px', 8),
        cm.h(16),
        'fixed top-0 right-0 left-64 bg-background/70 backdrop-blur-xl z-40',
      )}
    >
      <div className={cm.cn(cm.flex1, cm.maxW('md'))}>
        <div className={cm.cn('relative')}>
          <input
            className={cm.cn(
              cm.w('full'),
              cm.sp('py', 2),
              cm.sp('pl', 10),
              cm.sp('pr', 4),
              cm.textSize('sm'),
              'bg-surface-container-high border-none rounded-xl focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-on-surface-variant/60',
            )}
            placeholder={t(
              'botDeployTopNavBar.searchPlaceholder',
              {},
              { defaultValue: 'Search resources...' },
            )}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span
            className={cm.cn(
              'material-symbols-outlined text-xl absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60',
            )}
          >
            search
          </span>
        </div>
      </div>
      <div className={cm.flex({ align: 'center', gap: 'lg' })}>
        <div className={cm.flex({ gap: 'md' })}>
          <button
            className={cm.cn('text-on-surface-variant hover:text-primary transition-colors')}
            onClick={() => setNotificationsOpen((o) => !o)}
            aria-pressed={notificationsOpen}
          >
            <span className={cm.cn('material-symbols-outlined')}>notifications</span>
          </button>
          <Link
            className={cm.cn('text-on-surface-variant hover:text-primary transition-colors')}
            to="/help"
          >
            <span className={cm.cn('material-symbols-outlined')}>help_outline</span>
          </Link>
        </div>
        <Link
          className={cm.cn(
            'bg-primary text-white font-bold text-sm px-5 py-2 rounded-lg hover:shadow-lg hover:shadow-primary/20 transition-all',
          )}
          to="/bots/:id/deploy"
        >
          {t('botDeployTopNavBar.deployBot', {}, { defaultValue: 'Deploy Bot' })}
        </Link>
        <div
          className={cm.cn(
            cm.w(10),
            cm.h(10),
            cm.roundedFull,
            'bg-surface-container-highest overflow-hidden',
          )}
        >
          <img
            alt={t('botDeployTopNavBar.profileImageAlt', {}, { defaultValue: 'User profile' })}
            className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
            src="https://picsum.photos/seed/BotDeployTopNavBar-1/1200/800"
          />
        </div>
      </div>
      <div
        className={cm.cn(
          'h-px',
          'absolute bottom-0 left-0 right-0 bg-gradient-to-r from-transparent via-surface-container-high to-transparent',
        )}
      ></div>
    </header>
  )
}
export { BotDeployTopNavBar }
