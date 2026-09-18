import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { planLabel } from '../lib/planLabel.js'
import { UserMenu } from './UserMenu.js'

function SettingsTopNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth<{ name?: string; email?: string; id?: string; planKey?: string }>()
  const userName =
    user?.name ||
    (user?.email ? user.email.split('@')[0] : '') ||
    t('settingsTopNavBar.guestUserName', {}, { defaultValue: 'Student' })
  const userPlanLabel = planLabel(user?.planKey)
  const avatarSeed = user?.id || user?.email || 'student'
  const [search, setSearch] = useState('')
  return (
    <header
      className={cm.cn(
        cm.flex({ justify: 'between', align: 'center' }),
        cm.sp('px', 8),
        cm.h(16),
        'fixed top-0 right-0 w-[calc(100%-260px)] z-40 bg-surface/80 backdrop-blur-md ml-[260px] border-b border-border',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }), cm.flex1)}>
        <div className={cm.cn(cm.w('full'), cm.maxW('md'), 'relative')}>
          <span
            className={cm.cn(
              cm.textSize('xl'),
              'material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary',
            )}
            data-icon="search"
          >
            search
          </span>
          <input
            className={cm.cn(
              cm.w('full'),
              cm.textSize('sm'),
              cm.sp('pl', 10),
              cm.sp('pr', 4),
              cm.sp('py', 2),
              cm.roundedFull,
              'bg-surface-container-low border-none focus:ring-2 focus:ring-primary/20 placeholder:text-foreground-tertiary transition-all font-body outline-none',
            )}
            placeholder={t(
              'settingsTopNavBar.searchHint',
              {},
              { defaultValue: 'Search courses, files, and more...' },
            )}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && search.trim()) {
                navigate(`/courses?q=${encodeURIComponent(search.trim())}`)
              }
            }}
          />
        </div>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }))}>
        <button
          className={cm.cn(
            cm.w(10),
            cm.h(10),
            cm.flex({ align: 'center', justify: 'center' }),
            cm.roundedFull,
            'hover:bg-surface-secondary text-foreground-secondary transition-colors relative',
          )}
          aria-label={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          data-mol-id="settings-topnav-notifications"
          onClick={() => navigate('/notifications')}
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="notifications">
            notifications
          </span>
        </button>
        <Link
          to="/help"
          className={cm.cn(
            cm.w(10),
            cm.h(10),
            cm.flex({ align: 'center', justify: 'center' }),
            cm.roundedFull,
            'hover:bg-surface-secondary text-foreground-secondary transition-colors',
          )}
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="help_outline">
            help_outline
          </span>
        </Link>
        <div className={cm.cn(cm.h(8), 'w-px', cm.sp('mx', 2), 'bg-border')}></div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }), cm.sp('pl', 2))}>
          <div className={cm.cn(cm.textRight, 'hidden xl:block')}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'font-headline text-on-surface',
              )}
              data-mol-id="settings-topnav-name"
            >
              {userName}
            </p>
            <p className={cm.cn('text-[10px] text-foreground-secondary')}>
              {t(
                'settingsTopNavBar.planTier',
                { plan: userPlanLabel },
                { defaultValue: '{{plan}} Plan' },
              )}
            </p>
          </div>
          <img
            alt={t(
              'settingsTopNavBar.profilePictureAlt',
              { name: userName },
              { defaultValue: 'Profile picture' },
            )}
            className={cm.cn(cm.w(10), cm.h(10), cm.roundedFull, 'object-cover')}
            src={`https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(avatarSeed)}`}
          />
          <UserMenu />
        </div>
      </div>
    </header>
  )
}

export default SettingsTopNavBar
export { SettingsTopNavBar }
