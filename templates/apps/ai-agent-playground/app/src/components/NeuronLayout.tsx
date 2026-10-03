// Neuron's app shell — the SHARED `ResponsiveAppShell` compound from
// `@molecule/app-ui-react`. The shell owns the breakpoint split (768px, one
// chrome mounted per breakpoint): the desktop Sidebar and the mobile Drawer
// (full APG dialog — focus trap, Escape/backdrop close, scroll lock,
// auto-close on navigation) render the SAME nav element, and the mobile-only
// menu trigger is rendered by the shell's TopBar itself. The former
// hand-rolled hamburger/drawer state machine (MobileNavShell) and the
// matchMedia-conditioned desktop rail (SideNavBar + useIsMobile) are deleted
// with it.
import type { ReactElement } from 'react'
import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell, useIsDesktop } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { buildNavItems, type NavItem } from './nav-items.js'
import { TopBarActions } from './TopAppBar.js'

interface NeuronLayoutProps {
  title: string
  ctaLabel?: string
  ctaTo?: string
}

export function NeuronLayout({ title, ctaLabel, ctaTo }: NeuronLayoutProps): ReactElement {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()

  const items: NavItem[] = buildNavItems(t)

  // Single-active-item resolution: highlight the nav item whose path is the
  // longest prefix-match of the current pathname (never every ancestor).
  const activePath = items.reduce<string | null>((best, item) => {
    const isMatch = pathname === item.path || pathname.startsWith(`${item.path}/`)
    if (!isMatch) return best
    if (best === null) return item.path
    return item.path.length > best.length ? item.path : best
  }, null)

  // Same-route clicks append `#top` so the URL still changes (no dead links).
  const safeTarget = (to: string): string => {
    const samePath = pathname === to || pathname + '/' === to
    return samePath ? `${to.replace(/\/$/, '')}#top` : to
  }

  // One nav element for BOTH mounts — the shell instantiates only the
  // breakpoint's copy, so the links are never in the DOM twice.
  const nav = (
    <ul
      className={cm.cn(
        cm.flex({ direction: 'col', gap: 'xs' }),
        cm.fontWeight('medium'),
        cm.textSize('sm'),
        'font-body tracking-tight',
      )}
    >
      {items.map((item) => {
        const isActive = item.path === activePath
        return (
          <li key={item.path}>
            <Link
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('px', 3),
                'min-h-[44px] rounded border-l-2 py-2 transition-colors duration-200',
                isActive
                  ? cm.cn(
                      cm.sp('pl', 4),
                      'border-primary bg-surface/5 font-bold text-tertiary-fixed',
                    )
                  : cm.cn(
                      'border-transparent text-foreground-secondary hover:bg-surface/5 hover:text-foreground-tertiary',
                    ),
              )}
              data-mol-id={`nav-${item.path.replace(/^\//, '').replace(/\//g, '-')}`}
              aria-current={isActive ? 'page' : undefined}
              to={safeTarget(item.path)}
            >
              <span
                className={cm.cn('material-symbols-outlined shrink-0')}
                style={{ fontSize: 20 }}
                aria-hidden="true"
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          </li>
        )
      })}
    </ul>
  )

  const brand = (
    <Link to={safeTarget('/dashboard')} data-mol-id="nav-brand" className={cm.cn('block')}>
      <h1 className={cm.cn(cm.textSize('xl'), 'font-black text-tertiary-fixed tracking-widest')}>
        {t(
          'sideNav.brandName',
          { appName: APP_NAME.toUpperCase() },
          { defaultValue: '{{appName}}' },
        )}
      </h1>
      <p
        className={cm.cn(
          cm.textSize('xs'),
          cm.sp('mt', 1),
          'font-mono uppercase tracking-wider text-foreground-secondary',
        )}
      >
        {t('sideNav.brandVersion', {}, { defaultValue: 'V2.0.4' })}
      </p>
    </Link>
  )

  const navAriaLabel = t('mobileNav.primaryNav', {}, { defaultValue: 'Primary navigation' })

  // Page-title block for the top bar — the desktop TopAppBar's leading title,
  // kept on both breakpoints so the current surface is always named.
  const pageTitle = (
    <span
      className={cm.cn(
        cm.fontWeight('bold'),
        cm.textSize('sm'),
        'truncate font-mono uppercase tracking-wider text-violet-400',
      )}
    >
      {title}
    </span>
  )

  // The shell's TopBar is mobile-only: a non-mobileOnly TopBar becomes a
  // squeezed flex-row COLUMN on desktop (the shared shell's documented
  // composition is mobileOnly + desktop chrome elsewhere). On desktop the
  // page title + actions render as the content column's header strip — only
  // one copy mounts per breakpoint.
  const topBarActions = <TopBarActions ctaLabel={ctaLabel} ctaTo={ctaTo} />
  const isDesktop = useIsDesktop()

  return (
    <ResponsiveAppShell sidebarWidth={260} className="bg-surface-container-lowest text-on-surface">
      {/*
        Top bar (mobile only): the shell renders the 44px menu trigger
        itself below 768px. Carries the page title + the former TopAppBar
        actions (search popover, theme, notifications, user menu, page CTA).
      */}
      <ResponsiveAppShell.TopBar
        mobileOnly
        brand={pageTitle}
        actions={topBarActions}
        className="bg-surface-container-lowest/80 backdrop-blur-xl"
      />

      {/*
        Desktop sidebar (>=768px): the dark contrast rail — brand block + nav,
        with the theme toggle in the shell's bordered footer row.
      */}
      <ResponsiveAppShell.Sidebar
        navLabel={navAriaLabel}
        className="bg-on-tertiary-fixed border-r border-outline-variant/15 dark:bg-surface-container-lowest"
        dataMolId="side-nav-bar"
      >
        <div className={cm.cn(cm.sp('px', 2), cm.sp('pb', 6))}>{brand}</div>
        {nav}
      </ResponsiveAppShell.Sidebar>

      {/*
        Mobile drawer (<768px): the shell's APG dialog over the SAME nav
        element, with the brand block in its header.
      */}
      <ResponsiveAppShell.Drawer
        navLabel={navAriaLabel}
        header={brand}
        className="bg-on-tertiary-fixed border-r border-outline-variant/15 dark:bg-surface-container-lowest"
      >
        {nav}
      </ResponsiveAppShell.Drawer>

      <ResponsiveAppShell.Content>
        {isDesktop && (
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between', gap: 3 }),
              'h-12 shrink-0 items-center border-b border-surface/5 bg-surface-container-lowest/80 px-6 backdrop-blur-xl',
            )}
          >
            {pageTitle}
            {topBarActions}
          </div>
        )}
        <div className={cm.cn(cm.sp('p', 6), cm.minH('screen'), 'bg-surface-container')}>
          <Outlet />
        </div>
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}

export default NeuronLayout
