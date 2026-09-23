import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { UserMenu } from './UserMenu.js'

function AssignmentsTopNavBar({
  search,
  onSearchChange,
}: {
  search: string
  onSearchChange: (s: string) => void
}) {
  const { t } = useTranslation()
  const cm = getClassMap()
  const navigate = useNavigate()
  return (
    <header
      className={cm.cn(
        cm.h(16),
        cm.w('full'),
        cm.flex({ align: 'center', justify: 'between' }),
        cm.sp('px', 8),
        'sticky top-14 md:top-0 z-30 bg-surface/80 backdrop-blur-md border-b border-border',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center' }), cm.flex1)}>
        <div className={cm.cn(cm.w('full'), cm.maxW('md'), 'relative')}>
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
              cm.sp('py', 2),
              cm.textSize('sm'),
              'bg-surface-container-low border-none focus:ring-2 focus:ring-primary/20 placeholder:text-foreground-tertiary transition-all',
            )}
            placeholder={t(
              'assignmentsTopNavBar.searchPlaceholder',
              {},
              { defaultValue: 'Search assignments, resources...' },
            )}
            aria-label={t(
              'assignmentsTopNavBar.searchPlaceholder',
              {},
              { defaultValue: 'Search assignments, resources...' },
            )}
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }), 'hidden md:flex')}>
        <button
          className={cm.cn(
            cm.sp('p', 2),
            cm.roundedFull,
            'relative text-foreground-secondary hover:bg-surface-secondary transition-colors',
          )}
          onClick={() => navigate('/notifications')}
          aria-label={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="notifications">
            notifications
          </span>
          <span
            className={cm.cn(
              cm.w(2),
              cm.h(2),
              cm.roundedFull,
              'absolute top-2 right-2 bg-error border-2 border-surface',
            )}
          ></span>
        </button>
        <UserMenu />
      </div>
    </header>
  )
}

export default AssignmentsTopNavBar
export { AssignmentsTopNavBar }
