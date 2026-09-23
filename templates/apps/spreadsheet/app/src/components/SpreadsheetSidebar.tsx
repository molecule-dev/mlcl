import { useEffect, useState } from 'react'
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

interface NavListProps {
  onNavigate?: () => void
}

/** The nav stack shared by the desktop rail and the mobile drawer. */
function NavList({ onNavigate }: NavListProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <nav className={cm.cn(cm.flex1, cm.sp('px', 3), cm.stack(1), 'overflow-y-auto')}>
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
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
    </nav>
  )
}

interface UserCardProps {
  onNavigate?: () => void
}

function UserCard({ onNavigate }: UserCardProps) {
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
      onClick={onNavigate}
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

/**
 * Calcite workbench shell — responsive by breakpoint:
 *
 * - ≥768px: the classic 260px left rail (brand tile, NavLinks with
 *   active-state border-l-4 + primary tint, bottom user card + sign out).
 * - <768px: a sticky top bar (brand + avatar + menu button) and a slide-in
 *   drawer carrying the same nav, so 390px screens keep the full width for
 *   the grid instead of losing 260px to a permanent rail.
 */
export function SpreadsheetSidebar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, logout } = useAuth<{ id?: string; name?: string; email?: string }>()
  const initials = userInitials(user?.name, user?.email)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Escape closes the drawer; body scroll locks while it is open.
  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [drawerOpen])

  async function handleSignOut() {
    setDrawerOpen(false)
    try {
      await logout()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  const closeDrawer = () => setDrawerOpen(false)

  return (
    <>
      {/* ── Mobile top bar (<768px) ─────────────────────────────────── */}
      <header
        data-mol-id="mobile-top-bar"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
          cm.sp('px', 4),
          'md:hidden sticky top-0 z-40 h-14 bg-surface-container-low border-b border-outline-variant/40',
        )}
      >
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
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'shrink-0')}>
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
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label={t('nav.openMenu', {}, { defaultValue: 'Open menu' })}
            aria-expanded={drawerOpen}
            aria-controls="mobile-drawer"
            data-mol-id="mobile-menu-button"
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(9),
              cm.h(9),
              'rounded-full text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors min-h-[36px] min-w-[36px]',
            )}
          >
            <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
              menu
            </span>
          </button>
        </div>
      </header>

      {/* ── Desktop rail (≥768px) ───────────────────────────────────── */}
      <aside
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.textSize('sm'),
          cm.fontWeight('medium'),
          'hidden md:flex w-[260px] shrink-0 md:min-h-screen bg-surface-container-low border-r border-outline-variant/40',
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
        <NavList />
        <div className={cm.cn(cm.sp('p', 4), 'mt-auto', cm.stack(2))}>
          <UserCard />
          <SignOutButton onSignOut={handleSignOut} />
        </div>
      </aside>

      {/* ── Mobile drawer ───────────────────────────────────────────── */}
      {drawerOpen && (
        <div className={cm.cn('fixed inset-0 z-50 md:hidden', cm.flex({}))}>
          <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
          <div
            id="mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={t('nav.menu', {}, { defaultValue: 'Menu' })}
            data-mol-id="mobile-drawer"
            className={cm.cn(
              cm.flex({ direction: 'col' }),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'relative w-[280px] max-w-[85vw] h-full bg-surface-container-low shadow-lg',
            )}
          >
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between' }),
                cm.sp('px', 4),
                cm.sp('py', 4),
              )}
            >
              <span
                className={cm.cn(
                  cm.textSize('lg'),
                  'font-extrabold tracking-tight text-on-surface',
                )}
              >
                {APP_NAME}
              </span>
              <button
                type="button"
                onClick={closeDrawer}
                aria-label={t('common.close', {}, { defaultValue: 'Close menu' })}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.w(9),
                  cm.h(9),
                  'rounded-full text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors min-h-[36px] min-w-[36px]',
                )}
              >
                <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
                  close
                </span>
              </button>
            </div>
            <NavList onNavigate={closeDrawer} />
            <div className={cm.cn(cm.sp('p', 4), cm.stack(2))}>
              <UserCard onNavigate={closeDrawer} />
              <SignOutButton onSignOut={handleSignOut} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
