import { Link, useLocation } from 'react-router'

import { useBillingStatus } from '@molecule/app-billing-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { SidebarUserCard, usePanelClose } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { SettingsPanel } from './SettingsPanel.js'

function UserMenuPanel() {
  return <SettingsPanel onClose={usePanelClose()} />
}

function SideNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const location = useLocation()
  const path = location.pathname
  const { data: billing } = useBillingStatus<unknown>()

  const planName = billing?.name ?? null
  const memberLabel = planName
    ? t('sideNavBar.memberStatusOnPlan', { planName }, { defaultValue: '{{planName}} member' })
    : t('sideNavBar.memberStatus', {}, { defaultValue: 'Free member' })

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
    <aside
      className={cm.cn(
        cm.h('screen'),
        cm.w(64),
        cm.surface,
        cm.flex({ direction: 'col' }),
        'fixed left-0 top-0 hidden md:flex z-50',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.flex1,
          'min-h-0',
          cm.sp('pt', 8),
          cm.sp('pb', 4),
        )}
      >
        <div className={cm.cn(cm.sp('px', 6), cm.sp('mb', 8))}>
          <div className={cm.cn(cm.textSize('lg'), 'font-black text-primary tracking-tighter')}>
            {t('sideNavBar.appName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
          </div>
          <div
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.sp('mt', 1),
              "font-['Manrope'] uppercase tracking-widest text-[10px] text-foreground-secondary",
            )}
          >
            {t('sideNavBar.tagline', {}, { defaultValue: 'The Financial Curator' })}
          </div>
        </div>
        <nav
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'xs' }),
            cm.flex1,
            'min-h-0 overflow-y-auto',
          )}
        >
          {items.map(({ to, icon, labelKey, defaultLabel }) => (
            <Link key={to} className={linkClass(isActivePath(to))} to={to}>
              <span className={cm.cn('material-symbols-outlined')}>{icon}</span>
              <span className={labelClass}>{t(labelKey, {}, { defaultValue: defaultLabel })}</span>
            </Link>
          ))}
        </nav>
        <div className={cm.cn(cm.sp('px', 4), cm.sp('mt', 4))}>
          <SidebarUserCard
            secondaryLine={memberLabel}
            dataMolId="user-menu"
            ariaLabelKey="userMenu.openButton"
          >
            <UserMenuPanel />
          </SidebarUserCard>
        </div>
      </div>
    </aside>
  )
}
export default SideNavBar
export { SideNavBar }
