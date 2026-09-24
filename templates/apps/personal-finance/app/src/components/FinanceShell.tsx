import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router'

import { useBillingStatus } from '@molecule/app-billing-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell, SidebarUserCard, usePanelClose } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { SettingsPanel } from './SettingsPanel.js'

function UserMenuPanel() {
  return <SettingsPanel onClose={usePanelClose()} />
}

function SidebarUserFooter() {
  const { t } = useTranslation()
  const { data: billing } = useBillingStatus<{ name?: string | null }>()
  const planName = billing?.name ?? null
  const memberLabel = planName
    ? t('sideNavBar.memberStatusOnPlan', { planName }, { defaultValue: '{{planName}} member' })
    : t('sideNavBar.memberStatus', {}, { defaultValue: 'Free member' })
  return (
    <SidebarUserCard
      dataMolId="user-menu"
      ariaLabelKey="userMenu.openButton"
      secondaryLine={memberLabel}
    >
      <UserMenuPanel />
    </SidebarUserCard>
  )
}

/** Brand block — app name + tagline, leading the sidebar and the drawer. */
function ShellBrand() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <Link
      to="/"
      className={cm.cn(cm.sp('px', 6), cm.sp('mb', 8), cm.flex({ direction: 'col', gap: 'xs' }))}
    >
      <span className={cm.cn(cm.textSize('lg'), 'font-black text-primary tracking-tighter')}>
        {t('sideNavBar.appName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
      </span>
      <span
        className={cm.cn(
          cm.fontWeight('semibold'),
          "font-['Manrope'] uppercase tracking-widest text-[10px] text-foreground-secondary",
        )}
      >
        {t('sideNavBar.tagline', {}, { defaultValue: 'The Financial Curator' })}
      </span>
    </Link>
  )
}

/**
 * Nav links shared by the desktop Sidebar and the mobile Drawer — the shell
 * mounts only the mounted breakpoint's copy, so there are never duplicate
 * nav landmarks or duplicated `data-mol-id`s. Marking the current item is
 * the consumer's job: `aria-current="page"` from the active link.
 */
function ShellNavLinks() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const location = useLocation()
  const path = location.pathname

  const linkClass = (active: boolean) =>
    active
      ? cm.cn(
          cm.sp('mx', 2),
          cm.sp('my', 1),
          cm.sp('px', 4),
          cm.sp('py', 3),
          cm.flex({ align: 'center', gap: 'sm' }),
          'bg-surface text-primary shadow-sm rounded-lg transition-all border-l-4 border-primary',
        )
      : cm.cn(
          cm.sp('px', 4),
          cm.sp('py', 3),
          cm.sp('mx', 2),
          cm.sp('my', 1),
          cm.flex({ align: 'center', gap: 'sm' }),
          'text-foreground-secondary hover:text-success transition-all hover:bg-success-light border-l-4 border-transparent',
        )

  const labelClass = cm.cn(
    cm.fontWeight('semibold'),
    "font-['Manrope'] uppercase tracking-widest text-[10px]",
  )

  const items: { to: string; icon: string; labelKey: string; defaultLabel: string }[] = [
    { to: '/', icon: 'dashboard', labelKey: 'nav.dashboard', defaultLabel: 'Dashboard' },
    {
      to: '/transactions',
      icon: 'receipt_long',
      labelKey: 'nav.transactions',
      defaultLabel: 'Transactions',
    },
    {
      to: '/accounts',
      icon: 'account_balance_wallet',
      labelKey: 'nav.accounts',
      defaultLabel: 'Accounts',
    },
    { to: '/budgets', icon: 'leaderboard', labelKey: 'nav.budgets', defaultLabel: 'Budgets' },
    { to: '/goals', icon: 'flag', labelKey: 'nav.goals', defaultLabel: 'Goals' },
    { to: '/reports', icon: 'bar_chart', labelKey: 'nav.reports', defaultLabel: 'Reports' },
    { to: '/categories', icon: 'category', labelKey: 'nav.categories', defaultLabel: 'Categories' },
    { to: '/settings', icon: 'settings', labelKey: 'nav.settings', defaultLabel: 'Settings' },
  ]

  const isActivePath = (to: string) => {
    if (to === '/') return path === '/'
    if (to === '/transactions') return path === '/transactions' || path.startsWith('/transactions/')
    return path === to || path.startsWith(`${to}/`)
  }

  return (
    <>
      {items.map(({ to, icon, labelKey, defaultLabel }) => {
        const active = isActivePath(to)
        return (
          <Link
            key={to}
            to={to}
            className={linkClass(active)}
            aria-current={active ? 'page' : undefined}
          >
            <span className={cm.cn('material-symbols-outlined')}>{icon}</span>
            <span className={labelClass}>{t(labelKey, {}, { defaultValue: defaultLabel })}</span>
          </Link>
        )
      })}
    </>
  )
}

interface FinanceShellProps {
  /** The page's content — its top bar plus its padded canvas. */
  children: ReactNode
}

/**
 * The authenticated shell — the shared `ResponsiveAppShell` composed to this
 * app's shape (the fleet-canonical one: brand in the sidebar, a mobile-only
 * top bar carrying the menu trigger).
 *
 * The shell owns the breakpoint split: the Sidebar mounts only ≥768px, the
 * mobile Drawer (the SAME nav element, full dialog contract — focus trap,
 * Escape/backdrop close, scroll lock, auto-close on navigation) only below
 * it. The former hand-rolled pair — the CSS-hidden desktop `SideNavBar`
 * (`hidden md:flex`) and the fixed mobile `BottomNavBar` (`md:hidden`), plus
 * the Categories variant — is deleted with it.
 *
 * `.Content` is a bare `<main>`: page padding and each page's own sticky top
 * bar stay inside the page.
 */
export default function FinanceShell({ children }: FinanceShellProps) {
  const { t } = useTranslation()
  const navLabel = t('sideNavBar.primaryNav', {}, { defaultValue: 'Primary navigation' })
  const nav = <ShellNavLinks />

  return (
    <ResponsiveAppShell sidebarWidth="lg">
      {/*
        Mobile top bar (<768px): brand + the drawer menu trigger (rendered by
        the shell when a Drawer is composed). Desktop returns null — the
        sidebar carries the brand there, and pages keep their own top bars.
      */}
      <ResponsiveAppShell.TopBar mobileOnly brand={<ShellBrand />} />
      <ResponsiveAppShell.Sidebar navLabel={navLabel} footer={<SidebarUserFooter />}>
        <ShellBrand />
        {nav}
      </ResponsiveAppShell.Sidebar>
      <ResponsiveAppShell.Drawer navLabel={navLabel} header={<ShellBrand />}>
        {nav}
      </ResponsiveAppShell.Drawer>
      <ResponsiveAppShell.Content>{children}</ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}

export { FinanceShell }
