/**
 * Template-local mobile navigation shell (fleet pattern).
 *
 * Below the `md` breakpoint (768px) the fixed sidebars cannot fit next to
 * content, so every authed page renders this component instead: a hamburger
 * button in the sticky top area plus a slide-over drawer carrying the same
 * links the sidebar shows on desktop. The drawer closes on link tap, overlay
 * tap, or Escape, and locks body scroll while open.
 *
 * Each page hides its desktop sidebar with `hidden md:flex` and drops its
 * fixed left margin below `md`; this component is the only nav that renders
 * on small screens.
 */
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface MobileNavItem {
  to: string
  label: string
  icon?: string
}

/** The app-level nav every sidebar shows — shared by all mobile drawers. */
export function useMainNavItems(): MobileNavItem[] {
  const { t } = useTranslation()
  return [
    { to: '/', label: t('nav.dashboard', {}, { defaultValue: 'Dashboard' }), icon: 'dashboard' },
    { to: '/bots', label: t('nav.myBots', {}, { defaultValue: 'My Bots' }), icon: 'smart_toy' },
    {
      to: '/knowledge-base',
      label: t('nav.knowledgeBase', {}, { defaultValue: 'Knowledge Base' }),
      icon: 'storage',
    },
    {
      to: '/test-chat',
      label: t('nav.testChat', {}, { defaultValue: 'Test Chat' }),
      icon: 'forum',
    },
    {
      to: '/integrations',
      label: t('nav.integrations', {}, { defaultValue: 'Integrations' }),
      icon: 'extension',
    },
    {
      to: '/settings',
      label: t('nav.settings', {}, { defaultValue: 'Settings' }),
      icon: 'settings',
    },
  ]
}

function MobileNavMenu({ items }: { items: MobileNavItem[] }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const location = useLocation()
  const [open, setOpen] = useState(false)

  // Close the drawer whenever the route changes (back/forward too).
  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  // Escape closes; body scroll is locked while the drawer is open.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  const isActive = (to: string) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)

  return (
    <>
      <button
        type="button"
        aria-label={t('mobileNav.openMenu', {}, { defaultValue: 'Open navigation menu' })}
        aria-expanded={open}
        aria-controls="mobile-nav-drawer"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.roundedFull,
          'md:hidden h-10 w-10 shrink-0 text-on-surface-variant hover:bg-surface-container-low transition-colors',
        )}
        onClick={() => setOpen(true)}
      >
        <span className={cm.cn('material-symbols-outlined')} data-icon="menu" aria-hidden="true">
          menu
        </span>
      </button>
      {open && (
        <div className={cm.cn('md:hidden fixed inset-0 z-[60]')} role="presentation">
          {/* Overlay */}
          <div
            className={cm.cn('absolute inset-0 bg-black/40 backdrop-blur-sm')}
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          {/* Drawer */}
          <nav
            id="mobile-nav-drawer"
            aria-label={t('mobileNav.drawerLabel', {}, { defaultValue: 'Main navigation' })}
            className={cm.cn(
              cm.flex({ direction: 'col' }),
              cm.sp('p', 4),
              'absolute left-0 top-0 bottom-0 w-[280px] max-w-[85vw] bg-surface text-on-surface shadow-2xl overflow-y-auto',
            )}
          >
            <div
              className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 2))}
            >
              <span className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}>
                {t('mobileNav.menuTitle', {}, { defaultValue: 'Menu' })}
              </span>
              <button
                type="button"
                aria-label={t('mobileNav.closeMenu', {}, { defaultValue: 'Close navigation menu' })}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.roundedFull,
                  'h-10 w-10 text-on-surface-variant hover:bg-surface-container-low transition-colors',
                )}
                onClick={() => setOpen(false)}
              >
                <span
                  className={cm.cn('material-symbols-outlined')}
                  data-icon="close"
                  aria-hidden="true"
                >
                  close
                </span>
              </button>
            </div>
            <div className={cm.cn(cm.stack(1))}>
              {items.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={isActive(item.to) ? 'page' : undefined}
                  className={cm.cn(
                    cm.flex({ align: 'center' }),
                    cm.sp('px', 3),
                    cm.textSize('sm'),
                    cm.fontWeight(isActive(item.to) ? 'bold' : 'medium'),
                    'gap-3 py-3 rounded-xl transition-colors',
                    isActive(item.to)
                      ? 'bg-primary/10 text-primary'
                      : 'text-on-surface-variant hover:bg-surface-container-low',
                  )}
                >
                  {item.icon && (
                    <span
                      className={cm.cn('material-symbols-outlined')}
                      data-icon={item.icon}
                      aria-hidden="true"
                    >
                      {item.icon}
                    </span>
                  )}
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </nav>
        </div>
      )}
    </>
  )
}

export default MobileNavMenu
export { MobileNavMenu }
