import { Link, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BrandWordmark } from './BrandWordmark.js'
import { ThemeToggle } from './ThemeToggle.js'

/**
 * Public-portal header (Stitch design: sticky white bar with the pin-on-grid
 * brand mark, a report-ID search field, section nav, and the Report-an-Issue
 * CTA). Shared by every signed-out page; the signed-in shell uses SideNavBar.
 */
export function Header() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const location = useLocation()

  const navItems = [
    { to: '/explore', label: t('nav.liveStatus', {}, { defaultValue: 'Live Status' }) },
    { to: '/my-reports', label: t('nav.trackReport', {}, { defaultValue: 'Track Report' }) },
    { to: '/watch-areas', label: t('nav.watchAreas', {}, { defaultValue: 'Watch Areas' }) },
    { to: '/pricing', label: t('nav.services', {}, { defaultValue: 'Services' }) },
  ]

  return (
    <header
      data-mol-id="public-header"
      className={cm.cn(
        'sticky top-0 z-50 bg-surface-container-lowest border-b border-surface-variant shadow-sm',
      )}
    >
      <div
        className={cm.cn(
          'w-full max-w-7xl mx-auto px-8 flex items-center justify-between h-16 gap-4',
        )}
      >
        {/* Brand: pin-on-grid mark + two-line wordmark */}
        <Link
          to="/"
          data-mol-id="header-brand"
          className={cm.cn(cm.flex({ align: 'center' }), 'gap-2 shrink-0')}
        >
          <BrandWordmark as="span" />
        </Link>

        {/* Report lookup — routes the reader to the public map */}
        <Link
          to="/explore"
          className={cm.cn(
            'hidden lg:flex items-center relative w-72 rounded-lg border border-surface-variant',
            'bg-surface-container-low px-9 py-1.5 text-sm text-outline placeholder:text-outline',
            'hover:border-primary-container transition-colors',
          )}
          data-mol-id="header-search"
        >
          <span
            className={cm.cn('material-symbols-outlined absolute left-3 text-outline', 'text-lg')}
            aria-hidden
          >
            search
          </span>
          <span className="text-sm truncate">
            {t(
              'header.searchPlaceholder',
              {},
              { defaultValue: 'Track report by #ID or address...' },
            )}
          </span>
        </Link>

        {/* Section nav */}
        <nav className={cm.cn('hidden md:flex items-center gap-6')} aria-label="Primary">
          {navItems.map((item) => {
            const active = location.pathname === item.to
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cm.cn(
                  'text-sm pb-1 border-b-2 transition-colors',
                  active
                    ? 'text-primary font-semibold border-primary'
                    : 'text-secondary font-medium border-transparent hover:text-on-surface',
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Trailing actions */}
        <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-1 shrink-0')}>
          <ThemeToggle />
          <Link
            to="/notifications"
            aria-label={t('header.notifications', {}, { defaultValue: 'Notifications' })}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'p-2 text-secondary hover:text-on-surface hover:bg-surface-container-low rounded-lg transition-colors',
            )}
          >
            <span className={cm.cn('material-symbols-outlined', 'text-[22px]')} aria-hidden>
              notifications
            </span>
          </Link>
          <Link
            to="/about"
            aria-label={t('header.help', {}, { defaultValue: 'Help & knowledge base' })}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'hidden sm:flex p-2 text-secondary hover:text-on-surface hover:bg-surface-container-low rounded-lg transition-colors',
            )}
          >
            <span className={cm.cn('material-symbols-outlined', 'text-[22px]')} aria-hidden>
              help
            </span>
          </Link>
          <Link
            to="/login"
            className={cm.cn(
              'hidden sm:inline-flex px-3 py-1.5 text-secondary hover:text-on-surface font-medium text-sm transition-colors',
            )}
          >
            {t('header.signIn', {}, { defaultValue: 'Sign In' })}
          </Link>
          <Link
            to="/report"
            data-mol-id="header-cta-report"
            className={cm.cn(
              cm.flex({ align: 'center' }),
              'inline-flex items-center gap-1.5 px-4 py-2 bg-primary-container text-on-primary rounded-lg text-sm font-medium',
              'hover:bg-[var(--color-primary-hover)] shadow-sm transition-all',
            )}
          >
            <span className={cm.cn('material-symbols-outlined', 'text-[18px]')} aria-hidden>
              add_circle
            </span>
            <span>{t('header.reportIssue', {}, { defaultValue: 'Report an Issue' })}</span>
          </Link>
        </div>
      </div>
    </header>
  )
}

export default Header
