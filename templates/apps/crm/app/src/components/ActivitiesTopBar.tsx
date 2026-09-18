import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

function ActivitiesTopBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [, setNotificationsOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    if (profileOpen) document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [profileOpen])

  return (
    <header
      className={cm.cn(
        cm.w('full'),
        cm.flex({ align: 'center', justify: 'between' }),
        cm.sp('px', 8),
        cm.sp('py', 3),
        cm.h(16),
        'sticky top-0 z-40 bg-surface/10 backdrop-blur-md shadow-sm',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-8')}>
        <Link to="/" className={cm.fv6ab4645b}>
          {t('activitiesTopBar.appName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
        </Link>
        <div className={cm.cn(cm.w(64), 'relative group')}>
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
              cm.w('full'),
              cm.roundedFull,
              cm.sp('pl', 10),
              cm.sp('pr', 4),
              cm.textSize('sm'),
              'bg-surface-container-low border-none py-1.5 focus:ring-2 focus:ring-primary/20 transition-all',
            )}
            placeholder={t(
              'activitiesTopBar.searchPlaceholder',
              {},
              { defaultValue: 'Global search...' },
            )}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-4')}>
        <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-2')}>
          <button
            className={cm.cn(
              cm.sp('p', 2),
              cm.roundedFull,
              'text-foreground-secondary hover:bg-surface-secondary transition-colors relative',
            )}
            onClick={() => setNotificationsOpen((o) => !o)}
          >
            <span className={cm.fv5b245ffa}>notifications</span>
            <span
              className={cm.cn(cm.w(2), cm.h(2), cm.roundedFull, 'absolute top-2 right-2 bg-error')}
            ></span>
          </button>
          {/* TODO: wire when help panel/docs endpoint exists */}
          <button
            className={cm.cn(
              cm.sp('p', 2),
              cm.roundedFull,
              'text-foreground-secondary hover:bg-surface-secondary transition-colors',
            )}
            onClick={() => {
              // TODO: wire when help panel/docs endpoint exists
            }}
          >
            <span className={cm.fv5b245ffa}>help_outline</span>
          </button>
        </div>
        <div className={cm.cn(cm.h(8), cm.sp('mx', 2), 'w-[1px] bg-border')}></div>
        <button
          ref={profileRef}
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.sp('p', 1),
            cm.sp('pr', 3),
            cm.roundedFull,
            'gap-3 hover:bg-surface-secondary transition-colors',
          )}
          onClick={() => setProfileOpen((o) => !o)}
        >
          <div
            className={cm.cn(
              cm.w(8),
              cm.h(8),
              cm.roundedFull,
              cm.flex({ align: 'center', justify: 'center' }),
              'bg-primary-container text-white overflow-hidden',
            )}
          >
            <img
              alt={t('activitiesTopBar.profileImageAlt', {}, { defaultValue: 'User Profile' })}
              className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
              data-alt="Close-up professional portrait of a business executive in a light blue shirt with soft studio lighting and clean background"
              src="https://picsum.photos/seed/ActivitiesTopBar-1/1200/800"
            />
          </div>
          <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), 'text-on-surface')}>
            {t('activitiesTopBar.userDisplayName', {}, { defaultValue: 'Alex Sterling' })}
          </span>
        </button>
      </div>
    </header>
  )
}

export default ActivitiesTopBar
export { ActivitiesTopBar }
