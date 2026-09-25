import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function SettingsTopAppBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const notificationsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <>
      {/* TopAppBar — in-flow page header under the shared shell (the shell
          carries the user menu; the user-menu link in the account panel and
          the sidebar nav cover the rest of what the fixed bar used to do). */}
      <header
        className={cm.cn(
          cm.flex({ justify: 'between', align: 'center' }),
          cm.sp('px', 5),
          'md:px-16 h-16',
        )}
      >
        <h2
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            'text-on-background tracking-tight',
          )}
        >
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h2>
        <div className={cm.flex({ align: 'center', gap: 'lg' })}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'md' }),
              'text-on-surface-variant relative',
            )}
            ref={notificationsRef}
          >
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className={cm.cn('material-symbols-outlined hover:opacity-80 transition-opacity')}
            >
              notifications
            </button>
            {isNotificationsOpen && (
              <div
                className={cm.cn(
                  cm.sp('mt', 2),
                  cm.sp('p', 4),
                  'absolute right-0 top-full w-80 bg-surface shadow-lg rounded-lg border border-border z-50',
                )}
              >
                <p className={cm.cn(cm.textSize('sm'), 'text-foreground-secondary')}>
                  {t(
                    'settingsTopAppBar.noNotifications',
                    {},
                    { defaultValue: 'No new notifications' },
                  )}
                </p>
              </div>
            )}
            <Link
              className={cm.cn('material-symbols-outlined hover:opacity-80 transition-opacity')}
              to="/help"
            >
              help_outline
            </Link>
          </div>
        </div>
      </header>
    </>
  )
}

export default SettingsTopAppBar
export { SettingsTopAppBar }
