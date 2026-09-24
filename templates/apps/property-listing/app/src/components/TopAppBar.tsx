import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export function TopAppBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isMailOpen, setIsMailOpen] = useState(false)
  const notificationsRef = useRef<HTMLDivElement>(null)
  const mailRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false)
      }
      if (mailRef.current && !mailRef.current.contains(event.target as Node)) {
        setIsMailOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header
      className={cm.cn(
        cm.flex({ justify: 'between', align: 'center' }),
        cm.w('full'),
        cm.sp('pr', 12),
        cm.sp('py', 6),
        'pl-4 sticky top-0 z-30 bg-background/80 backdrop-blur-md',
      )}
    >
      <div className={cm.cn('relative', cm.w(96))}>
        <div
          className={cm.cn(
            cm.roundedFull,
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.flex({ align: 'center', gap: 'md' }),
            'ghost-border bg-surface-container-low transition-all duration-200',
          )}
        >
          <span
            className={cm.cn(
              cm.textSize('sm'),
              'material-symbols-outlined text-on-surface-variant',
            )}
            data-icon="search"
          >
            search
          </span>
          <input
            className={cm.cn(
              cm.textSize('sm'),
              cm.w('full'),
              'bg-transparent border-none outline-none focus:ring-0 placeholder:text-on-surface-variant/60',
            )}
            placeholder={t(
              'topAppBar.searchHint',
              {},
              { defaultValue: 'Search leads by name or property...' },
            )}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }))}>
        <div ref={notificationsRef} className={cm.cn('relative')}>
          <button
            aria-label={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
            className={cm.cn(
              cm.sp('p', 2),
              cm.roundedFull,
              'relative text-on-surface-variant hover:bg-surface-container-low transition-all',
            )}
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
          >
            <span className={cm.cn('material-symbols-outlined')} data-icon="notifications">
              notifications
            </span>
            <span
              className={cm.cn(cm.w(2), cm.h(2), cm.roundedFull, 'absolute top-2 right-2 bg-error')}
            ></span>
          </button>
          {isNotificationsOpen && (
            <div
              className={cm.cn(
                cm.sp('mt', 2),
                cm.sp('p', 4),
                cm.w(80),
                'absolute right-0 bg-surface rounded-lg shadow-lg border border-border z-50',
              )}
            >
              <p className={cm.cn(cm.textSize('sm'), 'text-foreground-secondary')}>
                {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
              </p>
            </div>
          )}
        </div>
        <div ref={mailRef} className={cm.cn('relative')}>
          <button
            aria-label={t('nav.messages', {}, { defaultValue: 'Messages' })}
            className={cm.cn(
              cm.sp('p', 2),
              cm.roundedFull,
              'text-on-surface-variant hover:bg-surface-container-low transition-all',
            )}
            onClick={() => setIsMailOpen(!isMailOpen)}
          >
            <span className={cm.cn('material-symbols-outlined')} data-icon="mail">
              mail
            </span>
          </button>
          {isMailOpen && (
            <div
              className={cm.cn(
                cm.sp('mt', 2),
                cm.sp('p', 4),
                cm.w(80),
                'absolute right-0 bg-surface rounded-lg shadow-lg border border-border z-50',
              )}
            >
              <p className={cm.cn(cm.textSize('sm'), 'text-foreground-secondary')}>
                {t('nav.messages', {}, { defaultValue: 'Messages' })}
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
            cm.sp('ml', 2),
            cm.cursorPointer,
            'overflow-hidden bg-surface-container-high',
          )}
          onClick={() => navigate('/admin/settings')}
        >
          <img
            alt={t('topAppBar.userAvatarAlt', {}, { defaultValue: 'Agent Profile' })}
            className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
            data-alt="professional male portrait of a luxury real estate agent in a tailored suit with a modern architectural background"
            src="https://picsum.photos/seed/TopAppBar-1/1200/800"
          />
        </button>
      </div>
    </header>
  )
}

export default TopAppBar
