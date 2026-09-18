import { Link, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { SidebarUserCard, usePanelClose } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { SettingsPanel } from './SettingsPanel.js'

function SideNavUserPanel() {
  return <SettingsPanel onClose={usePanelClose()} />
}

export function SideNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const location = useLocation()
  return (
    <aside
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.sp('py', 8),
        cm.sp('px', 4),
        'h-screen w-[240px] fixed left-0 top-0 border-r-0 bg-surface-secondary z-50',
      )}
    >
      <div
        className={cm.cn(cm.sp('mb', 10), cm.sp('px', 4), cm.flex({ direction: 'col', gap: 1 }))}
      >
        <h1 className={cm.cn(cm.textSize('2xl'), cm.textPrimary, 'font-black tracking-tighter')}>
          {t('sideNavBar.brandName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
        </h1>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('medium'),
            'text-foreground-secondary tracking-tight uppercase',
          )}
        >
          {t('sideNavBar.productTagline', {}, { defaultValue: 'Support Desk' })}
        </p>
      </div>
      <nav className={cm.cn(cm.flex1, cm.stack(2))}>
        {/* Active: Dashboard */}
        <Link
          className={cm.cn(
            cm.flex({ align: 'center', gap: 3 }),
            cm.sp('px', 4),
            cm.sp('py', 3),
            'transition-colors duration-200',
            location.pathname === '/'
              ? cm.cn(
                  cm.textPrimary,
                  cm.fontWeight('bold'),
                  'border-r-2 border-primary hover:bg-border/50 scale-[0.98]',
                )
              : 'text-foreground-secondary hover:text-foreground hover:bg-border/50',
          )}
          to="/"
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="dashboard">
            dashboard
          </span>
          <span
            className={cm.cn(
              cm.fontWeight('medium'),
              cm.textSize('sm'),
              "font-['Inter'] tracking-tight",
            )}
          >
            {t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
          </span>
        </Link>
        <Link
          className={cm.cn(
            cm.flex({ align: 'center', gap: 3 }),
            cm.sp('px', 4),
            cm.sp('py', 3),
            'transition-colors duration-200',
            location.pathname.startsWith('/tickets')
              ? cm.cn(
                  cm.textPrimary,
                  cm.fontWeight('bold'),
                  'border-r-2 border-primary hover:bg-border/50 scale-[0.98]',
                )
              : 'text-foreground-secondary hover:text-foreground hover:bg-border/50',
          )}
          to="/tickets"
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="confirmation_number">
            confirmation_number
          </span>
          <span
            className={cm.cn(
              cm.fontWeight('medium'),
              cm.textSize('sm'),
              "font-['Inter'] tracking-tight",
            )}
          >
            {t('sideNavBar.navTickets', {}, { defaultValue: 'Tickets' })}
          </span>
        </Link>
        <Link
          className={cm.cn(
            cm.flex({ align: 'center', gap: 3 }),
            cm.sp('px', 4),
            cm.sp('py', 3),
            'transition-colors duration-200',
            location.pathname.startsWith('/knowledge-base')
              ? cm.cn(
                  cm.textPrimary,
                  cm.fontWeight('bold'),
                  'border-r-2 border-primary hover:bg-border/50 scale-[0.98]',
                )
              : 'text-foreground-secondary hover:text-foreground hover:bg-border/50',
          )}
          to="/knowledge-base"
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="book">
            book
          </span>
          <span
            className={cm.cn(
              cm.fontWeight('medium'),
              cm.textSize('sm'),
              "font-['Inter'] tracking-tight",
            )}
          >
            {t('sideNavBar.navKnowledgeBase', {}, { defaultValue: 'Knowledge Base' })}
          </span>
        </Link>
        <Link
          className={cm.cn(
            cm.flex({ align: 'center', gap: 3 }),
            cm.sp('px', 4),
            cm.sp('py', 3),
            'transition-colors duration-200',
            location.pathname.startsWith('/reports')
              ? cm.cn(
                  cm.textPrimary,
                  cm.fontWeight('bold'),
                  'border-r-2 border-primary hover:bg-border/50 scale-[0.98]',
                )
              : 'text-foreground-secondary hover:text-foreground hover:bg-border/50',
          )}
          to="/reports"
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="bar_chart">
            bar_chart
          </span>
          <span
            className={cm.cn(
              cm.fontWeight('medium'),
              cm.textSize('sm'),
              "font-['Inter'] tracking-tight",
            )}
          >
            {t('nav.reports', {}, { defaultValue: 'Reports' })}
          </span>
        </Link>
        <Link
          className={cm.cn(
            cm.flex({ align: 'center', gap: 3 }),
            cm.sp('px', 4),
            cm.sp('py', 3),
            'transition-colors duration-200',
            location.pathname.startsWith('/settings')
              ? cm.cn(
                  cm.fontWeight('bold'),
                  'text-primary border-r-2 border-primary hover:bg-border/50 scale-[0.98]',
                )
              : 'text-foreground-secondary hover:text-foreground hover:bg-border/50',
          )}
          to="/settings"
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="settings">
            settings
          </span>
          <span
            className={cm.cn(
              cm.fontWeight('medium'),
              cm.textSize('sm'),
              "font-['Inter'] tracking-tight",
            )}
          >
            {t('nav.settings', {}, { defaultValue: 'Settings' })}
          </span>
        </Link>
      </nav>
      {/* Signed-in user card — opens the settings drawer (identity, settings, sign out). */}
      <div className={cm.cn(cm.sp('pt', 2), 'mt-auto')}>
        <SidebarUserCard>
          <SideNavUserPanel />
        </SidebarUserCard>
      </div>
    </aside>
  )
}
export default SideNavBar
