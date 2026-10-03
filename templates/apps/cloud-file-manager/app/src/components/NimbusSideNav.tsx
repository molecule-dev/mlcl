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

/**
 * Nav content for the Nimbus shell — consumed by the shared
 * `ResponsiveAppShell` (NimbusFilesLayout): the SAME element feeds the
 * ≥768px Sidebar and the <768px Drawer, and only the mounted breakpoint
 * instantiates it, so the `sidenav-*` data-mol-ids stay unique in the DOM.
 * The former hand-rolled fixed aside + portal drawer (NimbusMobileNav) are
 * deleted with the migration.
 */
export interface NimbusNavProps {
  /** Bytes used by the user — drives the storage meter at the bottom. */
  usedBytes: number
  /** Total bytes available on the user's plan. */
  totalBytes: number
  /** Pre-formatted plan label (e.g. `Pro · 200 GB`). */
  planLabel: string
}

/** Storage card — the sidebar/drawer footer (plan meter + upgrade CTA). */
export function NimbusStorageCard({ usedBytes, totalBytes, planLabel }: NimbusNavProps) {
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
          'min-h-[44px] rounded-lg uppercase tracking-widest bg-gradient-to-br from-primary to-tertiary-container text-on-primary hover:opacity-90 transition-opacity',
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

/** Brand wordmark link — Sidebar lead / Drawer header. */
export function NimbusBrandLink() {
  const cm = getClassMap()
  return (
    <Link to="/files" className={cm.cn(cm.sp('p', 6), 'block')} data-mol-id="nav-brand">
      <NimbusBrandMark size="md" showIcon />
    </Link>
  )
}

/**
 * Library / Workspace groups. Longest-prefix active rule;
 * `sidenav-<section>` data-mol-ids preserved.
 */
export function NimbusNavGroups() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const location = useLocation()
  const path = location.pathname

  const isActive = (to: string) => to === path || (to !== '/' && path.startsWith(`${to}/`))

  const renderItem = ({ to, glyph, labelKey, defaultLabel }: NavItem) => {
    const active = isActive(to)
    return (
      <Link
        key={to}
        to={to}
        data-mol-id={`sidenav-${to.replace('/', '')}`}
        aria-current={active ? 'page' : undefined}
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.sp('px', 3),
          'min-h-[44px] rounded-lg border-l-4 py-2 transition-colors',
          cm.textSize('sm'),
          cm.fontWeight(active ? 'bold' : 'medium'),
          active
            ? 'bg-primary-fixed/30 text-primary border-primary'
            : 'border-transparent text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
        )}
      >
        <span
          className={cm.cn('material-symbols-outlined text-xl shrink-0')}
          style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
        >
          {glyph}
        </span>
        <span className="truncate">{t(labelKey, {}, { defaultValue: defaultLabel })}</span>
      </Link>
    )
  }

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), cm.sp('px', 4), 'min-h-0')}>
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
        {PRIMARY_ITEMS.map(renderItem)}
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
        {SECONDARY_ITEMS.map(renderItem)}
      </div>
    </div>
  )
}
