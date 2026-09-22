import { Link, useLocation, useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * Branded sidebar navigation for Dendrite — gradient logo tile + nav links
 * with active-state border accent + "New map" CTA pinned to the bottom.
 *
 * Translated from project-management's DashboardSideNavBar.tsx (sidebar
 * pattern with logo, nav links, active accent, and primary CTA).
 *
 * MOBILE: the fixed sidebar is desktop-only (`hidden md:flex`); below the md
 * breakpoint MindMappingLayout renders this component's nav links inside a
 * slide-in drawer behind the sticky top bar — both share {@link DendriteNavLinks}
 * so the two can never drift.
 */

/** Shared nav-item list used by BOTH the desktop sidebar and the mobile drawer. */
export function DendriteNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const location = useLocation()

  const navItems = [
    {
      to: '/dashboard',
      icon: 'dashboard',
      label: t('nav.dashboard', {}, { defaultValue: 'Dashboard' }),
    },
    { to: '/maps', icon: 'account_tree', label: t('nav.maps', {}, { defaultValue: 'Maps' }) },
    {
      to: '/templates',
      icon: 'category',
      label: t('nav.templates', {}, { defaultValue: 'Templates' }),
    },
    {
      to: '/notifications',
      icon: 'notifications',
      label: t('settings.notifications', {}, { defaultValue: 'Notifications' }),
    },
    { to: '/profile', icon: 'person', label: t('nav.profile', {}, { defaultValue: 'Profile' }) },
    {
      to: '/settings',
      icon: 'settings',
      label: t('nav.settings', {}, { defaultValue: 'Settings' }),
    },
    { to: '/trash', icon: 'delete_outline', label: t('nav.trash', {}, { defaultValue: 'Trash' }) },
  ]

  const isActive = (to: string) =>
    location.pathname === to || (to !== '/dashboard' && location.pathname.startsWith(to))

  return (
    <nav className={cm.cn(cm.flex1, cm.sp('px', 3), cm.stack(1))}>
      {navItems.map((item) => {
        const active = isActive(item.to)
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-r-xl transition-colors duration-200',
              active
                ? 'bg-primary-container/40 text-on-primary-container border-l-4 border-primary'
                : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface border-l-4 border-transparent',
            )}
          >
            <span
              className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}
              aria-hidden="true"
            >
              {item.icon}
            </span>
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

/** Brand tile + wordmark, shared by the sidebar, the mobile bar and the drawer. */
export function DendriteBrand({ compact = false }: { compact?: boolean }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <Link
      to="/dashboard"
      className={cm.cn(cm.flex({ align: 'center' }), cm.sp('px', 6), cm.sp('py', 8), 'gap-3')}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.w(9),
          cm.h(9),
          'bg-gradient-to-br from-primary to-primary-container rounded-xl text-on-primary shadow-md',
        )}
      >
        <span
          className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}
          style={{ fontVariationSettings: "'FILL' 1" }}
          aria-hidden="true"
        >
          account_tree
        </span>
      </div>
      <div className={cm.flex({ direction: 'col' })}>
        <span className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight text-on-surface')}>
          {APP_NAME}
        </span>
        {!compact && (
          <span
            className={cm.cn(
              'text-[10px] uppercase tracking-widest text-on-surface-variant font-bold',
            )}
          >
            {t('brand.tagline', {}, { defaultValue: 'Where ideas branch out' })}
          </span>
        )}
      </div>
    </Link>
  )
}

export function DendriteSideNav() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <aside
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.h('screen'),
        "hidden md:flex w-[240px] sticky top-0 left-0 bg-surface-container-lowest border-r border-outline-variant/30 font-['Inter'] antialiased",
      )}
    >
      <DendriteBrand />
      <DendriteNavLinks />
      <div className={cm.cn(cm.sp('p', 4), 'mt-auto')}>
        <button
          type="button"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
            cm.w('full'),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            'bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-xl shadow-lg active:scale-[0.98] transition-transform',
          )}
          onClick={() => navigate('/maps?new=1')}
        >
          <span
            className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
            aria-hidden="true"
          >
            add
          </span>
          {t('nav.newMap', {}, { defaultValue: 'New map' })}
        </button>
      </div>
    </aside>
  )
}

export default DendriteSideNav
