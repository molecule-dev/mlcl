import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { UserMenu } from './UserMenu.js'
function TopAppBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const notificationsRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false)
      }
    }
    if (notificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [notificationsOpen])
  return (
    <header
      className={cm.cn(
        cm.flex({ justify: 'between', align: 'center' }),
        cm.sp('px', 6),
        cm.sp('py', 4),
        cm.w('full'),
        'bg-surface/80 backdrop-blur-xl docked full-width top-0 z-40 sticky shadow-sm',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.flex1)}>
        <div className={cm.cn(cm.w('full'), cm.maxW('md'), 'relative hidden sm:block')}>
          <span
            className={cm.cn(
              'material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary',
            )}
          >
            search
          </span>
          <input
            className={cm.cn(
              cm.w('full'),
              cm.roundedFull,
              cm.sp('pl', 10),
              cm.sp('pr', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'bg-surface-container-low border-none focus:ring-2 focus:ring-primary/20',
            )}
            placeholder={t(
              'topAppBar.searchPlaceholder',
              {},
              { defaultValue: 'Search transactions...' },
            )}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              navigate(
                search.trim()
                  ? '/transactions?search=' + encodeURIComponent(search.trim())
                  : '/transactions',
              )
            }}
          />
        </div>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
        <Link
          className={cm.cn(
            'bg-primary text-on-primary px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:scale-95 transition-transform duration-150',
          )}
          to="/transactions/new"
        >
          <span className={cm.cn('material-symbols-outlined')}>add</span>
          {t('topAppBar.addTransaction', {}, { defaultValue: 'Add Transaction' })}
        </Link>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('ml', 4),
            cm.sp('pl', 4),
            'border-l border-border',
          )}
        >
          <div className={cm.cn('relative')} ref={notificationsRef}>
            <button
              className={cm.cn(
                cm.sp('p', 2),
                cm.roundedFull,
                'text-foreground-secondary hover:bg-success-light/50 transition-colors',
              )}
              onClick={() => setNotificationsOpen((o) => !o)}
              aria-pressed={notificationsOpen}
              aria-label={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
            >
              <span className={cm.cn('material-symbols-outlined')}>notifications</span>
            </button>
            {notificationsOpen && (
              <div
                className={cm.cn(
                  cm.sp('mt', 2),
                  cm.sp('p', 4),
                  cm.w(80),
                  'absolute right-0 top-full bg-surface rounded-xl shadow-lg border border-border z-50',
                )}
              >
                <h3
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    cm.sp('mb', 2),
                    'text-foreground',
                  )}
                >
                  {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-foreground-secondary')}>
                  {t('topAppBar.noNotifications', {}, { defaultValue: 'No new notifications' })}
                </p>
              </div>
            )}
          </div>
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
export default TopAppBar
export { TopAppBar }
