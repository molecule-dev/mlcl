import { Link, useNavigate } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { UserMenu } from './UserMenu.js'

function DiscussionsHeader({
  search,
  onSearchChange,
}: {
  search: string
  onSearchChange: (s: string) => void
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth<{ name?: string; email?: string; id?: string }>()
  const userName =
    user?.name ||
    (user?.email ? user.email.split('@')[0] : '') ||
    t('discussionsHeader.guestUserName', {}, { defaultValue: 'Student' })
  const avatarSeed = user?.id || user?.email || 'student'

  return (
    <header
      className={cm.cn(
        cm.flex({ justify: 'between', align: 'center' }),
        cm.h(16),
        cm.sp('px', 8),
        cm.w('full'),
        'sticky top-14 md:top-0 bg-surface/80 backdrop-blur-md z-30 border-b border-border h-auto sm:h-16 py-3 sm:py-0 flex-col sm:flex-row items-start sm:items-center gap-3 px-4 md:px-8',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center' }), cm.flex1, 'gap-6 min-w-0')}>
        <h1
          className={cm.cn(
            cm.textSize('4xl'),
            cm.fontWeight('extrabold'),
            'tracking-tight text-on-surface text-2xl sm:text-4xl',
          )}
        >
          {t('discussionsHeader.title', {}, { defaultValue: 'Discussions' })}
        </h1>
        <div className={cm.cn(cm.w('full'), cm.maxW('md'), 'relative group min-w-0 flex-1')}>
          <span
            className={cm.cn(
              'material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]',
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
              'rounded-xl bg-surface-container-low border-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-on-surface-variant/50',
            )}
            placeholder={t(
              'discussionsHeader.searchPlaceholder',
              {},
              { defaultValue: 'Search discussions...' },
            )}
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-4 hidden lg:flex')}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.sp('mr', 4),
            cm.sp('pr', 4),
            'gap-2 border-r border-border',
          )}
        >
          <button
            className={cm.cn(
              cm.sp('p', 2),
              'rounded-xl text-foreground-secondary hover:text-primary transition-all hover:bg-surface-secondary',
            )}
            onClick={() => navigate('/notifications')}
            aria-label={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          >
            <span
              className={cm.cn('material-symbols-outlined text-[18px]')}
              data-icon="notifications"
            >
              notifications
            </span>
          </button>
          <Link
            to="/help"
            className={cm.cn(
              'p-2 text-foreground-secondary hover:text-primary transition-all rounded-xl hover:bg-surface-secondary',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-[18px]')}
              data-icon="help_outline"
            >
              help_outline
            </span>
          </Link>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-3')}>
          <img
            className={cm.cn(cm.w(8), cm.h(8), cm.roundedFull, 'border border-primary/20')}
            src={`https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(avatarSeed)}`}
            alt={t('discussionsHeader.userName', { name: userName }, { defaultValue: '{{name}}' })}
            data-mol-id="discussions-header-avatar"
          />
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'text-on-surface hidden lg:block',
            )}
            data-mol-id="discussions-header-name"
          >
            {userName}
          </span>
          <UserMenu />
        </div>
      </div>
    </header>
  )
}

export default DiscussionsHeader
export { DiscussionsHeader }
