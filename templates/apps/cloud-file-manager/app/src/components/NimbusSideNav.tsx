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
 * Branded sidebar for authenticated cloud-file-manager pages.
 *
 * Anchored left with a brand wordmark, two grouped sections (Library /
 * Workspace), and a storage meter card pinned to the bottom — per
 * DESIGN.md `### Sidebar Navigation` measurements.
 *
 * Translated visual treatment from personal-finance/SideNavBar (active
 * accent, uppercase 10px section labels) and online-store/AdminSideNav
 * (gradient brand mark + storage card surface).
 */
export interface NimbusSideNavProps {
  /** Bytes used by the user — drives the storage meter at the bottom. */
  usedBytes: number
  /** Total bytes available on the user's plan. */
  totalBytes: number
  /** Pre-formatted plan label (e.g. `Pro · 200 GB`). */
  planLabel: string
}

export function NimbusSideNav({ usedBytes, totalBytes, planLabel }: NimbusSideNavProps) {
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
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.sp('px', 3),
          cm.sp('py', 2),
          cm.textSize('sm'),
          cm.fontWeight(active ? 'bold' : 'medium'),
          'rounded-lg transition-colors border-l-4',
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

  return (
    <aside
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.h('screen'),
        'fixed left-0 top-0 w-[260px] hidden md:flex bg-surface-container-low border-r border-outline-variant/20 z-40',
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
            cm.sp('py', 2),
            cm.sp('px', 3),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'rounded-lg uppercase tracking-widest bg-gradient-to-br from-primary to-tertiary-container text-on-primary hover:opacity-90 transition-opacity',
          )}
        >
          {t('nimbusSideNav.upgradeCta', {}, { defaultValue: 'Upgrade plan' })}
          <span className={cm.cn('material-symbols-outlined text-base')}>arrow_forward</span>
        </Link>
      </div>
    </aside>
  )
}
