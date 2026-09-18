import { Link, useNavigate } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

export default function ActivitiesSideNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { logout } = useAuth()
  const __navigate = useNavigate()
  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault()
    try {
      await logout()
    } finally {
      __navigate('/login')
    }
  }
  return (
    <aside
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.h('screen'),
        cm.w(64),
        cm.sp('p', 4),
        cm.stack(2),
        'fixed left-0 top-0 overflow-y-auto bg-surface-secondary border-r border-border/50 z-50',
      )}
    >
      <div className={cm.cn(cm.sp('mb', 8), cm.sp('px', 2), cm.sp('py', 4))}>
        <h1 className={cm.cn(cm.textSize('xl'), 'font-black tracking-tight text-blue-800')}>
          {t('nav.companyName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
        </h1>
        <p
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-widest text-foreground-secondary',
          )}
        >
          {t('nav.tierLabel', {}, { defaultValue: 'Enterprise Tier' })}
        </p>
      </div>
      <nav className={cm.cn(cm.flex1, cm.stack(1))}>
        <Link
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            cm.roundedFull,
            'gap-3 text-foreground-secondary hover:bg-border transition-all duration-200',
          )}
          to="/"
        >
          <span className={cm.fv9c076a56}>dashboard</span>

          {t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
        </Link>
        <Link
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            cm.roundedFull,
            'gap-3 text-foreground-secondary hover:bg-border transition-all duration-200',
          )}
          to="/contacts"
        >
          <span className={cm.fv9c076a56}>person_book</span>

          {t('nav.contacts', {}, { defaultValue: 'Contacts' })}
        </Link>
        <Link
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            cm.roundedFull,
            'gap-3 text-foreground-secondary hover:bg-border transition-all duration-200',
          )}
          to="/deals"
        >
          <span className={cm.fv9c076a56}>payments</span>

          {t('nav.deals', {}, { defaultValue: 'Deals' })}
        </Link>
        {/* ACTIVE TAB: Activities */}
        <Link
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            cm.roundedFull,
            'gap-3 bg-blue-600/10 text-blue-700 transition-all duration-200',
          )}
          to="/activities"
        >
          <span className={cm.fv9c076a56} style={{ fontVariationSettings: "'FILL' 1" }}>
            event_repeat
          </span>

          {t('nav.activities', {}, { defaultValue: 'Activities' })}
        </Link>
        <Link
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            cm.roundedFull,
            'gap-3 text-foreground-secondary hover:bg-border transition-all duration-200',
          )}
          to="/reports"
        >
          <span className={cm.fv9c076a56}>insert_chart</span>

          {t('nav.reports', {}, { defaultValue: 'Reports' })}
        </Link>
        <Link
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            cm.roundedFull,
            'gap-3 text-foreground-secondary hover:bg-border transition-all duration-200',
          )}
          to="/settings"
        >
          <span className={cm.fv9c076a56}>settings</span>

          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </Link>
      </nav>
      <div className={cm.cn(cm.sp('pt', 4), cm.stack(1), 'border-t border-border/50')}>
        <div
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 4),
            cm.sp('mb', 4),
            'bg-primary/5 rounded-xl',
          )}
        >
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.sp('mb', 1),
              'text-primary',
            )}
          >
            {t('nav.planName', {}, { defaultValue: 'Architect Access' })}
          </p>
          <button
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.sp('px', 3),
              'text-[11px] text-white bg-primary py-1.5 rounded-lg w-full',
            )}
            onClick={() => {
              // TODO: wire when billing/upgrade endpoint or route exists
            }}
          >
            {t('nav.upgradePlan', {}, { defaultValue: 'Upgrade Plan' })}
          </button>
        </div>
        {/* TODO: replace with real support URL or modal trigger */}
        <span
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            cm.roundedFull,
            'gap-3 text-foreground-secondary hover:bg-border transition-all duration-200',
          )}
        >
          <span className={cm.fv9c076a56}>headset_mic</span>

          {t('nav.support', {}, { defaultValue: 'Support' })}
        </span>
        <button
          type="button"
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            cm.roundedFull,
            'gap-3 text-foreground-secondary hover:bg-border transition-all duration-200',
          )}
          onClick={handleLogout}
        >
          <span className={cm.fv5b245ffa}>logout</span>

          {t('common.logout', {}, { defaultValue: 'Logout' })}
        </button>
      </div>
    </aside>
  )
}
export { ActivitiesSideNavBar }
