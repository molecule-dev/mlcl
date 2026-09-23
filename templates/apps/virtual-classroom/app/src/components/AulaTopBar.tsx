import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

/**
 * Sticky top bar for Aula's authenticated dashboard layout — search box,
 * notification bell, theme toggle, and user menu.
 *
 * Translated from lms/TopNavBar.tsx — same fixed-top + ml-[260px] offset
 * pattern, recolored to Aula's lavender surface.
 */
export interface AulaTopBarProps {
  title?: string
  /** Opens the mobile navigation drawer (<768px). Absent on md+ where the sidebar is permanent. */
  onMenu?: () => void
}

export function AulaTopBar({ title, onMenu }: AulaTopBarProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const heading =
    title ?? t('aulaTopBar.title', { appName: APP_NAME }, { defaultValue: '{{appName}}' })

  return (
    <header
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between' }),
        'px-4 md:px-8',
        'fixed top-0 right-0 left-0 md:left-[260px] z-20 h-16 bg-surface-container-lowest/95 backdrop-blur-md border-b border-outline-variant/20',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }), cm.flex1, 'min-w-0')}>
        <button
          type="button"
          onClick={onMenu}
          aria-label={t('aulaTopBar.openMenu', {}, { defaultValue: 'Open navigation menu' })}
          data-mol-id="nav-menu"
          className={cm.cn(
            'h-10 w-10 -ml-2 shrink-0 rounded-xl flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low md:hidden',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-[22px]')}>menu</span>
        </button>
        <h1
          className={cm.cn(
            cm.textSize('lg'),
            cm.fontWeight('bold'),
            'text-on-surface tracking-tight truncate',
          )}
        >
          {heading}
        </h1>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }), 'shrink-0')}>
        <label
          className={cm.cn(
            cm.flex({ align: 'center', gap: 2 }),
            cm.sp('px', 4),
            'h-10 w-72 rounded-xl bg-surface-container-low text-on-surface-variant focus-within:ring-2 focus-within:ring-primary/30 transition-all',
            // The search box cannot fit beside a 260px sidebar on phones —
            // desktop-only; the command palette / in-page filters cover it there.
            'hidden md:flex',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-[18px]')}>search</span>
          <input
            type="search"
            placeholder={t(
              'aulaTopBar.searchPlaceholder',
              {},
              { defaultValue: 'Search courses, classes, assignments…' },
            )}
            className={cm.cn(
              cm.flex1,
              cm.textSize('sm'),
              'bg-transparent border-0 outline-none placeholder:text-on-surface-variant/70 text-on-surface',
            )}
          />
        </label>
        <Link
          to="/notifications"
          aria-label={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          className={cm.cn(
            'relative h-10 w-10 rounded-xl flex items-center justify-center bg-surface-container-low text-on-surface-variant hover:text-primary hover:bg-primary-container transition-colors',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-[20px]')}>notifications</span>
          <span
            className={cm.cn(
              'absolute top-2 right-2 h-2 w-2 rounded-full bg-secondary ring-2 ring-surface-container-lowest',
            )}
            aria-hidden="true"
          ></span>
        </Link>
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  )
}

export default AulaTopBar
