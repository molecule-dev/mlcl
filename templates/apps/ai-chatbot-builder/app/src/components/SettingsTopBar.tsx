import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import MobileNavMenu, { useMainNavItems } from './MobileNavMenu.js'
import UserMenu from './UserMenu.js'

function SettingsTopBar() {
  const cm = getClassMap()
  const navItems = useMainNavItems()
  const { t } = useTranslation()
  const { user } = useAuth<{ name?: string; email?: string; role?: string; avatarUrl?: string }>()
  const [q, setQ] = useState('')
  const navigate = useNavigate()

  return (
    <header
      className={cm.cn(
        cm.flex({ justify: 'between', align: 'center' }),
        cm.sp('px', 8),
        'fixed top-0 right-0 left-0 md:left-64 w-full md:w-[calc(100%-16rem)] h-16 z-50 bg-surface/70 backdrop-blur-md no-border shadow-[0_40px_60px_-5px_rgba(24,20,69,0.04)]',
      )}
    >
      {/* Mobile hamburger + drawer (fleet pattern) */}
      <MobileNavMenu items={navItems} />
      <div className={cm.cn(cm.flex1, 'max-w-xl pr-8')}>
        <div className={cm.cn(cm.w('full'), 'relative')}>
          <span
            className={cm.cn(
              'pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant/50',
            )}
            data-icon="search"
          >
            search
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className={cm.cn(
              cm.w('full'),
              cm.sp('pl', 10),
              cm.sp('pr', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'rounded-xl border-none bg-surface-container-high text-on-surface placeholder:text-on-surface-variant/60 focus:ring-2 focus:ring-primary/20',
            )}
            placeholder={t(
              'settingsTopBar.searchPlaceholder',
              {},
              { defaultValue: 'Search bots, integrations, settings…' },
            )}
            type="search"
            aria-label={t('common.search', {}, { defaultValue: 'Search' })}
          />
        </div>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center' }), 'shrink-0 gap-4')}>
        <Link
          to="/notifications"
          aria-label={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          className={cm.cn(
            cm.sp('p', 2),
            'rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined text-[22px]')}
            data-icon="notifications"
          >
            notifications
          </span>
        </Link>
        <button
          type="button"
          onClick={() => navigate('/help')}
          aria-label={t('settingsTopBar.help', {}, { defaultValue: 'Help' })}
          className={cm.cn(
            cm.sp('p', 2),
            'rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-[22px]')} data-icon="help">
            help
          </span>
        </button>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
          <div className={cm.textRight}>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                "font-['Plus_Jakarta_Sans'] leading-none",
              )}
            >
              {user?.name ||
                user?.email ||
                t('userMenu.guestName', {}, { defaultValue: 'Account' })}
            </p>
            {user?.name && user?.email ? (
              <p
                className={cm.cn(
                  cm.fontWeight('medium'),
                  cm.sp('mt', 1),
                  'text-[10px] text-on-surface-variant tracking-tight',
                )}
              >
                {user.email}
              </p>
            ) : null}
          </div>
          <UserMenu />
        </div>
      </div>
    </header>
  )
}

export default SettingsTopBar
export { SettingsTopBar }
