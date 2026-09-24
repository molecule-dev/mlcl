import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

interface TicketsTopNavBarProps {
  search: string
  onSearchChange: (val: string) => void
  viewTab: 'all' | 'assigned' | 'unassigned'
  onViewTabChange: (tab: 'all' | 'assigned' | 'unassigned') => void
}

/**
 * Tickets top bar — the shared `ResponsiveAppShell.TopBar` (the mobile menu
 * trigger is the shell's). Search + view tabs are the brand slot (they wrap
 * onto a second row on phones, as before); the actions cluster the actions
 * slot.
 */
export default function TicketsTopNavBar({
  search,
  onSearchChange,
  viewTab,
  onViewTabChange,
}: TicketsTopNavBarProps) {
  const cm = getClassMap()
  const navigate = useNavigate()
  const { t } = useTranslation()
  return (
    <ResponsiveAppShell.TopBar
      className="w-full h-auto min-h-16 md:h-16 flex-wrap gap-y-1 py-2 md:py-0 px-4 md:px-8 bg-surface/80 backdrop-blur-xl shadow-sm dark:shadow-none"
      dataMolId="top-nav"
      brand={
        <div
          className={cm.cn(
            cm.flex({ align: 'center' }),
            'gap-3 md:gap-8 min-w-0 flex-1 md:flex-none flex-wrap',
          )}
        >
          <div className={cm.cn('relative min-w-0 flex-1 md:flex-none')}>
            <span
              className={cm.cn(
                cm.textSize('sm'),
                'material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant',
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
                'w-full md:w-64',
                'bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 transition-all',
              )}
              placeholder={t(
                'ticketsTopNavBar.searchPlaceholder',
                {},
                { defaultValue: 'Search tickets...' },
              )}
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          <nav
            className={cm.cn(
              cm.flex({ align: 'center' }),
              'gap-4 md:gap-6 order-last basis-full md:order-none md:basis-auto',
            )}
          >
            <button
              onClick={() => onViewTabChange('all')}
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                cm.sp('pb', 5),
                'border-b-2 transition-all',
                viewTab === 'all'
                  ? 'text-sky-600 dark:text-sky-400 border-sky-600'
                  : 'text-foreground-secondary border-transparent hover:text-foreground',
              )}
            >
              {t('ticketsTopNavBar.tabAll', {}, { defaultValue: 'All Tickets' })}
            </button>
            <button
              onClick={() => onViewTabChange('assigned')}
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                cm.sp('pb', 5),
                'border-b-2 transition-all',
                viewTab === 'assigned'
                  ? 'text-sky-600 dark:text-sky-400 border-sky-600'
                  : 'text-foreground-secondary border-transparent hover:text-foreground',
              )}
            >
              {t('ticketsTopNavBar.tabAssigned', {}, { defaultValue: 'Assigned to me' })}
            </button>
            <button
              onClick={() => onViewTabChange('unassigned')}
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                cm.sp('pb', 5),
                'border-b-2 transition-all',
                viewTab === 'unassigned'
                  ? 'text-sky-600 dark:text-sky-400 border-sky-600'
                  : 'text-foreground-secondary border-transparent hover:text-foreground',
              )}
            >
              {t('status.unassigned', {}, { defaultValue: 'Unassigned' })}
            </button>
          </nav>
        </div>
      }
      actions={
        <div className={cm.cn(cm.flex({ align: 'center', gap: 5 }))}>
          <button
            onClick={() => navigate('/notifications')}
            aria-label={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
            className={cm.cn(
              cm.sp('p', 2),
              cm.roundedFull,
              'text-on-surface-variant hover:bg-surface-container-high transition-colors',
            )}
          >
            <span className={cm.cn('material-symbols-outlined')}>notifications</span>
          </button>
          <button
            onClick={() => navigate('/knowledge-base')}
            aria-label={t('common.help', {}, { defaultValue: 'Help' })}
            className={cm.cn(
              cm.sp('p', 2),
              cm.roundedFull,
              'text-on-surface-variant hover:bg-surface-container-high transition-colors',
            )}
          >
            <span className={cm.cn('material-symbols-outlined')}>help_outline</span>
          </button>
          <button
            onClick={() => navigate('/tickets/new')}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity active:scale-95',
            )}
          >
            {t('ticketsTopNavBar.createTicket', {}, { defaultValue: 'New Ticket' })}
          </button>
        </div>
      }
    />
  )
}
export { TicketsTopNavBar }
