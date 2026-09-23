import { useCallback, useEffect, useRef } from 'react'
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
 * mobile drawer so both stay in lock-step; `onNavigate` lets the drawer close
 * itself after a tap (the desktop rail never needs to).
 */
function NavItem({
  entry,
  active,
  onNavigate,
  onSignOut,
}: {
  entry: NavEntry
  active: boolean
  onNavigate?: () => void
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
      onClick={onNavigate}
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

function NewImageCta({ onNavigate }: { onNavigate?: () => void }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <SafeLink
      to="/generate"
      onClick={onNavigate}
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

/**
 * Persistent left rail used across every signed-in screen (md and up — below
 * that the mobile drawer in this file takes over). Composes the brand mark,
 * primary nav, secondary nav and a "Generate Image" CTA. Pure presentation
 * — routes are wired through `react-router` links so the active item
 * highlights automatically.
 */
export function AiImageGeneratorSidebar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { logout } = useAuth()
  const location = useLocation()

  const renderEntries = (entries: NavEntry[], onNavigate?: () => void) =>
    entries.map((entry) => (
      <NavItem
        key={entry.to}
        entry={entry}
        active={location.pathname.startsWith(entry.to)}
        onNavigate={onNavigate}
      />
    ))

  return (
    <aside
      className={cm.cn(
        cm.flex({ direction: 'col', gap: 'lg' }),
        cm.sp('p', 6),
        'fixed left-0 top-0 z-40 hidden md:flex h-screen w-64 bg-surface-container-low border-r border-outline-variant/10',
      )}
    >
      <BrandLogo />
      <NewImageCta />

      <nav
        className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'flex-1 overflow-y-auto')}
        aria-label={t('nav.primaryNavigation', {}, { defaultValue: 'Primary navigation' })}
      >
        {renderEntries(PRIMARY_NAV)}
      </nav>

      <nav
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 'xs' }),
          'border-t border-outline-variant/10 pt-4',
        )}
        aria-label={t('sidebar.secondary', {}, { defaultValue: 'Secondary navigation' })}
      >
        {renderEntries(SECONDARY_NAV)}
        <NavItem entry={SECONDARY_NAV[0]} active={false} onSignOut={() => logout()} />
      </nav>
    </aside>
  )
}

/**
 * The `<md` navigation drawer: brand, "New image" CTA, full nav, sign out.
 * Rendered by `AiImageGeneratorLayout` when the top-bar hamburger opens it;
 * closes on route change, Escape, backdrop tap or the ✕ button.
 */
export function AiImageGeneratorMobileNav({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { logout } = useAuth()
  const location = useLocation()
  const panelRef = useRef<HTMLDivElement>(null)

  // Route changes close the drawer — a tap on a nav item both navigates and
  // dismisses, so the user never lands on the new screen behind an overlay.
  useEffect(() => {
    onClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- location.pathname is the change signal
  }, [location.pathname])

  // Escape closes; focus lands in the panel so keyboard users are inside the
  // dialog, and scroll behind it is locked while open.
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    panelRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  const handleSignOut = useCallback(() => {
    onClose()
    logout()
  }, [onClose, logout])

  if (!open) return null

  return (
    <div className="md:hidden">
      {/* Backdrop — click to dismiss. */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('nav.primaryNavigation', {}, { defaultValue: 'Primary navigation' })}
        tabIndex={-1}
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 'lg' }),
          cm.sp('p', 6),
          'fixed left-0 top-0 z-50 h-screen w-72 max-w-[85vw] bg-surface-container-low border-r border-outline-variant/10 shadow-2xl outline-none',
        )}
      >
        <div className={cm.flex({ align: 'center', justify: 'between' })}>
          <BrandLogo showTagline={false} />
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.closeMenu', {}, { defaultValue: 'Close menu' })}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'h-11 w-11 rounded-xl text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-colors',
            )}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              close
            </span>
          </button>
        </div>
        <NewImageCta onNavigate={onClose} />

        <nav
          className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'flex-1 overflow-y-auto')}
          aria-label={t('nav.primaryNavigation', {}, { defaultValue: 'Primary navigation' })}
        >
          {PRIMARY_NAV.map((entry) => (
            <NavItem
              key={entry.to}
              entry={entry}
              active={location.pathname.startsWith(entry.to)}
              onNavigate={onClose}
            />
          ))}
        </nav>

        <nav
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'xs' }),
            'border-t border-outline-variant/10 pt-4',
          )}
          aria-label={t('sidebar.secondary', {}, { defaultValue: 'Secondary navigation' })}
        >
          {SECONDARY_NAV.map((entry) => (
            <NavItem
              key={entry.to}
              entry={entry}
              active={location.pathname.startsWith(entry.to)}
              onNavigate={onClose}
            />
          ))}
          <NavItem entry={SECONDARY_NAV[0]} active={false} onSignOut={handleSignOut} />
        </nav>
      </div>
    </div>
  )
}
