// Neuron's top-bar action cluster — search popover, theme toggle,
// notifications, user menu, and the page CTA ("New Agent"). Formerly its own
// fixed-position header; now rendered INSIDE the shared shell's TopBar
// `actions` slot (NeuronLayout), so the shell owns the header landmark.
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

interface TopBarActionsProps {
  ctaLabel?: string
  ctaTo?: string
  onCta?: () => void
}

interface SearchTarget {
  labelKey: string
  defaultLabel: string
  to: string
}

const SEARCH_TARGETS: SearchTarget[] = [
  { labelKey: 'topAppBar.searchTo.dashboard', defaultLabel: 'Dashboard', to: '/dashboard' },
  { labelKey: 'topAppBar.searchTo.agents', defaultLabel: 'Agents', to: '/agents' },
  { labelKey: 'topAppBar.searchTo.tools', defaultLabel: 'Tools', to: '/tools' },
  { labelKey: 'topAppBar.searchTo.runs', defaultLabel: 'Run history', to: '/runs' },
  { labelKey: 'topAppBar.searchTo.datasets', defaultLabel: 'Datasets', to: '/datasets' },
  {
    labelKey: 'topAppBar.searchTo.knowledgeBases',
    defaultLabel: 'Knowledge bases',
    to: '/knowledge-bases',
  },
  { labelKey: 'topAppBar.searchTo.models', defaultLabel: 'Models', to: '/models' },
  { labelKey: 'topAppBar.searchTo.settings', defaultLabel: 'Settings', to: '/settings' },
  { labelKey: 'topAppBar.searchTo.profile', defaultLabel: 'Profile', to: '/profile' },
]

export function TopBarActions({ ctaLabel, ctaTo, onCta }: TopBarActionsProps) {
  const cm = getClassMap()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [searchOpen, setSearchOpen] = useState(false)

  function handleCta() {
    if (onCta) onCta()
    else if (ctaTo) navigate(ctaTo)
  }

  return (
    <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
      <div className="relative">
        <button
          aria-expanded={searchOpen}
          aria-label={t('common.search', {}, { defaultValue: 'Search' })}
          className={
            'text-foreground-tertiary hover:bg-surface/10 transition-all h-9 w-9 inline-flex items-center justify-center rounded'
          }
          data-mol-id="top-app-bar-search-toggle"
          onClick={() => setSearchOpen((open) => !open)}
          type="button"
        >
          <span
            className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
            aria-hidden="true"
          >
            search
          </span>
        </button>
        {searchOpen && (
          <ul
            className={cm.cn(
              cm.sp('py', 2),
              'absolute right-0 top-9 z-50 min-w-[220px] rounded border border-outline-variant/20 bg-surface-container-high shadow-xl',
            )}
            data-mol-id="top-app-bar-search-popover"
          >
            {SEARCH_TARGETS.map((target) => (
              <li key={target.to}>
                <Link
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    'block font-headline text-on-surface hover:bg-surface-container-highest',
                  )}
                  onClick={() => setSearchOpen(false)}
                  to={target.to}
                >
                  {t(target.labelKey, {}, { defaultValue: target.defaultLabel })}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      {/* Styled hosts for the shared controls — bare, they read as
          unstyled browser widgets bolted onto the styled bar. */}
      <div className="text-foreground-tertiary rounded transition-colors hover:bg-surface/10">
        <ThemeToggle />
      </div>
      <button
        aria-label={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
        className={
          'text-foreground-tertiary hover:bg-surface/10 transition-all h-9 w-9 inline-flex items-center justify-center rounded'
        }
        onClick={() => navigate('/notifications')}
        type="button"
      >
        <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')} aria-hidden="true">
          notifications
        </span>
      </button>
      <div className="text-foreground-tertiary rounded transition-colors hover:bg-surface/10">
        <UserMenu />
      </div>
      {ctaLabel && (
        <button
          className={cm.cn(
            cm.sp('px', 3),
            cm.fontWeight('medium'),
            cm.textSize('xs'),
            'btn-primary-gradient h-9 rounded text-on-primary-fixed font-mono uppercase tracking-wider',
          )}
          data-mol-id="top-bar-cta"
          onClick={handleCta}
          type="button"
        >
          {ctaLabel}
        </button>
      )}
    </div>
  )
}

export default TopBarActions
