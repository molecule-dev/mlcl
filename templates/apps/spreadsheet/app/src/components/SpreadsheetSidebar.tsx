import { NavLink, useNavigate } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

interface NavItem {
  to: string
  icon: string
  labelKey: string
  defaultLabel: string
}

const NAV_ITEMS: NavItem[] = [
  { to: '/workbooks', icon: 'grid_on', labelKey: 'sidebar.workbooks', defaultLabel: 'Workbooks' },
  {
    to: '/templates',
    icon: 'collections_bookmark',
    labelKey: 'sidebar.templates',
    defaultLabel: 'Templates',
  },
  {
    to: '/automations',
    icon: 'bolt',
    labelKey: 'sidebar.automations',
    defaultLabel: 'Automations',
  },
  {
    to: '/integrations',
    icon: 'extension',
    labelKey: 'sidebar.integrations',
    defaultLabel: 'Integrations',
  },
  {
    to: '/notifications',
    icon: 'notifications',
    labelKey: 'sidebar.notifications',
    defaultLabel: 'Notifications',
  },
  { to: '/team', icon: 'group', labelKey: 'sidebar.team', defaultLabel: 'Team' },
  { to: '/billing', icon: 'credit_card', labelKey: 'sidebar.billing', defaultLabel: 'Billing' },
  { to: '/settings', icon: 'settings', labelKey: 'sidebar.settings', defaultLabel: 'Settings' },
]

function userInitials(name?: string | null, email?: string | null): string {
  const src = (name ?? email ?? '').trim()
  if (!src) return 'ME'
  const parts = src.split(/\s+|[._@-]/).filter(Boolean)
  const a = parts[0]?.[0] ?? ''
  const b = parts[1]?.[0] ?? parts[0]?.[1] ?? ''
  return (a + b).toUpperCase().slice(0, 2) || 'ME'
}

/**
 * Calcite workbench sidebar — gradient logo tile, brand name, tagline,
 * and a stack of NavLinks with active-state border-l-4 + primary tint.
 *
 * Bottom user card pulls live name/email from `useAuth()` and exposes a
 * working "Sign out" button.
 */
export function SpreadsheetSidebar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, logout } = useAuth<{ id?: string; name?: string; email?: string }>()
  const displayName = user?.name || user?.email || 'You'
  const role = user?.email
    ? user.email
    : t('sidebar.userRole', {}, { defaultValue: 'Workspace owner' })
  const initials = userInitials(user?.name, user?.email)

  async function handleSignOut() {
    try {
      await logout()
    } finally {
      navigate('/login', { replace: true })
    }
  }
  return (
    <aside
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.textSize('sm'),
        cm.fontWeight('medium'),
        'w-[260px] shrink-0 min-h-screen bg-surface-container-low border-r border-outline-variant/40',
      )}
    >
      <div
        className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('px', 6), cm.sp('py', 8))}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(9),
            cm.h(9),
            'bg-gradient-to-br from-primary to-primary-dark rounded-xl text-on-primary shadow-lg shadow-primary/30',
          )}
          aria-hidden="true"
        >
          <span
            className={'material-symbols-outlined text-xl'}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            grid_on
          </span>
        </div>
        <div className={cm.flex({ direction: 'col' })}>
          <span
            className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-on-surface')}
          >
            {APP_NAME}
          </span>
          <span className="text-[10px] uppercase tracking-widest text-on-surface-variant">
            {APP_TAGLINE}
          </span>
        </div>
      </div>
      <nav className={cm.cn(cm.flex1, cm.sp('px', 3), cm.stack(1))}>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('px', 4),
                cm.sp('py', 2),
                'rounded-lg transition-colors duration-200',
                isActive
                  ? 'bg-primary-fixed text-primary border-l-4 border-primary font-bold'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
              )
            }
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
              {item.icon}
            </span>
            <span>{t(item.labelKey, {}, { defaultValue: item.defaultLabel })}</span>
          </NavLink>
        ))}
      </nav>
      <div className={cm.cn(cm.sp('p', 4), 'mt-auto', cm.stack(2))}>
        <NavLink
          to="/profile"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 3),
            cm.sp('py', 3),
            'rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors',
          )}
        >
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(8),
              cm.h(8),
              'rounded-full bg-primary-fixed text-primary text-xs font-extrabold',
            )}
            aria-hidden="true"
          >
            {initials}
          </span>
          <span className={cm.cn(cm.flex1, 'min-w-0')}>
            <span className={'block text-sm font-bold text-on-surface truncate'}>
              {displayName}
            </span>
            <span className="block text-[10px] uppercase tracking-widest text-on-surface-variant truncate">
              {role}
            </span>
          </span>
        </NavLink>
        <button
          type="button"
          onClick={handleSignOut}
          aria-label={t('settings.logOut', {}, { defaultValue: 'Sign out' })}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm', justify: 'center' }),
            cm.sp('px', 3),
            cm.sp('py', 2),
            'rounded-xl text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:bg-surface-container hover:text-error transition-colors',
          )}
        >
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
            logout
          </span>
          {t('settings.logOut', {}, { defaultValue: 'Sign out' })}
        </button>
      </div>
    </aside>
  )
}
