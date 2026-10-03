import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell, SidebarUserCard, usePanelClose } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { SettingsPanel } from './SettingsPanel.js'

/**
 * The authed shell chrome — the SHARED `ResponsiveAppShell` from
 * `@molecule/app-ui-react`, composed to CivicPulse's shape: the fixed 240px
 * sidebar (brand + the signature Report CTA + nav + the settings user card)
 * on desktop; a sticky top bar (shell-rendered 44px menu trigger + brand +
 * compact Report CTA) plus the APG slide-in drawer on mobile. The two chrome
 * modes are mount-conditioned by the shell (one per breakpoint), so nav
 * `data-mol-id`s are never duplicated. The former hand-rolled
 * matchMedia/drawer state machine is deleted with the migration.
 *
 * Pages render their content as children — each page keeps its own `<main>`
 * landmark inside the shell's content column.
 */

function SideNavUserPanel() {
  return <SettingsPanel onClose={usePanelClose()} />
}

const NAV_ITEMS = [
  {
    to: '/explore',
    icon: 'map',
    molId: 'side-nav-explore',
    labelKey: 'sideNavBar.navExplore',
    defaultLabel: 'Explore',
  },
  {
    to: '/my-reports',
    icon: 'fact_check',
    molId: 'side-nav-my-reports',
    labelKey: 'sideNavBar.navMyReports',
    defaultLabel: 'My reports',
  },
  {
    to: '/watch-areas',
    icon: 'notifications_active',
    molId: 'side-nav-watch-areas',
    labelKey: 'sideNavBar.navWatchAreas',
    defaultLabel: 'Watch areas',
  },
  {
    to: '/notifications',
    icon: 'notifications',
    molId: 'side-nav-notifications',
    labelKey: 'sideNavBar.navNotifications',
    defaultLabel: 'Notifications',
  },
  {
    to: '/settings',
    icon: 'settings',
    molId: 'side-nav-settings',
    labelKey: 'nav.settings',
    defaultLabel: 'Settings',
  },
] as const

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
      aria-current={active ? 'page' : undefined}
      className={cm.cn(
        cm.flex({ align: 'center', gap: 3 }),
        cm.sp('px', 4),
        'min-h-[44px] transition-colors duration-200',
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

function useReportCtaClass(): string {
  const cm = getClassMap()
  return cm.cn(
    cm.flex({ align: 'center', justify: 'center', gap: 2 }),
    cm.sp('mb', 6),
    cm.sp('px', 4),
    'min-h-[44px] rounded-lg py-3 font-semibold text-sm transition-colors',
    'bg-[var(--color-nav-cta)] text-[var(--color-on-nav-cta)] hover:bg-[var(--color-nav-cta-hover)]',
  )
}

function BrandBlock() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <Link to="/explore" className={cm.cn(cm.flex({ direction: 'col', gap: 1 }), 'min-w-0')}>
      <span className={cm.cn(cm.textSize('2xl'), cm.textPrimary, 'font-black tracking-tighter')}>
        {t('sideNavBar.brandName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
      </span>
      <span
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('medium'),
          'text-foreground-secondary tracking-tight uppercase',
        )}
      >
        {t('sideNavBar.productTagline', {}, { defaultValue: 'Riverton 311' })}
      </span>
    </Link>
  )
}

export function SideNavBar({ children }: { children: ReactNode }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const reportCtaClass = useReportCtaClass()

  const navAriaLabel = t('sideNavBar.menuLabel', {}, { defaultValue: 'Navigation' })

  // One nav element for BOTH mounts — the shell instantiates only the
  // breakpoint's copy, so the `side-nav-*` ids stay unique in the DOM.
  const nav = (
    <nav className={cm.cn(cm.flex1, cm.stack(2))}>
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.molId}
          to={item.to}
          icon={item.icon}
          molId={item.molId}
          label={t(item.labelKey, {}, { defaultValue: item.defaultLabel })}
        />
      ))}
    </nav>
  )

  // The signature action: always one click away (sidebar lead on desktop,
  // compact form in the mobile top bar).
  const sidebarCta = (
    <Link data-mol-id="side-nav-report-cta" to="/report" className={reportCtaClass}>
      <span className="material-symbols-outlined" aria-hidden>
        add_location_alt
      </span>
      {t('sideNavBar.reportIssue', {}, { defaultValue: 'Report an issue' })}
    </Link>
  )
  const userCard = (
    <SidebarUserCard>
      <SideNavUserPanel />
    </SidebarUserCard>
  )

  return (
    <ResponsiveAppShell sidebarWidth={240} className="bg-surface-secondary text-on-surface">
      {/*
        Mobile top bar (<768px): the shell's menu trigger + brand + the
        compact Report CTA. Desktop returns null (mobileOnly): the Sidebar
        carries the chrome.
      */}
      <ResponsiveAppShell.TopBar
        mobileOnly
        brand={<BrandBlock />}
        className="bg-surface-secondary border-outline-variant/40"
        actions={
          <Link
            data-mol-id="side-nav-report-cta"
            to="/report"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 1 }),
              cm.sp('px', 3),
              'min-h-[36px] rounded-lg py-2 text-xs font-semibold transition-colors shrink-0',
              'bg-[var(--color-nav-cta)] text-[var(--color-on-nav-cta)]',
            )}
          >
            <span className="material-symbols-outlined" aria-hidden>
              add_location_alt
            </span>
            {t('sideNavBar.reportShort', {}, { defaultValue: 'Report' })}
          </Link>
        }
      />

      {/*
        Desktop sidebar (>=768px): brand + the Report CTA + nav + the
        signed-in user card (opens the settings drawer) in the footer row.
      */}
      <ResponsiveAppShell.Sidebar
        navLabel={navAriaLabel}
        dataMolId="side-nav-bar"
        className="bg-surface-secondary"
        footer={userCard}
      >
        <div className={cm.sp('mb', 6)}>
          <BrandBlock />
        </div>
        {sidebarCta}
        {nav}
      </ResponsiveAppShell.Sidebar>

      {/*
        Mobile drawer (<768px): the shell's APG dialog over the SAME nav
        element — brand in the header, user card in the footer.
      */}
      <ResponsiveAppShell.Drawer
        navLabel={navAriaLabel}
        header={<BrandBlock />}
        footer={userCard}
        className="h-full bg-surface-secondary"
      >
        {nav}
      </ResponsiveAppShell.Drawer>

      {/*
        Content column — pages own the `<main>` landmark, so the shell's
        `<main>` (Content) is deliberately not used here.
      */}
      <div className={cm.cn(cm.flex1)} style={{ minWidth: 0 }}>
        {children}
      </div>
    </ResponsiveAppShell>
  )
}
export default SideNavBar
