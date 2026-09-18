import { Link, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
function BottomNavBar() {
  const { t } = useTranslation()
  const cm = getClassMap()
  const location = useLocation()
  return (
    <nav
      className={cm.cn(
        cm.flex({ justify: 'around', align: 'center' }),
        cm.sp('py', 4),
        cm.sp('px', 4),
        cm.w('full'),
        'md:hidden fixed bottom-0 left-0 bg-surface/80 backdrop-blur-xl z-50',
      )}
      data-mol-id="bottom-nav"
    >
      <Link
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center' }),
          'gap-1',
          location.pathname === '/' ? 'text-success' : 'text-foreground-secondary',
        )}
        data-mol-id="mob-nav-dash"
        to="/"
      >
        <span
          className={cm.cn('material-symbols-outlined')}
          style={location.pathname === '/' ? { fontVariationSettings: "'FILL' 1" } : undefined}
        >
          grid_view
        </span>
        <span
          className={cm.cn(
            cm.fontWeight(location.pathname === '/' ? 'bold' : 'medium'),
            'text-[10px] uppercase tracking-tighter',
          )}
        >
          {t('bottomNavBar.dashboard', {}, { defaultValue: 'Dash' })}
        </span>
      </Link>
      <Link
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center' }),
          'gap-1',
          location.pathname === '/accounts' ? 'text-success' : 'text-foreground-secondary',
        )}
        data-mol-id="mob-nav-acc"
        to="/accounts"
      >
        <span
          className={cm.cn('material-symbols-outlined')}
          style={
            location.pathname === '/accounts' ? { fontVariationSettings: "'FILL' 1" } : undefined
          }
        >
          account_balance_wallet
        </span>
        <span
          className={cm.cn(
            cm.fontWeight(location.pathname === '/accounts' ? 'bold' : 'medium'),
            'text-[10px] uppercase tracking-tighter',
          )}
        >
          {t('bottomNavBar.accounts', {}, { defaultValue: 'Accounts' })}
        </span>
      </Link>
      <Link
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center' }),
          'gap-1',
          location.pathname === '/goals' ? 'text-success' : 'text-foreground-secondary',
        )}
        data-mol-id="mob-nav-invest"
        to="/goals"
      >
        <span
          className={cm.cn('material-symbols-outlined')}
          style={location.pathname === '/goals' ? { fontVariationSettings: "'FILL' 1" } : undefined}
        >
          flag
        </span>
        <span
          className={cm.cn(
            cm.fontWeight(location.pathname === '/goals' ? 'bold' : 'medium'),
            'text-[10px] uppercase tracking-tighter',
          )}
        >
          {t('nav.goals', {}, { defaultValue: 'Goals' })}
        </span>
      </Link>
      <Link
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center' }),
          'gap-1',
          location.pathname === '/budgets' ? 'text-success' : 'text-foreground-secondary',
        )}
        data-mol-id="mob-nav-budgets"
        to="/budgets"
      >
        <span
          className={cm.cn('material-symbols-outlined')}
          style={
            location.pathname === '/budgets' ? { fontVariationSettings: "'FILL' 1" } : undefined
          }
        >
          pie_chart
        </span>
        <span
          className={cm.cn(
            cm.fontWeight(location.pathname === '/budgets' ? 'bold' : 'medium'),
            'text-[10px] uppercase tracking-tighter',
          )}
        >
          {t('bottomNavBar.budgets', {}, { defaultValue: 'Budget' })}
        </span>
      </Link>
      <Link
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center' }),
          'gap-1',
          location.pathname === '/settings' ? 'text-success' : 'text-foreground-secondary',
        )}
        data-mol-id="mob-nav-more"
        to="/settings"
      >
        <span
          className={cm.cn('material-symbols-outlined')}
          style={
            location.pathname === '/settings' ? { fontVariationSettings: "'FILL' 1" } : undefined
          }
        >
          settings
        </span>
        <span
          className={cm.cn(
            cm.fontWeight(location.pathname === '/settings' ? 'bold' : 'medium'),
            'text-[10px] uppercase tracking-tighter',
          )}
        >
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </span>
      </Link>
    </nav>
  )
}

export default BottomNavBar
export { BottomNavBar }
