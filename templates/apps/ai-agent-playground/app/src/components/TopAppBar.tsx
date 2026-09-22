// Pattern source: ai-chatbot-builder/components/TopNavBar.tsx
// Neuron variant — fixed bar with mono page title, search/notification/user-menu, and
// brand-violet "New Agent" gradient CTA.
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

interface TopAppBarProps {
  title: string
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

export function TopAppBar({ title, ctaLabel, ctaTo, onCta }: TopAppBarProps) {
  const cm = getClassMap()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [searchOpen, setSearchOpen] = useState(false)

  function handleCta() {
    if (onCta) onCta()
    else if (ctaTo) navigate(ctaTo)
  }

  return (
    <header
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between' }),
        cm.sp('px', 6),
        'h-[48px] fixed top-0 right-0 w-[calc(100%-260px)] z-50 border-b border-surface/5 bg-surface-container-lowest/80 backdrop-blur-xl',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 4 }),
          cm.textSize('sm'),
          'font-mono uppercase tracking-wider',
        )}
      >
        <span className={cm.cn(cm.fontWeight('bold'), 'text-violet-400')}>{title}</span>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }))}>
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
        <ThemeToggle />
        <button
          aria-label={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          className={
            'text-foreground-tertiary hover:bg-surface/10 transition-all h-9 w-9 inline-flex items-center justify-center rounded'
          }
          onClick={() => navigate('/notifications')}
          type="button"
        >
          <span
            className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
            aria-hidden="true"
          >
            notifications
          </span>
        </button>
        <UserMenu />
        {ctaLabel && (
          <button
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('ml', 4),
              cm.fontWeight('medium'),
              cm.textSize('xs'),
              'btn-primary-gradient py-1.5 rounded text-on-primary-fixed',
            )}
            onClick={handleCta}
            type="button"
          >
            {ctaLabel}
          </button>
        )}
      </div>
    </header>
  )
}

export default TopAppBar
