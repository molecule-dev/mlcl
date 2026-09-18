import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { UserMenu } from './UserMenu.js'

interface NotificationsTopBarProps {
  search?: string
  onSearch?: (q: string) => void
}

function NotificationsTopBar({ search = '', onSearch }: NotificationsTopBarProps = {}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <header
      className={cm.cn(
        cm.flex({ justify: 'between', align: 'center' }),
        cm.sp('px', 8),
        cm.h(16),
        cm.w('full'),
        'bg-surface/80 backdrop-blur-md dark:bg-surface-container-lowest/80 fixed top-0 right-0 left-[260px] z-40 border-b border-outline-variant/50',
      )}
    >
      <div className={cm.flex({ align: 'center', gap: 4 })}>
        <h1
          className={cm.cn(
            cm.textSize('lg'),
            cm.fontWeight('bold'),
            'text-foreground-tertiary font-headline',
          )}
        >
          {t('notifications.topBarTitle', {}, { defaultValue: 'Activity Feed' })}
        </h1>
      </div>
      <div className={cm.flex({ align: 'center', gap: 6 })}>
        <div className={cm.cn('relative hidden lg:block')}>
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
              cm.textSize('sm'),
              cm.roundedFull,
              cm.sp('pr', 4),
              cm.w(64),
              'bg-surface-container border border-outline-variant text-on-surface-variant pl-9 py-1.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-mono placeholder-on-surface-variant/50',
            )}
            aria-label={t(
              'notifications.searchLabel',
              {},
              { defaultValue: 'Search notifications' },
            )}
            type="text"
            value={search}
            onChange={(e) => onSearch?.(e.target.value)}
          />
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 3 }),
            cm.textSize('xs'),
            'text-primary dark:text-primary font-mono uppercase tracking-widest active:opacity-70',
          )}
        >
          <button
            type="button"
            aria-label={t('common.refresh', {}, { defaultValue: 'Refresh' })}
            className={cm.cn(
              'material-symbols-outlined hover:text-primary/80 transition-colors p-1.5 rounded-md hover:bg-foreground/50',
            )}
            onClick={() => window.location.reload()}
          >
            refresh
          </button>
        </div>
        <UserMenu />
      </div>
    </header>
  )
}

export default NotificationsTopBar
export { NotificationsTopBar }
