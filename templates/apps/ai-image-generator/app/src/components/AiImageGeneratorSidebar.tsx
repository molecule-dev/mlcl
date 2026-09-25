import type { ReactNode } from 'react'
import { useLocation } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BrandLogo } from './BrandLogo.js'
import { SafeLink } from './SafeLink.js'

interface NavEntry {
  to: string
  icon: string
  labelKey: string
  defaultLabel: string
}

const PRIMARY_NAV: NavEntry[] = [
  { to: '/dashboard', icon: 'dashboard', labelKey: 'nav.dashboard', defaultLabel: 'Dreamscape' },
  { to: '/generate', icon: 'auto_awesome', labelKey: 'nav.generate', defaultLabel: 'Generate' },
  { to: '/gallery', icon: 'photo_library', labelKey: 'nav.gallery', defaultLabel: 'Gallery' },
  {
    to: '/collections',
    icon: 'auto_stories',
    labelKey: 'nav.collections',
    defaultLabel: 'Collections',
  },
  { to: '/styles', icon: 'palette', labelKey: 'nav.styles', defaultLabel: 'Styles' },
  { to: '/prompts', icon: 'psychology', labelKey: 'nav.prompts', defaultLabel: 'Prompt Lab' },
  { to: '/models', icon: 'deployed_code', labelKey: 'nav.models', defaultLabel: 'Models' },
  {
    to: '/notifications',
    icon: 'notifications',
    labelKey: 'nav.notifications',
    defaultLabel: 'Activity',
  },
]

const SECONDARY_NAV: NavEntry[] = [
  { to: '/settings', icon: 'settings', labelKey: 'nav.settings', defaultLabel: 'Settings' },
]

/**
 * One nav row (link or sign-out button). Shared by the desktop rail and the
 * mobile drawer (both render the same `useAiImageGeneratorNav` element, so
 * they stay in lock-step); only the mounted breakpoint ever instantiates it.
 */
function NavItem({
  entry,
  active,
  onSignOut,
}: {
  entry: NavEntry
  active: boolean
  /** When present the row renders as a sign-out button instead of a link. */
  onSignOut?: () => void
}) {
  const cm = getClassMap()
  const { t } = useTranslation()

  if (onSignOut) {
    return (
      <button
        type="button"
        onClick={onSignOut}
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.sp('px', 4),
          cm.sp('py', 3),
          cm.fontWeight('semibold'),
          cm.textSize('sm'),
          'rounded-xl text-on-surface-variant hover:text-error hover:bg-error-container/20 transition-colors text-left',
        )}
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          logout
        </span>
        <span className={cm.cn('tracking-wide')}>
          {t('settings.logOut', {}, { defaultValue: 'Sign out' })}
        </span>
      </button>
    )
  }

  return (
    <SafeLink
      to={entry.to}
      aria-current={active ? 'page' : undefined}
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'sm' }),
        cm.sp('px', 4),
        cm.sp('py', 3),
        cm.fontWeight('semibold'),
        cm.textSize('sm'),
        'rounded-xl transition-all duration-200',
        active
          ? 'bg-surface text-primary shadow-sm translate-x-1'
          : 'text-on-surface-variant hover:text-primary hover:bg-violet-50 dark:hover:bg-violet-900/30',
      )}
    >
      <span
        className="material-symbols-outlined"
        aria-hidden="true"
        style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
      >
        {entry.icon}
      </span>
      <span className={cm.cn('tracking-wide')}>
        {t(entry.labelKey, {}, { defaultValue: entry.defaultLabel })}
      </span>
    </SafeLink>
  )
}

function NewImageCta() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <SafeLink
      to="/generate"
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
        cm.sp('px', 4),
        cm.sp('py', 3),
        cm.fontWeight('bold'),
        'rounded-xl bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all',
      )}
    >
      <span className="material-symbols-outlined" aria-hidden="true">
        add
      </span>
      {t('sidebar.newImage', {}, { defaultValue: 'New image' })}
    </SafeLink>
  )
}

export interface AiImageGeneratorNav {
  /**
   * Brand mark, "New image" CTA and the primary nav. Pass the SAME element to
   * `<ResponsiveAppShell.Sidebar>` and `<ResponsiveAppShell.Drawer>` — the
   * shell mounts exactly one per breakpoint, so it instantiates once.
   */
  nav: ReactNode
  /** Secondary nav (Settings) + sign out, rendered in the shell footer slot. */
  footer: ReactNode
}

/**
 * The signed-in nav content shared by the responsive shell's desktop sidebar
 * and mobile drawer (see `AiImageGeneratorLayout`). Highlighting follows the
 * current route; the shell owns the drawer's open/close lifecycle, so rows
 * need no close-on-navigate wiring.
 */
export function useAiImageGeneratorNav(): AiImageGeneratorNav {
  const cm = getClassMap()
  const { logout } = useAuth()
  const location = useLocation()

  const renderEntries = (entries: NavEntry[]) =>
    entries.map((entry) => (
      <NavItem key={entry.to} entry={entry} active={location.pathname.startsWith(entry.to)} />
    ))

  const nav = (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }), cm.sp('p', 6), 'h-full')}>
      <BrandLogo />
      <NewImageCta />
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'flex-1')}>
        {renderEntries(PRIMARY_NAV)}
      </div>
    </div>
  )

  const footer = (
    <>
      {renderEntries(SECONDARY_NAV)}
      <NavItem entry={SECONDARY_NAV[0]} active={false} onSignOut={() => logout()} />
    </>
  )

  return { nav, footer }
}
