import { Link, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { SidebarUserCard, usePanelClose } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { SettingsPanel } from './SettingsPanel.js'

function UserMenuPanel() {
  return <SettingsPanel onClose={usePanelClose()} />
}

function CategoriesSideNavBar() {
  const location = useLocation()
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <aside
      className={cm.cn(
        cm.sp('py', 8),
        cm.sp('px', 6),
        cm.w(64),
        'fixed left-0 top-0 h-full z-40 bg-surface-secondary h-screen border-none hidden md:flex flex-col',
      )}
    >
      <div className={cm.cn(cm.sp('mb', 10), cm.sp('px', 2))}>
        <p
          className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'font-manrope text-success')}
        >
          {t(
            'categoriesSideNavBar.appName',
            { appName: APP_NAME },
            { defaultValue: '{{appName}}' },
          )}
        </p>
        <p
          className={cm.cn(
            cm.sp('mt', 1),
            'text-[10px] uppercase tracking-widest text-foreground-secondary font-inter',
          )}
        >
          {t('categoriesSideNavBar.tagline', {}, { defaultValue: 'The Financial Curator' })}
        </p>
      </div>
      <nav className={cm.cn(cm.flex1, cm.stack(1))}>
        <Link
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('p', 3),
            'rounded-lg group scale-95 active:opacity-80 transition-all',
            location.pathname === '/'
              ? cm.cn(
                  cm.fontWeight('bold'),
                  'text-success border-r-4 border-primary bg-success-light/50 rounded-l-lg',
                )
              : cm.cn(
                  cm.fontWeight('medium'),
                  'text-foreground-secondary hover:bg-border transition-colors duration-200',
                ),
          )}
          to="/"
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="dashboard">
            dashboard
          </span>
          <span className={cm.cn('font-inter')}>
            {t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
          </span>
        </Link>
        <Link
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('p', 3),
            'rounded-lg group scale-95 active:opacity-80 transition-all',
            location.pathname === '/transactions'
              ? cm.cn(
                  cm.fontWeight('bold'),
                  'text-success border-r-4 border-primary bg-success-light/50 rounded-l-lg',
                )
              : cm.cn(
                  cm.fontWeight('medium'),
                  'text-foreground-secondary hover:bg-border transition-colors duration-200',
                ),
          )}
          to="/transactions"
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="receipt_long">
            receipt_long
          </span>
          <span className={cm.cn('font-inter')}>
            {t('nav.transactions', {}, { defaultValue: 'Transactions' })}
          </span>
        </Link>
        <Link
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('p', 3),
            'rounded-lg group scale-95 active:opacity-80 transition-all',
            location.pathname === '/accounts'
              ? cm.cn(
                  cm.fontWeight('bold'),
                  'text-success border-r-4 border-primary bg-success-light/50 rounded-l-lg',
                )
              : cm.cn(
                  cm.fontWeight('medium'),
                  'text-foreground-secondary hover:bg-border transition-colors duration-200',
                ),
          )}
          to="/accounts"
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="account_balance">
            account_balance
          </span>
          <span className={cm.cn('font-inter')}>
            {t('nav.accounts', {}, { defaultValue: 'Accounts' })}
          </span>
        </Link>
        <Link
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('p', 3),
            'rounded-lg group scale-95 active:opacity-80 transition-all',
            location.pathname === '/budgets'
              ? cm.cn(
                  cm.fontWeight('bold'),
                  'text-success border-r-4 border-primary bg-success-light/50 rounded-l-lg',
                )
              : cm.cn(
                  cm.fontWeight('medium'),
                  'text-foreground-secondary hover:bg-border transition-colors duration-200',
                ),
          )}
          to="/budgets"
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="account_balance_wallet">
            account_balance_wallet
          </span>
          <span className={cm.cn('font-inter')}>
            {t('nav.budgets', {}, { defaultValue: 'Budgets' })}
          </span>
        </Link>
        <Link
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('p', 3),
            'rounded-lg group scale-95 active:opacity-80 transition-all',
            location.pathname === '/goals'
              ? cm.cn(
                  cm.fontWeight('bold'),
                  'text-success border-r-4 border-primary bg-success-light/50 rounded-l-lg',
                )
              : cm.cn(
                  cm.fontWeight('medium'),
                  'text-foreground-secondary hover:bg-border transition-colors duration-200',
                ),
          )}
          to="/goals"
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="ads_click">
            ads_click
          </span>
          <span className={cm.cn('font-inter')}>
            {t('nav.goals', {}, { defaultValue: 'Goals' })}
          </span>
        </Link>
        <Link
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('p', 3),
            'rounded-lg group scale-95 active:opacity-80 transition-all',
            location.pathname === '/reports'
              ? cm.cn(
                  cm.fontWeight('bold'),
                  'text-success border-r-4 border-primary bg-success-light/50 rounded-l-lg',
                )
              : cm.cn(
                  cm.fontWeight('medium'),
                  'text-foreground-secondary hover:bg-border transition-colors duration-200',
                ),
          )}
          to="/reports"
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="monitoring">
            monitoring
          </span>
          <span className={cm.cn('font-inter')}>
            {t('nav.reports', {}, { defaultValue: 'Reports' })}
          </span>
        </Link>
        {/* Active State */}
        <Link
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('p', 3),
            'rounded-lg group scale-95 active:opacity-80 transition-all',
            location.pathname === '/categories'
              ? cm.cn(
                  cm.fontWeight('bold'),
                  'text-success border-r-4 border-primary bg-success-light/50 rounded-l-lg',
                )
              : cm.cn(
                  cm.fontWeight('medium'),
                  'text-foreground-secondary hover:bg-border transition-colors duration-200',
                ),
          )}
          to="/categories"
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="category">
            category
          </span>
          <span className={cm.cn('font-inter')}>
            {t('nav.categories', {}, { defaultValue: 'Categories' })}
          </span>
        </Link>
      </nav>
      <div className={cm.cn(cm.stack(1), 'mt-auto')}>
        <Link
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('p', 3),
            'rounded-lg scale-95 active:opacity-80 transition-all',
            location.pathname === '/settings'
              ? cm.cn(
                  cm.fontWeight('bold'),
                  'text-success border-r-4 border-primary bg-success-light/50 rounded-l-lg',
                )
              : cm.cn(
                  cm.fontWeight('medium'),
                  'text-foreground-secondary hover:bg-border transition-colors duration-200',
                ),
          )}
          to="/settings"
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="settings">
            settings
          </span>
          <span className={cm.cn('font-inter')}>
            {t('nav.settings', {}, { defaultValue: 'Settings' })}
          </span>
        </Link>
        <div className={cm.cn(cm.sp('pt', 6), cm.sp('mt', 6))}>
          <SidebarUserCard dataMolId="user-menu" ariaLabelKey="userMenu.openButton">
            <UserMenuPanel />
          </SidebarUserCard>
        </div>
      </div>
    </aside>
  )
}

export default CategoriesSideNavBar
export { CategoriesSideNavBar }
