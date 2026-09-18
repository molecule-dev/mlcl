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
}

export function AulaTopBar({ title }: AulaTopBarProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const heading =
    title ?? t('aulaTopBar.title', { appName: APP_NAME }, { defaultValue: '{{appName}}' })

  return (
    <header
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between' }),
        cm.sp('px', 8),
        'fixed top-0 right-0 left-[260px] z-20 h-16 bg-surface-container-lowest/95 backdrop-blur-md border-b border-outline-variant/20',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }))}>
        <h1
          className={cm.cn(
            cm.textSize('lg'),
            cm.fontWeight('bold'),
            'text-on-surface tracking-tight',
          )}
        >
          {heading}
        </h1>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}>
        <label
          className={cm.cn(
            cm.flex({ align: 'center', gap: 2 }),
            cm.sp('px', 4),
            'h-10 w-72 rounded-xl bg-surface-container-low text-on-surface-variant focus-within:ring-2 focus-within:ring-primary/30 transition-all',
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
