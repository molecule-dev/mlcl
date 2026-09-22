/**
 * Mobile app chrome (rendered ONLY below the `md` breakpoint — 768px).
 *
 * Desktop renders the 260px `VaultSidebar` rail, which would crush a
 * phone's content column. Below `md` the rail is not rendered at all
 * and this shell takes over: a sticky top bar (hamburger + brand +
 * vault-strength pill + user menu) and a slide-in nav drawer carrying
 * the SAME inventory via `VaultSidebarContent`. Follows the fleet
 * mobile-shell pattern (itinerary-planner's MobileTopBar) —
 * conditionally RENDERED via matchMedia, not CSS-hidden, so nav
 * `data-testid`s / aria labels are never duplicated in the DOM.
 */
import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'
import { type VaultCategory, type VaultFolder, VaultSidebarContent } from './VaultSidebar.js'

const DESKTOP_QUERY = '(min-width: 768px)'

/** True below the `md` breakpoint (the drawer-shell regime). */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && !window.matchMedia(DESKTOP_QUERY).matches,
  )
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY)
    const onChange = (e: MediaQueryListEvent) => setIsMobile(!e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return isMobile
}

const FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

interface MobileVaultShellProps {
  categories: VaultCategory[]
  folders: VaultFolder[]
  /** Vault strength 0-100, shown as a compact pill in the top bar. */
  vaultStrength: number
  children: React.ReactNode
}

export function MobileVaultShell({
  categories,
  folders,
  vaultStrength,
  children,
}: MobileVaultShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  // Any navigation closes the drawer.
  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  // While open: Escape closes, background scroll locks.
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

  const openLabel = t('vaultSidebar.mobileNavOpen', {}, { defaultValue: 'Open navigation menu' })
  const closeLabel = t('vaultSidebar.mobileNavClose', {}, { defaultValue: 'Close navigation menu' })
  const drawerLabel = t('vaultSidebar.aria', {}, { defaultValue: 'Vault navigation' })

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-surface-container-low/40 text-on-surface antialiased',
      )}
    >
      <header
        data-mol-id="mobile-topbar"
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.sp('px', 3),
          'sticky top-0 z-40 h-14 bg-surface/95 backdrop-blur-md border-b border-primary-light/40',
        )}
      >
        <button
          type="button"
          data-mol-id="nav-toggle"
          aria-label={openLabel}
          aria-expanded={drawerOpen}
          aria-controls="sigil-nav-drawer"
          onClick={() => setDrawerOpen(true)}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'rounded-lg',
            cm.textSize('2xl'),
            'h-11 w-11 shrink-0 text-on-surface-variant hover:bg-surface-container',
            FOCUS_RING,
          )}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            menu
          </span>
        </button>

        <Link
          to="/vault"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.fontWeight('bold'),
            'text-primary min-w-0 h-11',
            FOCUS_RING.concat(' rounded-md'),
          )}
        >
          <span
            className="material-symbols-outlined text-[20px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
            aria-hidden="true"
          >
            diamond
          </span>
          <span className="font-extrabold tracking-tighter text-[18px]">{APP_NAME}</span>
        </Link>

        <div className={cm.cn(cm.flex1)} />

        <span
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 2),
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            'shrink-0 rounded-full py-1 bg-success-light text-success',
          )}
          title={t(
            'vaultSidebar.strength',
            { strength: vaultStrength },
            { defaultValue: 'Overall strength {{strength}}%' },
          )}
        >
          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
            shield
          </span>
          {vaultStrength}%
        </span>

        <UserMenu />
      </header>

      {children}

      {/* Slide-in drawer + scrim. aria-hidden/hidden when closed so the
          duplicate nav inventory is never in the a11y tree twice. */}
      <div
        id="sigil-nav-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={drawerLabel}
        hidden={!drawerOpen}
        className={cm.cn('fixed inset-0 z-50', drawerOpen ? '' : 'pointer-events-none')}
      >
        {/* Scrim */}
        <button
          type="button"
          tabIndex={-1}
          aria-label={closeLabel}
          onClick={closeDrawer}
          className={cm.cn(
            'absolute inset-0 h-full w-full bg-indigo-950/40 backdrop-blur-[2px] transition-opacity duration-200',
            drawerOpen ? 'opacity-100' : 'opacity-0',
          )}
        />
        {/* Panel */}
        <div
          className={cm.cn(
            cm.flex({ direction: 'col' }),
            cm.h('full'),
            'absolute left-0 top-0 w-[300px] max-w-[85vw] bg-surface border-r border-primary-light/40 shadow-xl transition-transform duration-200',
            drawerOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.sp('px', 6),
              'h-14 shrink-0 border-b border-primary-light/40',
            )}
          >
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.fontWeight('bold'),
                'text-[20px] tracking-tight text-primary',
              )}
            >
              <span
                className="material-symbols-outlined text-[20px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
                aria-hidden="true"
              >
                diamond
              </span>
              <span className="font-extrabold tracking-tighter">{APP_NAME}</span>
            </span>
            <button
              type="button"
              aria-label={closeLabel}
              onClick={closeDrawer}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                'rounded-lg',
                cm.textSize('2xl'),
                'h-11 w-11 text-on-surface-variant hover:bg-surface-container',
                FOCUS_RING,
              )}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                close
              </span>
            </button>
          </div>
          <VaultSidebarContent
            categories={categories}
            folders={folders}
            onNavigate={closeDrawer}
            showBrand={false}
          />
        </div>
      </div>
    </div>
  )
}

export default MobileVaultShell
