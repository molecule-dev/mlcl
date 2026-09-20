import { Link, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { SidebarUserCard, usePanelClose } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { SettingsPanel } from './SettingsPanel.js'

function SideNavUserPanel() {
  return <SettingsPanel onClose={usePanelClose()} />
}

function NavLink({
  to,
  icon,
  label,
  molId,
}: {
  to: string
  icon: string
  label: string
  molId: string
}) {
  const cm = getClassMap()
  const location = useLocation()
  const active =
    to === '/'
      ? location.pathname === to
      : location.pathname === to || location.pathname.startsWith(to + '/')
  return (
    <Link
      data-mol-id={molId}
      className={cm.cn(
        cm.flex({ align: 'center', gap: 3 }),
        cm.sp('px', 4),
        cm.sp('py', 3),
        'transition-colors duration-200',
        active
          ? cm.cn(
              cm.textPrimary,
              cm.fontWeight('bold'),
              'border-r-2 border-primary hover:bg-border/50 scale-[0.98]',
            )
          : 'text-foreground-secondary hover:text-foreground hover:bg-border/50',
      )}
      to={to}
    >
      <span className={cm.cn('material-symbols-outlined')} data-icon={icon}>
        {icon}
      </span>
      <span
        className={cm.cn(
          cm.fontWeight('medium'),
          cm.textSize('sm'),
          "font-['Inter'] tracking-tight",
        )}
      >
        {label}
      </span>
    </Link>
  )
}

export function SideNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <aside
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.sp('py', 8),
        cm.sp('px', 4),
        'h-screen w-[240px] fixed left-0 top-0 border-r-0 bg-surface-secondary z-50',
      )}
    >
      <div className={cm.cn(cm.sp('mb', 8), cm.sp('px', 4), cm.flex({ direction: 'col', gap: 1 }))}>
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
          {t('sideNavBar.productTagline', {}, { defaultValue: 'Riverton 311' })}
        </p>
      </div>
      {/* The signature action: always one click away. */}
      <Link
        data-mol-id="side-nav-report-cta"
        to="/report"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center', gap: 2 }),
          cm.sp('mb', 6),
          cm.sp('px', 4),
          'rounded-lg py-3 font-semibold text-sm transition-colors',
          'bg-[var(--color-nav-cta)] text-[var(--color-on-nav-cta)] hover:bg-[var(--color-nav-cta-hover)]',
        )}
      >
        <span className="material-symbols-outlined" aria-hidden>
          add_location_alt
        </span>
        {t('sideNavBar.reportIssue', {}, { defaultValue: 'Report an issue' })}
      </Link>
      <nav className={cm.cn(cm.flex1, cm.stack(2))}>
        <NavLink
          to="/explore"
          icon="map"
          molId="side-nav-explore"
          label={t('sideNavBar.navExplore', {}, { defaultValue: 'Explore' })}
        />
        <NavLink
          to="/my-reports"
          icon="fact_check"
          molId="side-nav-my-reports"
          label={t('sideNavBar.navMyReports', {}, { defaultValue: 'My reports' })}
        />
        <NavLink
          to="/watch-areas"
          icon="notifications_active"
          molId="side-nav-watch-areas"
          label={t('sideNavBar.navWatchAreas', {}, { defaultValue: 'Watch areas' })}
        />
        <NavLink
          to="/notifications"
          icon="notifications"
          molId="side-nav-notifications"
          label={t('sideNavBar.navNotifications', {}, { defaultValue: 'Notifications' })}
        />
        <NavLink
          to="/settings"
          icon="settings"
          molId="side-nav-settings"
          label={t('nav.settings', {}, { defaultValue: 'Settings' })}
        />
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
