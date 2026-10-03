import type { CSSProperties, FormEvent, ReactElement } from 'react'
import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'

import { useAuth, useTheme, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell, useIsDesktop } from '@molecule/app-ui-react'

import { BrandWordmark } from './BrandWordmark.js'
import { UserMenu } from './UserMenu.js'

/**
 * Authenticated shell for the Nexo CRM — the SHARED `ResponsiveAppShell`
 * compound from `@molecule/app-ui-react`.
 *
 * The shell owns the breakpoint split (768px, one chrome mounted per
 * breakpoint): the desktop sidebar and the mobile drawer (full APG dialog —
 * focus trap, Escape/backdrop close, scroll lock, auto-close on navigation)
 * render the SAME nav element, and the mobile-only top bar renders the 44px
 * menu trigger itself. The former always-mounted off-canvas sidebar (CSS
 * translate, so its links stayed tab-reachable while hidden), the local
 * drawer/overlay state machine and the hydration-spinner gate are deleted
 * with it.
 *
 * Nav targets/labels (i18n), the `nav-*` / `crm-sidebar` / `crm-nav` /
 * `crm-topbar` / `crm-main` / `sidebar-user-profile` data-mol-ids, the
 * search → Contacts/Companies routing and the Add Contact/Add Company
 * button are preserved. The global search input is desktop-only — the
 * Contacts/Companies pages carry their own search on phones (the fleet
 * pattern; the shared top bar's actions row cannot shrink an input at 390px).
 */

const NAV_ITEMS = [
  { to: '/', label: 'nav.dashboard', icon: 'dashboard', defaultLabel: 'Dashboard', end: true },
  { to: '/contacts', label: 'nav.contacts', icon: 'person', defaultLabel: 'Contacts', end: false },
  {
    to: '/companies',
    label: 'nav.companies',
    icon: 'domain',
    defaultLabel: 'Companies',
    end: false,
  },
  { to: '/deals', label: 'nav.deals', icon: 'handshake', defaultLabel: 'Deals', end: false },
  {
    to: '/activities',
    label: 'nav.activities',
    icon: 'schedule',
    defaultLabel: 'Activities',
    end: false,
  },
  { to: '/reports', label: 'nav.reports', icon: 'bar_chart', defaultLabel: 'Reports', end: false },
]

const NAV_LINK_STYLE = (isActive: boolean): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '10px 16px',
  // 44px — the fleet's minimum tap target (the drawer carries these links
  // on mobile; desktop just renders the slightly taller row).
  minHeight: '44px',
  // primary #2563eb was 4.23:1 on primary-light #dbeafe (axe serious); primary-dark = 5.5:1
  color: isActive ? 'var(--mol-color-primary-dark)' : 'var(--mol-color-text-secondary)',
  backgroundColor: isActive ? 'var(--mol-color-primary-light)' : 'transparent',
  borderRadius: '12px',
  fontSize: '14px',
  fontWeight: 500,
  fontFamily: 'Inter, sans-serif',
  textDecoration: 'none',
  letterSpacing: '-0.01em',
  transition: 'all 150ms ease',
})

export function CrmLayout(): ReactElement {
  const { t } = useTranslation()
  const { mode } = useTheme()
  const { user } = useAuth()
  const cm = getClassMap()
  const location = useLocation()
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const [searchQuery, setSearchQuery] = useState('')

  // Get user display name safely
  const userName = (user as Record<string, unknown> | undefined)?.name as string | undefined
  const userInitial = (userName ?? '?')[0].toUpperCase()

  const onSearchSubmit = (e: FormEvent): void => {
    e.preventDefault()
    const q = searchQuery.trim()
    const base = location.pathname.startsWith('/companies') ? '/companies' : '/contacts'
    navigate(q ? `${base}?q=${encodeURIComponent(q)}` : base)
  }

  const brand = (
    // Exemplar shell pattern: ONE Link wraps the wordmark (rendered
    // pass-through via as="span") + subtitle, at the 44px tap-target floor.
    <Link
      to="/"
      data-mol-id="nav-brand"
      className={cm.cn(cm.flex({ align: 'center' }))}
      style={{ gap: '12px', padding: '0 8px', minHeight: '44px' }}
    >
      <BrandWordmark size="sm" as="span" />
      <div>
        <span
          // outline (#94a3b8) was 2.56:1 on white (axe serious) — use the muted-text token
          style={{
            fontSize: '11px',
            color: 'var(--color-on-surface-variant)',
            lineHeight: '16px',
          }}
        >
          {t('app.subtitle', {}, { defaultValue: 'Enterprise Workspace' })}
        </span>
      </div>
    </Link>
  )

  // One nav element for BOTH mounts — the shell instantiates only the
  // breakpoint's copy, so the `nav-*` links are never in the DOM twice.
  const nav = (
    <div
      data-mol-id="crm-nav"
      style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}
    >
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          data-mol-id={`nav-${item.label.split('.')[1]}`}
          style={({ isActive }) => NAV_LINK_STYLE(isActive)}
        >
          {({ isActive }) => (
            <>
              <span
                className={cm.fv5b245ffa}
                style={{
                  fontSize: '20px',
                  fontVariationSettings: isActive ? "'FILL' 1" : undefined,
                }}
              >
                {item.icon}
              </span>
              <span>{t(item.label, {}, { defaultValue: item.defaultLabel })}</span>
            </>
          )}
        </NavLink>
      ))}
    </div>
  )

  const settingsLink = (
    <NavLink
      to="/settings"
      data-mol-id="nav-settings"
      style={({ isActive }) => ({ ...NAV_LINK_STYLE(isActive), width: '100%' })}
    >
      {({ isActive }) => (
        <>
          <span
            className={cm.fv5b245ffa}
            style={{
              fontSize: '20px',
              fontVariationSettings: isActive ? "'FILL' 1" : undefined,
            }}
          >
            settings
          </span>
          <span>{t('nav.settings', {}, { defaultValue: 'Settings' })}</span>
        </>
      )}
    </NavLink>
  )

  const userProfile = (
    <div
      data-mol-id="sidebar-user-profile"
      className={cm.cn(cm.flex({ align: 'center' }))}
      style={{ gap: '12px', padding: '10px 16px', marginTop: '8px' }}
    >
      <div
        className={cm.cn(cm.flex({ align: 'center', justify: 'center' }))}
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '9999px',
          backgroundColor: 'var(--color-primary-container)',
          // on-error (white) on primary-container #dbeafe was 1.22:1 (axe serious);
          // on-primary-container is the matching M3 pair (12.4:1)
          color: 'var(--color-on-primary-container)',
          fontSize: '13px',
          fontWeight: 600,
          fontFamily: 'Inter, sans-serif',
          flexShrink: 0,
        }}
      >
        {userInitial}
      </div>
      <span
        style={{
          fontSize: '14px',
          fontWeight: 500,
          color: 'var(--mol-color-text)',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        {userName ?? t('nav.user', {}, { defaultValue: 'User' })}
      </span>
    </div>
  )

  const searchForm = isDesktop ? (
    <form
      role="search"
      className={cm.cn(cm.flex({ align: 'center' }))}
      style={{ width: 'clamp(14rem, 26vw, 36rem)' }}
      onSubmit={onSearchSubmit}
    >
      <div style={{ position: 'relative', width: '100%' }}>
        <span
          className={cm.fv5b245ffa}
          style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--color-stage-lead)',
            fontSize: '18px',
            pointerEvents: 'none',
          }}
        >
          search
        </span>
        <input
          data-mol-id="crm-search"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t(
            'search.placeholder',
            {},
            { defaultValue: 'Search contacts or companies...' },
          )}
          style={{
            width: '100%',
            backgroundColor: 'var(--mol-color-background-tertiary)',
            border: 'none',
            borderRadius: '12px',
            padding: '8px 16px 8px 40px',
            fontSize: '14px',
            fontWeight: 400,
            lineHeight: '20px',
            fontFamily: 'Inter, sans-serif',
            color: 'var(--mol-color-text)',
            outline: 'none',
          }}
        />
      </div>
    </form>
  ) : null

  const isCompanies = location.pathname.startsWith('/companies')

  // Notifications + the Add Contact/Add Company action — shared by the
  // mobile and desktop top bars (the old header rendered them on both).
  const navActions = (
    <>
      <button
        data-mol-id="btn-notifications"
        aria-label={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
        onClick={() => navigate('/notifications')}
        style={{
          position: 'relative',
          padding: '8px',
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          color: 'var(--mol-color-text-secondary)',
          display: 'flex',
          borderRadius: '12px',
        }}
      >
        <span className={cm.fv5b245ffa}>notifications</span>
        {/* No unread badge: the notifications feed is a static
            "all caught up" page — a hardcoded dot would advertise
            unread state that never exists. */}
      </button>

      <button
        data-mol-id={isCompanies ? 'btn-add-company' : 'btn-new-contact'}
        onClick={() => navigate(isCompanies ? '/companies?new=1' : '/contacts?new=1')}
        style={{
          backgroundColor: 'var(--color-primary-container)',
          // was on-error (white) on primary-container #dbeafe = 1.22:1 (axe serious);
          // on-primary-container is the matching M3 pair (12.4:1)
          color: 'var(--color-on-primary-container)',
          padding: '8px 20px',
          borderRadius: '12px',
          fontSize: '14px',
          fontWeight: 700,
          lineHeight: '20px',
          fontFamily: 'Inter, sans-serif',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        }}
      >
        <span className={cm.fv5b245ffa} style={{ fontSize: '14px' }}>
          add
        </span>
        {isCompanies
          ? t('topbar.addCompany', {}, { defaultValue: 'Add Company' })
          : t('topbar.addContact', {}, { defaultValue: 'Add Contact' })}
      </button>
    </>
  )

  return (
    <div
      data-mol-id="crm-layout"
      data-theme={mode}
      style={{
        fontFamily: 'Inter, sans-serif',
        backgroundColor: 'var(--mol-color-background-secondary)',
        color: 'var(--mol-color-text)',
      }}
    >
      <ResponsiveAppShell sidebarWidth={260}>
        {/*
          Mobile top bar (<768px): the shell's 44px menu trigger + the
          notifications / add / user actions — the hand-rolled header it
          replaces, one for one. Desktop returns null (mobileOnly).
        */}
        <ResponsiveAppShell.TopBar
          mobileOnly
          actions={
            <>
              {navActions}
              <UserMenu />
            </>
          }
        />

        {/*
          Desktop sidebar (>=768px): brand + the primary nav + the settings
          link and user profile in the bordered footer row — where the old
          sidebar kept them. Null below 768px — the drawer carries the same
          nav there.
        */}
        <ResponsiveAppShell.Sidebar
          dataMolId="crm-sidebar"
          footer={
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
              {settingsLink}
              {userProfile}
            </div>
          }
        >
          {brand}
          {nav}
        </ResponsiveAppShell.Sidebar>

        {/*
          Mobile drawer (<768px): the shell's APG dialog over the SAME nav
          element, with the same brand/settings/profile furniture. Same
          `crm-sidebar` locator as the sidebar — the two never mount
          together. `h-full` restores the full-height left-panel geometry.
        */}
        <ResponsiveAppShell.Drawer
          dataMolId="crm-sidebar"
          header={brand}
          footer={
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
              {settingsLink}
              {userProfile}
            </div>
          }
          className="h-full"
        >
          {nav}
        </ResponsiveAppShell.Drawer>

        {/*
          Content column: on desktop the top bar (search + actions) sits
          above the routed page; on mobile the wrapper passes the shell
          column's Content straight through.
        */}
        <div className={cm.cn(cm.flex({ direction: 'col' }), cm.flex1, 'min-w-0')}>
          {isDesktop && (
            <ResponsiveAppShell.TopBar
              dataMolId="crm-topbar"
              actions={
                <>
                  {searchForm}
                  {navActions}
                  <UserMenu />
                </>
              }
            />
          )}
          <ResponsiveAppShell.Content dataMolId="crm-main" style={{ padding: '24px 32px' }}>
            <Outlet />
          </ResponsiveAppShell.Content>
        </div>
      </ResponsiveAppShell>
    </div>
  )
}
