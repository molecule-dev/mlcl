import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { UserMenu } from './UserMenu.js'
function TransactionDetailTopNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
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
    <>
      {/* TopNavBar Component */}
      <header
        className={cm.cn(
          cm.flex({ justify: 'between', align: 'center' }),
          cm.sp('px', 8),
          cm.sp('py', 4),
          cm.w('full'),
          'sticky top-0 z-40 bg-surface/80 backdrop-blur-xl',
        )}
      >
        <div></div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }))}>
          <div className={cm.cn(cm.flex({ align: 'center' }), 'relative')}>
            <span
              className={cm.cn(
                cm.textSize('sm'),
                'material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary',
              )}
            >
              search
            </span>
            <input
              className={cm.cn(
                cm.sp('py', 2),
                cm.sp('pl', 10),
                cm.sp('pr', 4),
                cm.textSize('sm'),
                cm.roundedFull,
                cm.w(64),
                'bg-surface-container-low border-none font-label focus:ring-1 focus:ring-primary',
              )}
              placeholder={t(
                'topNav.searchPlaceholder',
                {},
                { defaultValue: 'Search transactions...' },
              )}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter')
                  navigate(`/transactions?search=${encodeURIComponent(search)}`)
              }}
            />
          </div>
          <div
            className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'text-foreground-secondary')}
          >
            <div className={cm.cn('relative')} ref={notificationsRef}>
              <button
                className={cm.cn(
                  cm.sp('p', 2),
                  cm.roundedFull,
                  'text-foreground-secondary hover:opacity-70 transition-opacity',
                )}
                data-icon="notifications"
                onClick={() => setNotificationsOpen((o) => !o)}
              >
                <span className={cm.cn('material-symbols-outlined')}>notifications</span>
              </button>
              {notificationsOpen && (
                <div
                  className={cm.cn(
                    cm.sp('mt', 2),
                    cm.w(64),
                    cm.sp('p', 4),
                    'absolute right-0 bg-surface rounded-md shadow-lg z-50 border border-border',
                  )}
                >
                  <div className={cm.cn(cm.fontWeight('bold'), cm.sp('mb', 2), 'text-foreground')}>
                    {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
                  </div>
                  <div className={cm.cn(cm.textSize('sm'), 'text-foreground-secondary')}>
                    {t('notifications.empty', {}, { defaultValue: 'No new notifications' })}
                  </div>
                </div>
              )}
            </div>
            <UserMenu />
          </div>
        </div>
      </header>
    </>
  )
}

export default TransactionDetailTopNavBar
export { TransactionDetailTopNavBar }
