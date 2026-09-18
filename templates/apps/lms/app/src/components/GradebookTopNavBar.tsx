import { Link, useNavigate } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

function GradebookTopNavBar({
  search,
  onSearchChange,
}: {
  search: string
  onSearchChange: (s: string) => void
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth<{ id?: string; email?: string; name?: string }>()
  const userName =
    user?.name ||
    (user?.email ? user.email.split('@')[0] : '') ||
    t('gradebookTopNavBar.guestUserName', {}, { defaultValue: 'Student' })
  const avatarSeed = user?.id || user?.email || 'student'
  return (
    <header
      className={cm.cn(
        cm.flex({ justify: 'between', align: 'center' }),
        cm.sp('px', 8),
        cm.h(16),
        cm.w('full'),
        'sticky top-0 z-40 bg-surface/80 backdrop-blur-md border-b border-border',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }))}>
        <span
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            'tracking-tight text-primary dark:text-primary-container font-headline',
          )}
        >
          {t('gradebookTopNavBar.appName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
        </span>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 6 }))}>
        <div className={cm.cn(cm.w(64), 'relative hidden md:block')}>
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
              cm.sp('py', 2),
              cm.sp('pl', 10),
              cm.sp('pr', 4),
              cm.textSize('sm'),
              cm.roundedFull,
              'bg-surface-container-low border-none focus:ring-2 focus:ring-primary/20 placeholder:text-foreground-tertiary transition-all',
            )}
            placeholder={t(
              'gradebookTopNavBar.searchPlaceholder',
              {},
              { defaultValue: 'Search grades...' },
            )}
            aria-label={t(
              'gradebookTopNavBar.searchPlaceholder',
              {},
              { defaultValue: 'Search grades...' },
            )}
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }))}>
          <button
            aria-label={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
            className={cm.cn(
              cm.w(10),
              cm.h(10),
              cm.flex({ align: 'center', justify: 'center' }),
              cm.roundedFull,
              'relative text-foreground-secondary hover:bg-surface-secondary transition-colors',
            )}
            data-mol-id="gradebook-topnav-notifications"
            onClick={() => navigate('/notifications')}
          >
            <span className={cm.cn('material-symbols-outlined')}>notifications</span>
          </button>
          <Link
            to="/settings"
            aria-label={t('nav.settings', {}, { defaultValue: 'Settings' })}
            className={cm.cn(
              cm.w(10),
              cm.h(10),
              cm.flex({ align: 'center', justify: 'center' }),
              cm.roundedFull,
              'text-foreground-secondary hover:bg-surface-secondary transition-colors',
            )}
          >
            <span className={cm.cn('material-symbols-outlined')}>settings</span>
          </Link>
          <div className={cm.cn(cm.sp('mx', 1), cm.h(8), 'w-px', 'bg-border')}></div>
          <img
            alt={t(
              'gradebookTopNavBar.userAvatarAlt',
              { name: userName },
              { defaultValue: 'User profile avatar' },
            )}
            className={cm.cn(
              cm.roundedFull,
              cm.w(10),
              cm.h(10),
              'object-cover ring-2 ring-primary/10',
            )}
            src={`https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(avatarSeed)}`}
          />
          <UserMenu />
        </div>
      </div>
    </header>
  )
}

export default GradebookTopNavBar
export { GradebookTopNavBar }
