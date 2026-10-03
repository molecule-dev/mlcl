import type { FormEvent, ReactElement } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell, useIsDesktop } from '@molecule/app-ui-react'

import { APP_TAGLINE } from '../branding.js'
import { BrandWordmark } from './BrandWordmark.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

/**
 * Sidebar + top bar shell shared by all authed Embark screens — the SHARED
 * `ResponsiveAppShell` compound from `@molecule/app-ui-react`.
 *
 * The shell owns the breakpoint split (768px, one chrome mounted per
 * breakpoint): the desktop sidebar and the mobile drawer (full APG dialog —
 * focus trap, Escape/backdrop close, scroll lock, auto-close on navigation)
 * render the SAME nav element, and the mobile-only top bar renders the 44px
 * menu trigger itself. The former always-mounted off-canvas sidebar (CSS
 * translate, so its links stayed tab-reachable while hidden), the local
 * drawer state machine, the matchMedia effect and the missing
 * `aria-controls`/scroll-lock are all deleted with it.
 *
 * Nav items/labels (i18n), `layout-sidebar` / `layout-search-input`
 * data-mol-ids, the Embark teal/purple palette and the UserMenu/ThemeToggle
 * placement are preserved from the previous shell. The global search form is
 * desktop-only (the Team directory page carries its own search on phones).
 */

interface NavItem {
  to: string
  iconKey: string
  labelKey: string
  defaultLabel: string
}

const NAV_PRIMARY: NavItem[] = [
  {
    to: '/dashboard',
    iconKey: 'space_dashboard',
    labelKey: 'nav.dashboard',
    defaultLabel: 'Dashboard',
  },
  { to: '/checklist', iconKey: 'checklist', labelKey: 'nav.checklist', defaultLabel: 'Checklist' },
  { to: '/timeline', iconKey: 'timeline', labelKey: 'nav.timeline', defaultLabel: '30/60/90' },
  { to: '/training', iconKey: 'school', labelKey: 'nav.training', defaultLabel: 'Training' },
  {
    to: '/documents',
    iconKey: 'description',
    labelKey: 'nav.documents',
    defaultLabel: 'Documents',
  },
]

const NAV_PEOPLE: NavItem[] = [
  { to: '/team', iconKey: 'groups', labelKey: 'nav.team', defaultLabel: 'Team' },
  { to: '/profile', iconKey: 'person', labelKey: 'nav.profile', defaultLabel: 'My Profile' },
  {
    to: '/notifications',
    iconKey: 'notifications',
    labelKey: 'nav.notifications',
    defaultLabel: 'Notifications',
  },
  { to: '/settings', iconKey: 'settings', labelKey: 'nav.settings', defaultLabel: 'Settings' },
]

function NavSection({ heading, items }: { heading: string; items: NavItem[] }): ReactElement {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.sp('mb', 6)}>
      <p
        className={cm.cn(
          cm.sp('px', 4),
          cm.sp('mb', 2),
          'text-[10px] font-black uppercase tracking-[0.18em] text-on-surface-variant',
        )}
      >
        {heading}
      </p>
      <ul className={cm.cn(cm.flex({ direction: 'col' }), cm.sp('px', 2))}>
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('px', 3),
                  'min-h-[44px] rounded-lg text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-primary/10 text-primary border-l-[3px] border-primary'
                    : 'text-on-surface hover:bg-surface-container-low',
                )
              }
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                {item.iconKey}
              </span>
              <span>{t(item.labelKey, {}, { defaultValue: item.defaultLabel })}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function EmployeeOnboardingLayout(): ReactElement {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()

  const onSearchSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault()
    const q = new FormData(e.currentTarget).get('q')
    if (typeof q === 'string' && q.trim()) {
      navigate(`/team?q=${encodeURIComponent(q.trim())}`)
      e.currentTarget.reset()
    }
  }

  const brand = (
    <Link
      to="/dashboard"
      data-mol-id="nav-brand"
      className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('px', 5), cm.sp('py', 5))}
    >
      <div>
        <BrandWordmark as="span" />
        <p className="text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
          {t('layout.tagline', {}, { defaultValue: APP_TAGLINE })}
        </p>
      </div>
    </Link>
  )

  // One nav element for BOTH mounts — the shell instantiates only the
  // breakpoint's copy, so the links are never in the DOM twice.
  const nav = (
    <div className={cm.sp('py', 4)}>
      <NavSection
        heading={t('layout.section.onboarding', {}, { defaultValue: 'Onboarding' })}
        items={NAV_PRIMARY}
      />
      <NavSection heading={t('nav.you', {}, { defaultValue: 'You' })} items={NAV_PEOPLE} />
    </div>
  )

  const searchForm = isDesktop ? (
    <form
      className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}
      role="search"
      onSubmit={onSearchSubmit}
    >
      <span
        className="material-symbols-outlined text-on-surface-variant"
        style={{ fontSize: '20px' }}
      >
        search
      </span>
      <input
        type="search"
        name="q"
        data-mol-id="layout-search-input"
        placeholder={t(
          'layout.searchTeammates',
          {},
          { defaultValue: 'Search teammates by name or role…' },
        )}
        className="bg-transparent outline-none"
        style={{ width: '320px' }}
      />
    </form>
  ) : null

  return (
    <ResponsiveAppShell sidebarWidth={260}>
      {/*
        Mobile top bar (<768px): the shell's 44px menu trigger + theme +
        user menu — the hand-rolled header it replaces, one for one.
        Desktop returns null (mobileOnly).
      */}
      <ResponsiveAppShell.TopBar mobileOnly actions={<ThemeToggle />} />

      {/*
        Desktop sidebar (>=768px): brand + the sectioned nav. Null below
        768px — the drawer carries the same nav there.
      */}
      <ResponsiveAppShell.Sidebar dataMolId="layout-sidebar">
        {brand}
        {nav}
      </ResponsiveAppShell.Sidebar>

      {/*
        Mobile drawer (<768px): the shell's APG dialog over the SAME nav
        element. `h-full` restores the full-height left-panel geometry (the
        shared panel ships no height token). Same `layout-sidebar` locator
        as the sidebar — the two never mount together.
      */}
      <ResponsiveAppShell.Drawer dataMolId="layout-sidebar" header={brand} className="h-full">
        {nav}
      </ResponsiveAppShell.Drawer>

      {/*
        Content column: on desktop the top bar (search + actions) sits above
        the routed page; on mobile the wrapper passes the shell column's
        Content straight through.
      */}
      <div className={cm.cn(cm.flex({ direction: 'col' }), cm.flex1, 'min-w-0')}>
        {isDesktop && (
          <ResponsiveAppShell.TopBar
            actions={
              <>
                {searchForm}
                <ThemeToggle />
                <UserMenu />
              </>
            }
          />
        )}
        <ResponsiveAppShell.Content className="eo-page-pad">
          <Outlet />
        </ResponsiveAppShell.Content>
      </div>
    </ResponsiveAppShell>
  )
}
