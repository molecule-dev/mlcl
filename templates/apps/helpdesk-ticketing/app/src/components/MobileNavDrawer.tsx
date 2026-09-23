import { useEffect } from 'react'
import { Link, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { closeMobileNav, useMobileNav } from '../lib/mobileNav.js'
import { SettingsPanel } from './SettingsPanel.js'

export interface MobileNavLink {
  to: string
  /** Route prefix matched with startsWith (exact for '/'). */
  match: (pathname: string) => boolean
  icon: string
  labelKey: string
  labelFallback: string
}

/**
 * Mobile navigation shell (below the md breakpoint): a slide-in drawer
 * carrying the same links as the desktop sidebar, plus the user panel.
 * Rendered by SideNavBar / SideNav — pages render exactly one sidebar
 * variant, so exactly one drawer exists per screen.
 *
 * The hamburger trigger lives in each page's top bar (see useMobileNav).
 */
export function MobileNavDrawer({ links }: { links: MobileNavLink[] }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { open, close } = useMobileNav()
  const location = useLocation()

  // Close on any navigation — the drawer overlays the page it links to.
  useEffect(() => {
    close()
  }, [location.pathname, close])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, close])

  if (!open) return null
  return (
    <div className={cm.cn('md:hidden')} data-mol-id="mobile-nav">
      {/* Backdrop */}
      <button
        type="button"
        aria-label={t('mobileNav.closeMenu', {}, { defaultValue: 'Close navigation' })}
        className={cm.cn('fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm')}
        onClick={close}
      />
      {/* Drawer panel */}
      <aside
        id="mobile-nav"
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          'fixed inset-y-0 left-0 z-[61] w-[280px] max-w-[85vw] bg-surface-secondary shadow-xl overflow-y-auto',
          'py-6 px-4',
        )}
        role="dialog"
        aria-modal="true"
        aria-label={t('mobileNav.menu', {}, { defaultValue: 'Navigation' })}
      >
        <nav className={cm.cn(cm.stack(1), cm.flex1)} data-mol-id="mobile-nav-links">
          {links.map((link) => (
            <LinkItem key={link.to} cm={cm} link={link} active={link.match(location.pathname)} />
          ))}
        </nav>
        {/* Same user panel the desktop sidebar footer hosts (identity, settings, sign out). */}
        <div className={cm.cn(cm.sp('pt', 4), 'mt-auto border-t border-border/50')}>
          <SettingsPanel onClose={close} />
        </div>
      </aside>
    </div>
  )
}

function LinkItem({
  cm,
  link,
  active,
}: {
  cm: ReturnType<typeof getClassMap>
  link: MobileNavLink
  active: boolean
}) {
  const { t } = useTranslation()
  return (
    <Link
      to={link.to}
      aria-current={active ? 'page' : undefined}
      onClick={closeMobileNav}
      className={cm.cn(
        cm.flex({ align: 'center', gap: 3 }),
        cm.sp('px', 4),
        cm.sp('py', 3),
        cm.textSize('sm'),
        'rounded-lg transition-colors',
        active
          ? cm.cn(cm.fontWeight('semibold'), 'bg-primary-fixed/40 text-primary')
          : 'text-foreground-secondary hover:text-foreground hover:bg-border/40',
      )}
    >
      <span className={cm.cn('material-symbols-outlined')} data-icon={link.icon}>
        {link.icon}
      </span>
      {t(link.labelKey, {}, { defaultValue: link.labelFallback })}
    </Link>
  )
}

/**
 * Hamburger button for page top bars — visible below md only. All top bars
 * are `fixed … md:left-[240px]`, so this is the only mobile nav affordance
 * they need to host.
 */
export function MobileNavHamburger() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { open, toggle } = useMobileNav()
  return (
    <button
      type="button"
      className={cm.cn(
        cm.sp('p', 2),
        cm.roundedFull,
        'md:hidden text-on-surface-variant hover:bg-surface-container-high transition-colors -ml-1',
      )}
      aria-label={t('mobileNav.openMenu', {}, { defaultValue: 'Open navigation' })}
      aria-expanded={open}
      aria-controls="mobile-nav"
      data-mol-id="mobile-nav-trigger"
      onClick={toggle}
    >
      <span className={cm.cn('material-symbols-outlined')} data-icon="menu">
        menu
      </span>
    </button>
  )
}

/**
 * Mobile-only page header for the pages that ship no top bar at all
 * (New Ticket, New Article, Notifications) — hamburger + page label on a
 * sticky bar, so the navigation drawer is reachable from every screen.
 * The label is a span (not a heading) because the page itself renders the
 * real h1 right below.
 */
export function MobilePageHeader({ title }: { title: string }) {
  const cm = getClassMap()
  return (
    <header
      className={cm.cn(
        cm.flex({ align: 'center', gap: 2 }),
        'md:hidden sticky top-0 z-30 h-14 px-3 bg-surface/90 backdrop-blur-xl',
      )}
    >
      <MobileNavHamburger />
      <span
        className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'text-on-surface truncate')}
      >
        {title}
      </span>
    </header>
  )
}
