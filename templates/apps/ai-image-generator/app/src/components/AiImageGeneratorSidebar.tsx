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
 * Persistent left rail used across every signed-in screen. Composes the brand
 * mark, primary nav, secondary nav and a "Generate Image" CTA. Pure presentation
 * — routes are wired through `react-router` `<NavLink>` so the active item
 * highlights automatically.
 */
export function AiImageGeneratorSidebar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { logout } = useAuth()
  const location = useLocation()

  const renderEntry = (entry: NavEntry) => {
    const active = location.pathname.startsWith(entry.to)
    return (
      <SafeLink
        key={entry.to}
        to={entry.to}
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

  return (
    <aside
      className={cm.cn(
        cm.flex({ direction: 'col', gap: 'lg' }),
        cm.sp('p', 6),
        'fixed left-0 top-0 z-40 hidden md:flex h-screen w-64 bg-surface-container-low border-r border-outline-variant/10',
      )}
    >
      <BrandLogo />
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
        <span className="material-symbols-outlined">add</span>
        {t('sidebar.newImage', {}, { defaultValue: 'New image' })}
      </SafeLink>

      <nav
        className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'flex-1 overflow-y-auto')}
        aria-label={t('nav.primaryNavigation', {}, { defaultValue: 'Primary navigation' })}
      >
        {PRIMARY_NAV.map(renderEntry)}
      </nav>

      <nav
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 'xs' }),
          'border-t border-outline-variant/10 pt-4',
        )}
        aria-label={t('sidebar.secondary', {}, { defaultValue: 'Secondary navigation' })}
      >
        {SECONDARY_NAV.map(renderEntry)}
        <button
          type="button"
          onClick={() => logout()}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.fontWeight('semibold'),
            cm.textSize('sm'),
            'rounded-xl text-on-surface-variant hover:text-error hover:bg-error-container/20 transition-colors text-left',
          )}
        >
          <span className="material-symbols-outlined">logout</span>
          <span className={cm.cn('tracking-wide')}>
            {t('settings.logOut', {}, { defaultValue: 'Sign out' })}
          </span>
        </button>
      </nav>
    </aside>
  )
}
