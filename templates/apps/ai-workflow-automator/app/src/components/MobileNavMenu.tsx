/**
 * Template-local mobile navigation (fleet pattern).
 *
 * Below the `md` breakpoint (768px) the fixed 260px sidebar cannot fit next
 * to content, so every authed page renders this component instead: a
 * hamburger button in the sticky top bar plus a slide-over drawer carrying
 * the same grouped links the sidebar shows on desktop. The drawer closes on
 * link tap, overlay tap, or Escape, and locks body scroll while open.
 *
 * WorkflowSidebar hides itself with `hidden md:flex` and WorkflowAppShell
 * drops its fixed left margin below `md`; this component is the only nav
 * rendered on small screens.
 */
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { SafeLink } from './SafeLink.js'
import { GROUPS } from './WorkflowSidebar.js'

export function MobileNavMenu() {
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
    to === '/dashboard'
      ? location.pathname === '/' || location.pathname === '/dashboard'
      : location.pathname === to || location.pathname.startsWith(`${to}/`)

  return (
    <>
      <button
        type="button"
        aria-label={t('mobileNav.openMenu', {}, { defaultValue: 'Open navigation menu' })}
        aria-expanded={open}
        aria-controls="mobile-nav-drawer"
        data-mol-id="mobile-nav-trigger"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          'md:hidden h-10 w-10 shrink-0 rounded-lg cursor-pointer transition-colors',
        )}
        style={{ color: 'var(--color-foreground-secondary)' }}
        onClick={() => setOpen(true)}
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          menu
        </span>
      </button>
      {open &&
        // Portal to <body>: the blurred sticky header (backdrop-filter) is a
        // containing block for fixed descendants, which would clamp this
        // fixed-position overlay to the header's own 72px box.
        createPortal(
          <div
            className="md:hidden"
            role="presentation"
            style={{ position: 'fixed', inset: 0, zIndex: 60 }}
          >
            {/* Overlay */}
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            {/* Drawer — same brand header + grouped nav as the desktop sidebar.
              Geometry is pinned inline: the stretch (top+bottom) must win over
              any utility combination. */}
            <nav
              id="mobile-nav-drawer"
              aria-label={t('mobileNav.drawerLabel', {}, { defaultValue: 'Main navigation' })}
              className={cm.cn(cm.flex({ direction: 'col' }), 'shadow-2xl overflow-y-auto')}
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                width: 280,
                maxWidth: '85vw',
                background: 'var(--color-sidebar)',
                borderRight: '1px solid var(--color-sidebar-border)',
              }}
            >
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('px', 5),
                  cm.sp('py', 5),
                )}
                style={{ borderBottom: '1px solid var(--color-sidebar-border)' }}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'rounded-xl shadow-lg',
                  )}
                  style={{
                    width: 36,
                    height: 36,
                    background:
                      'linear-gradient(135deg, var(--color-node-trigger), var(--color-node-condition))',
                  }}
                >
                  <span
                    className={cm.cn('material-symbols-outlined', cm.textSize('lg'))}
                    style={{ color: 'white', fontVariationSettings: "'FILL' 1" }}
                  >
                    bolt
                  </span>
                </div>
                <div className={cm.cn(cm.flex({ direction: 'col' }), 'min-w-0')}>
                  <span
                    className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'truncate')}
                    style={{ color: 'var(--color-sidebar-text)', letterSpacing: '-0.01em' }}
                  >
                    {t(
                      'workflowSidebar.brand',
                      { appName: APP_NAME },
                      { defaultValue: '{{appName}}' },
                    )}
                  </span>
                  <span
                    className={cm.textSize('xs')}
                    style={{ color: 'var(--color-sidebar-text-muted)' }}
                  >
                    {t('workflowSidebar.tagline', {}, { defaultValue: 'Intelligence in motion' })}
                  </span>
                </div>
              </div>

              <div className={cm.cn(cm.sp('p', 3), 'flex-1')}>
                {GROUPS.map((group) => (
                  <div key={group.labelKey} className={cm.sp('mb', 5)}>
                    <div
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('mb', 2),
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        'uppercase tracking-widest',
                      )}
                      style={{ color: 'var(--color-sidebar-eyebrow)' }}
                    >
                      {t(group.labelKey, {}, { defaultValue: group.defaultLabel })}
                    </div>
                    <ul className={cm.cn(cm.flex({ direction: 'col' }), 'gap-1')}>
                      {group.items.map((item) => {
                        const active = isActive(item.to)
                        return (
                          <li key={item.to}>
                            <SafeLink
                              to={item.to}
                              data-mol-id={item.molId}
                              className={cm.cn(
                                cm.flex({ align: 'center', gap: 'sm' }),
                                cm.sp('px', 3),
                                'rounded-lg transition-colors relative h-11',
                              )}
                              style={{
                                color: active
                                  ? 'var(--color-sidebar-text)'
                                  : 'var(--color-sidebar-text-muted)',
                                background: active
                                  ? 'var(--color-sidebar-active-bg)'
                                  : 'transparent',
                              }}
                              onClick={() => setOpen(false)}
                            >
                              {active && (
                                <span
                                  className={'absolute left-0 top-2 bottom-2 rounded-r'}
                                  style={{
                                    width: 3,
                                    background: 'var(--color-sidebar-active-stripe)',
                                  }}
                                />
                              )}
                              <span
                                className={cm.cn('material-symbols-outlined', cm.textSize('xl'))}
                                style={{
                                  color: active
                                    ? 'var(--color-sidebar-text)'
                                    : 'var(--color-sidebar-text-muted)',
                                }}
                              >
                                {item.icon}
                              </span>
                              <span className={cm.textSize('sm') + ' ' + cm.fontWeight('medium')}>
                                {t(item.labelKey, {}, { defaultValue: item.defaultLabel })}
                              </span>
                            </SafeLink>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </nav>
          </div>,
          document.body,
        )}
    </>
  )
}
