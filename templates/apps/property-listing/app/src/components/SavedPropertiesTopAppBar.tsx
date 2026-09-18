import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

export function SavedPropertiesTopAppBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const notificationsRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header
      className={cm.cn('bg-background sticky top-0 z-50 transition-colors duration-200')}
      data-mol-id="nav-01"
    >
      <nav
        className={cm.cn(
          cm.flex({ justify: 'between', align: 'center' }),
          cm.w('full'),
          cm.sp('px', 6),
          cm.sp('py', 4),
          'max-w-7xl',
          cm.mxAuto,
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xl' }))}>
          <Link
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('bold'),
              'font-manrope tracking-tighter text-primary',
            )}
            to="/"
          >
            {t('nav.brand', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
          </Link>
          <div className={cm.cn(cm.flex({ gap: 'xl', align: 'center' }), 'hidden md:flex')}>
            <Link
              className={cm.cn(
                cm.fontWeight('medium'),
                'text-foreground-secondary hover:text-secondary dark:hover:text-blue-400 transition-colors duration-200',
              )}
              to="/"
            >
              {t('common.buy', {}, { defaultValue: 'Buy' })}
            </Link>
            <Link
              className={cm.cn(
                cm.fontWeight('medium'),
                'text-foreground-secondary hover:text-secondary dark:hover:text-blue-400 transition-colors duration-200',
              )}
              to="/"
            >
              {t('common.rent', {}, { defaultValue: 'Rent' })}
            </Link>
            <Link
              className={cm.cn(
                cm.fontWeight('medium'),
                'text-foreground-secondary hover:text-secondary dark:hover:text-blue-400 transition-colors duration-200',
              )}
              to="/"
            >
              {t('common.sold', {}, { defaultValue: 'Sold' })}
            </Link>
          </div>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }))}>
          <div className={cm.cn('relative')} ref={notificationsRef}>
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              aria-label={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
              aria-expanded={notificationsOpen}
              className={cm.cn(
                'material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors',
              )}
            >
              notifications
            </button>
            {notificationsOpen && (
              <div
                className={cm.cn(
                  cm.sp('mt', 2),
                  cm.w(64),
                  cm.sp('p', 4),
                  'absolute right-0 top-full bg-surface rounded-lg shadow-lg border border-border z-50',
                )}
              >
                <p className={cm.cn(cm.textSize('sm'), 'text-foreground-secondary')}>
                  {t('notifications.emptyState', {}, { defaultValue: 'No new notifications' })}
                </p>
              </div>
            )}
          </div>
          <button
            type="button"
            className={cm.cn(
              cm.h(10),
              cm.w(10),
              cm.roundedFull,
              cm.cursorPointer,
              'overflow-hidden border-2 border-primary-fixed',
            )}
            onClick={() => navigate('/saved')}
          >
            <img
              alt={t('user.avatarAlt', {}, { defaultValue: 'User profile avatar' })}
              className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
              data-alt="close-up portrait of a professional man with a friendly expression in a brightly lit modern office setting"
              src="https://picsum.photos/seed/SavedPropertiesTopAppBar-1/1200/800"
            />
          </button>
        </div>
      </nav>
    </header>
  )
}
export default SavedPropertiesTopAppBar
