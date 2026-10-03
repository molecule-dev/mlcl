import { useEffect, useRef, useState } from 'react'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { avatarUrl } from '../utils/avatar.js'

export default function AdminOrdersTopBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth() as { user?: { name?: string; email?: string } }
  const [search, setSearch] = useState('')
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <header
      className={cm.cn(
        cm.flex({ justify: 'between', align: 'center' }),
        cm.sp('px', 6),
        cm.h(16),
        // In-flow page header (AdminLayout's shared shell owns the sticky
        // chrome) — was `fixed top-0 right-0 left-[260px]`, which orphaned it
        // on phones once the fixed rail went away.
        'bg-surface border-b border-border shadow-sm',
      )}
      data-mol-id="admin-header"
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }))}>
        <span
          className={cm.cn(cm.textSize('2xl'), 'font-black text-success')}
          data-mol-id="brand-logo"
        >
          {t('common.brandName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
        </span>
        <span
          className={cm.cn(
            cm.sp('px', 2),
            cm.fontWeight('bold'),
            'py-0.5 bg-surface-secondary text-foreground-secondary text-[10px] rounded uppercase tracking-wider',
          )}
        >
          {t('adminOrdersTopBar.roleLabel', {}, { defaultValue: 'Admin' })}
        </span>
      </div>
      <div className={cm.cn(cm.flex1, cm.maxW('md'), cm.sp('mx', 8), 'hidden md:flex')}>
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
              cm.sp('pl', 10),
              cm.sp('pr', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'bg-surface-secondary border-none rounded-lg focus:ring-2 focus:ring-green-500/20',
            )}
            data-mol-id="global-search"
            placeholder={t(
              'adminOrdersTopBar.searchInputPlaceholder',
              {},
              { defaultValue: 'Search orders...' },
            )}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }))}>
        <div className={cm.cn('relative')} ref={notifRef}>
          <button
            className={cm.cn(
              cm.sp('p', 2),
              cm.roundedFull,
              'relative hover:bg-surface-secondary transition-colors',
            )}
            data-mol-id="notif-btn"
            onClick={() => setNotifOpen((o) => !o)}
            aria-expanded={notifOpen}
          >
            <span
              className={cm.cn('material-symbols-outlined text-foreground-secondary')}
              data-icon="notifications"
            >
              notifications
            </span>
            <span
              className={cm.cn(
                cm.w(2),
                cm.h(2),
                cm.roundedFull,
                'absolute top-2 right-2 bg-red-500 border-2 border-surface',
              )}
            ></span>
          </button>
          {notifOpen && (
            <div
              className={cm.cn(
                cm.w(80),
                cm.sp('p', 4),
                'absolute right-0 mt-2 bg-surface rounded-lg shadow-lg border border-border z-50',
              )}
            >
              <h3
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  cm.sp('mb', 2),
                  'text-foreground',
                )}
              >
                {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
              </h3>
              <p className={cm.cn(cm.textSize('sm'), 'text-foreground-secondary')}>
                {t(
                  'adminOrdersTopBar.noNotificationsMessage',
                  {},
                  { defaultValue: 'No new notifications' },
                )}
              </p>
            </div>
          )}
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 3 }),
            cm.sp('pl', 2),
            'border-l border-border',
          )}
        >
          <img
            alt={t('adminOrdersTopBar.userAvatarAltText', {}, { defaultValue: 'User Profile' })}
            className={cm.cn(cm.w(9), cm.h(9), cm.roundedFull, 'object-cover border border-border')}
            data-mol-id="user-avatar"
            src={avatarUrl(user?.name || user?.email)}
          />
        </div>
      </div>
    </header>
  )
}
export { AdminOrdersTopBar }
