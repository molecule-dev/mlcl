import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { NimbusBrandMark } from './NimbusBrandMark.js'
import { NimbusStorageMeter } from './NimbusStorageMeter.js'

interface NavItem {
  to: string
  glyph: string
  labelKey: string
  defaultLabel: string
}

const PRIMARY_ITEMS: NavItem[] = [
  { to: '/files', glyph: 'folder_open', labelKey: 'nimbusSideNav.files', defaultLabel: 'My Files' },
  {
    to: '/shared',
    glyph: 'group',
    labelKey: 'nimbusSideNav.shared',
    defaultLabel: 'Shared with Me',
  },
  { to: '/starred', glyph: 'star', labelKey: 'nimbusSideNav.starred', defaultLabel: 'Starred' },
  { to: '/trash', glyph: 'delete', labelKey: 'nimbusSideNav.trash', defaultLabel: 'Trash' },
]

const SECONDARY_ITEMS: NavItem[] = [
  { to: '/recent', glyph: 'history', labelKey: 'nimbusSideNav.recent', defaultLabel: 'Recent' },
  { to: '/search', glyph: 'search', labelKey: 'nimbusSideNav.search', defaultLabel: 'Search' },
  { to: '/storage', glyph: 'cloud', labelKey: 'nimbusSideNav.storage', defaultLabel: 'Storage' },
  { to: '/upload', glyph: 'upload', labelKey: 'nimbusSideNav.upload', defaultLabel: 'Upload' },
  {
    to: '/settings',
    glyph: 'settings',
    labelKey: 'nimbusSideNav.settings',
    defaultLabel: 'Settings',
  },
]

/** Below this breakpoint the fixed sidebar is replaced by the mobile drawer. */
const DESKTOP_QUERY = '(min-width: 768px)'

/** Shared breakpoint hook — the sidebar and the layout's mobile trigger must
 *  agree on which chrome is mounted, so nav `data-mol-id`s are never
 *  duplicated in the DOM (the two modes are conditionally RENDERED, not
 *  CSS-hidden — fleet pattern from oncall-management's OncallLayout). */
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window === 'undefined' || window.matchMedia(DESKTOP_QUERY).matches,
  )
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY)
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return isDesktop
}

/**
 * Branded sidebar for authenticated cloud-file-manager pages.
 *
 * Anchored left with a brand wordmark, two grouped sections (Library /
 * Workspace), and a storage meter card pinned to the bottom — per
 * DESIGN.md `### Sidebar Navigation` measurements.
 *
 * Translated visual treatment from personal-finance/SideNavBar (active
 * accent, uppercase 10px section labels) and online-store/AdminSideNav
 * (gradient brand mark + storage card surface).
 *
 * Renders NOTHING below 768px — the mobile chrome (hamburger + drawer) is
 * mounted by `NimbusMobileNav` in the layout's top bar instead.
 */
export interface NimbusSideNavProps {
  /** Bytes used by the user — drives the storage meter at the bottom. */
  usedBytes: number
  /** Total bytes available on the user's plan. */
  totalBytes: number
  /** Pre-formatted plan label (e.g. `Pro · 200 GB`). */
  planLabel: string
}

function useNavRenderHelpers() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const location = useLocation()
  const path = location.pathname

  const isActive = (to: string) => to === path || (to !== '/' && path.startsWith(`${to}/`))

  const renderItem =
    (onNavigate?: () => void) =>
    ({ to, glyph, labelKey, defaultLabel }: NavItem) => {
      const active = isActive(to)
      return (
        <Link
          key={to}
          to={to}
          onClick={onNavigate}
          data-mol-id={`sidenav-${to.replace('/', '')}`}
          aria-current={active ? 'page' : undefined}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 3),
            'min-h-[40px] rounded-lg border-l-4 py-2 transition-colors',
            cm.textSize('sm'),
            cm.fontWeight(active ? 'bold' : 'medium'),
            active
              ? 'bg-primary-fixed/30 text-primary border-primary'
              : 'border-transparent text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined text-xl')}
            style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
          >
            {glyph}
          </span>
          <span className="truncate">{t(labelKey, {}, { defaultValue: defaultLabel })}</span>
        </Link>
      )
    }

  return { cm, t, renderItem }
}

export function NimbusSideNav({ usedBytes, totalBytes, planLabel }: NimbusSideNavProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { renderItem } = useNavRenderHelpers()
  const isDesktop = useIsDesktop()

  if (!isDesktop) return null

  return (
    <aside
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.h('screen'),
        'fixed left-0 top-0 w-[260px] bg-surface-container-low border-r border-outline-variant/20 z-40',
      )}
      data-mol-id="nimbus-side-nav"
    >
      <Link to="/files" className={cm.cn(cm.sp('p', 6))}>
        <NimbusBrandMark size="md" showIcon />
      </Link>
      <div
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 'sm' }),
          cm.sp('px', 4),
          'flex-grow min-h-0 overflow-y-auto',
        )}
      >
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.sp('px', 3),
            cm.sp('mb', 1),
            'font-black uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('nav.library', {}, { defaultValue: 'Library' })}
        </p>
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          {PRIMARY_ITEMS.map(renderItem())}
        </div>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.sp('px', 3),
            cm.sp('mt', 6),
            cm.sp('mb', 1),
            'font-black uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('nav.workspace', {}, { defaultValue: 'Workspace' })}
        </p>
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          {SECONDARY_ITEMS.map(renderItem())}
        </div>
      </div>
      <StorageCard usedBytes={usedBytes} totalBytes={totalBytes} planLabel={planLabel} />
    </aside>
  )
}

function StorageCard({
  usedBytes,
  totalBytes,
  planLabel,
}: {
  usedBytes: number
  totalBytes: number
  planLabel: string
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.sp('m', 4),
        cm.sp('p', 4),
        cm.flex({ direction: 'col', gap: 'sm' }),
        'rounded-xl bg-surface-container border border-outline-variant/20',
      )}
    >
      <span
        className={cm.cn(
          cm.textSize('xs'),
          'font-black uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {t('nav.currentPlan', {}, { defaultValue: 'Current plan' })}
      </span>
      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}>
        {planLabel}
      </span>
      <NimbusStorageMeter usedBytes={usedBytes} totalBytes={totalBytes} variant="compact" />
      <Link
        to="/pricing"
        data-mol-id="sidenav-upgrade"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
          'min-h-[40px] rounded-lg uppercase tracking-widest bg-gradient-to-br from-primary to-tertiary-container text-on-primary hover:opacity-90 transition-opacity',
          cm.sp('px', 3),
          cm.textSize('xs'),
          cm.fontWeight('bold'),
        )}
      >
        {t('nimbusSideNav.upgradeCta', {}, { defaultValue: 'Upgrade plan' })}
        <span className={cm.cn('material-symbols-outlined text-base')}>arrow_forward</span>
      </Link>
    </div>
  )
}

/**
 * Mobile chrome for the Nimbus shell (<768px): a 44px hamburger in the top
 * bar plus an overlay drawer carrying the SAME nav sections + storage card
 * as the desktop sidebar (brand mark, Library/Workspace groups, plan meter,
 * upgrade CTA). Backdrop click / Escape / any navigation close it; background
 * scroll is locked while open. Only one of {desktop sidebar, mobile drawer}
 * is ever mounted, so `sidenav-*` locators stay unique.
 */
export function NimbusMobileNav({ usedBytes, totalBytes, planLabel }: NimbusSideNavProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)

  // Any navigation closes the drawer.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // While open: Escape closes, background scroll locks.
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

  const { renderItem } = useNavRenderHelpers()
  const navLabel = t('nimbusSideNav.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })
  const openLabel = t('nimbusSideNav.openNav', {}, { defaultValue: 'Open navigation menu' })
  const closeLabel = t('nimbusSideNav.closeNav', {}, { defaultValue: 'Close navigation menu' })

  return (
    <>
      <button
        type="button"
        data-mol-id="sidenav-toggle"
        aria-label={openLabel}
        aria-expanded={open}
        aria-controls="nimbus-nav-drawer"
        onClick={() => setOpen(true)}
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          'h-11 w-11 shrink-0 rounded-full text-on-surface-variant hover:bg-surface-container focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-colors',
        )}
      >
        <span className="material-symbols-outlined text-2xl" aria-hidden="true">
          menu
        </span>
      </button>
      {open
        ? createPortal(
            <div className="fixed inset-0 z-50">
              {/* Backdrop: click to dismiss (not tab-reachable — Escape and the
              × button are the keyboard paths). */}
              <button
                type="button"
                tabIndex={-1}
                aria-label={closeLabel}
                onClick={() => setOpen(false)}
                className="absolute inset-0 w-full cursor-default bg-black/40"
              />
              <div
                id="nimbus-nav-drawer"
                role="dialog"
                aria-modal="true"
                aria-label={navLabel}
                className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto bg-surface-container-low border-r border-outline-variant/20 shadow-xl"
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('p', 6),
                    cm.sp('pb', 2),
                  )}
                >
                  <Link to="/files" onClick={() => setOpen(false)}>
                    <NimbusBrandMark size="md" showIcon />
                  </Link>
                  <button
                    type="button"
                    aria-label={closeLabel}
                    onClick={() => setOpen(false)}
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      'h-11 w-11 rounded-full text-on-surface-variant hover:bg-surface-container focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-colors',
                    )}
                  >
                    <span className="material-symbols-outlined text-2xl" aria-hidden="true">
                      close
                    </span>
                  </button>
                </div>
                <nav
                  aria-label={navLabel}
                  className={cm.cn(
                    cm.flex({ direction: 'col', gap: 'sm' }),
                    cm.sp('px', 4),
                    'flex-grow min-h-0 overflow-y-auto',
                  )}
                >
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.sp('px', 3),
                      cm.sp('mb', 1),
                      'font-black uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('nav.library', {}, { defaultValue: 'Library' })}
                  </p>
                  <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                    {PRIMARY_ITEMS.map(renderItem(() => setOpen(false)))}
                  </div>
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.sp('px', 3),
                      cm.sp('mt', 6),
                      cm.sp('mb', 1),
                      'font-black uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('nav.workspace', {}, { defaultValue: 'Workspace' })}
                  </p>
                  <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                    {SECONDARY_ITEMS.map(renderItem(() => setOpen(false)))}
                  </div>
                </nav>
                <StorageCard usedBytes={usedBytes} totalBytes={totalBytes} planLabel={planLabel} />
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
