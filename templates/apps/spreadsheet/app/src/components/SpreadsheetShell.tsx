import type { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

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
 * The nav links shared by the desktop Sidebar and the mobile Drawer — the
 * shell mounts only the breakpoint's copy, so the links are never duplicated
 * in the DOM. react-router's NavLink sets `aria-current="page"` on the active
 * item, and the shell closes the drawer on navigation, so links carry no
 * onClick close.
 */
function SpreadsheetNav() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <>
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 4),
              cm.sp('py', 3),
              'rounded-lg transition-colors duration-200 min-h-[44px]',
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
    </>
  )
}

function UserCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<{ id?: string; name?: string; email?: string }>()
  const displayName = user?.name || user?.email || 'You'
  const role = user?.email
    ? user.email
    : t('sidebar.userRole', {}, { defaultValue: 'Workspace owner' })
  const initials = userInitials(user?.name, user?.email)
  return (
    <NavLink
      to="/profile"
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'sm' }),
        cm.sp('px', 3),
        cm.sp('py', 3),
        'rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors min-h-[44px]',
      )}
    >
      <span
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.w(8),
          cm.h(8),
          'rounded-full bg-primary-fixed text-primary text-xs font-extrabold shrink-0',
        )}
        aria-hidden="true"
      >
        {initials}
      </span>
      <span className={cm.cn(cm.flex1, 'min-w-0')}>
        <span className={'block text-sm font-bold text-on-surface truncate'}>{displayName}</span>
        <span className="block text-[10px] uppercase tracking-widest text-on-surface-variant truncate">
          {role}
        </span>
      </span>
    </NavLink>
  )
}

interface SignOutButtonProps {
  onSignOut: () => void
}

function SignOutButton({ onSignOut }: SignOutButtonProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={onSignOut}
      aria-label={t('settings.logOut', {}, { defaultValue: 'Sign out' })}
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'sm', justify: 'center' }),
        cm.sp('px', 3),
        cm.sp('py', 3),
        'rounded-xl text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:bg-surface-container hover:text-error transition-colors min-h-[44px] w-full',
      )}
    >
      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
        logout
      </span>
      {t('settings.logOut', {}, { defaultValue: 'Sign out' })}
    </button>
  )
}

interface SpreadsheetShellProps {
  /** Routed page content — rendered inside the shell's `<main>` landmark. */
  children: ReactNode
}

/**
 * Calcite workbench shell — the shared `ResponsiveAppShell` composed to this
 * app's shape: a mobile-only top bar (compact brand + profile avatar), a ≥md
 * sidebar whose brand row leads the nav column, a <md dialog drawer carrying
 * the same nav plus the user card + sign out, and one `<main>` for the routed
 * page. The shell owns the breakpoint split, the drawer open state, the menu
 * trigger, focus/Escape/backdrop handling, and the auto-close-on-navigation;
 * this component only supplies nav + brand. Page padding stays inside pages.
 */
export function SpreadsheetShell({ children }: SpreadsheetShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, logout } = useAuth<{ id?: string; name?: string; email?: string }>()
  const initials = userInitials(user?.name, user?.email)

  async function handleSignOut() {
    try {
      await logout()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  const nav = <SpreadsheetNav />

  return (
    <ResponsiveAppShell sidebarWidth="md">
      {/*
        Mobile top bar (<768px) — the desktop brand row lives in the sidebar,
        so this renders only below the breakpoint; the shell renders the menu
        trigger itself.
      */}
      <ResponsiveAppShell.TopBar
        mobileOnly
        brand={
          <NavLink
            to="/workbooks"
            className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0')}
          >
            <span
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.w(8),
                cm.h(8),
                'bg-gradient-to-br from-primary to-primary-dark rounded-lg text-on-primary shadow-md shadow-primary/30 shrink-0',
              )}
              aria-hidden="true"
            >
              <span
                className={'material-symbols-outlined text-lg'}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                grid_on
              </span>
            </span>
            <span className="min-w-0">
              <span
                className={cm.cn(
                  cm.textSize('sm'),
                  'block font-extrabold tracking-tight text-on-surface truncate leading-tight',
                )}
              >
                {APP_NAME}
              </span>
              <span className="block text-[9px] uppercase tracking-widest text-on-surface-variant truncate leading-tight">
                {APP_TAGLINE}
              </span>
            </span>
          </NavLink>
        }
        actions={
          <NavLink
            to="/profile"
            aria-label={t('nav.profile', {}, { defaultValue: 'Profile' })}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(9),
              cm.h(9),
              'rounded-full bg-primary-fixed text-primary text-xs font-extrabold min-h-[36px] min-w-[36px]',
            )}
          >
            {initials}
          </NavLink>
        }
      />

      {/*
        Desktop sidebar (≥768px). The brand row leads the nav column — the
        shared Sidebar has no header slot, so it rides inside `children`
        (alongside the nav links, inside the shell's `<nav>` landmark).
      */}
      <ResponsiveAppShell.Sidebar
        className={cm.sp('p', 4)}
        footer={
          <>
            <UserCard />
            <SignOutButton onSignOut={handleSignOut} />
          </>
        }
      >
        <div
          className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('px', 2), cm.sp('pb', 4))}
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
        {nav}
      </ResponsiveAppShell.Sidebar>
      {/*
        Mobile drawer (<768px): a full dialog panel (focus trap, Escape,
        backdrop click, body-scroll lock) over the same nav, with the user
        card + sign out in the footer.
      */}
      <ResponsiveAppShell.Drawer
        // The shared panel ships no height token (its content would size it);
        // `h-full` restores the documented full-height left-panel geometry.
        className="h-full"
        header={
          <span
            className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-on-surface')}
          >
            {APP_NAME}
          </span>
        }
        footer={
          <>
            <UserCard />
            <SignOutButton onSignOut={handleSignOut} />
          </>
        }
      >
        {nav}
      </ResponsiveAppShell.Drawer>

      <ResponsiveAppShell.Content className={cm.flex({ direction: 'col' })}>
        {children}
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}
