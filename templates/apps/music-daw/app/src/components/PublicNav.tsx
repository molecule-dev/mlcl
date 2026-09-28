import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * Public marketing-chrome top navigation for Fugue, shared by the Landing,
 * About, Privacy, and Terms pages so the brand stays consistent across every
 * unauthenticated surface. Auth-aware: signed-in visitors see a single
 * "Go to Dashboard" CTA instead of the sign-in / get-started pair.
 *
 * Styled after the Stitch design (design-music-daw-landing): translucent
 * violet-tinted chrome, brand mark with a pulsing magenta dot, and a
 * glowing violet CTA pill — all through theme tokens, no inline styles.
 */
export function PublicNav() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  const ctaClass = cm.cn(
    'px-5 py-2 font-semibold rounded-full transition-colors',
    'bg-[var(--daw-primary)] text-[var(--color-on-primary)]',
    'shadow-[0_0_15px_color-mix(in_oklab,var(--daw-primary)_40%,transparent)]',
    'hover:bg-[var(--daw-primary-hover)]',
  )

  return (
    <nav
      data-mol-id="public-nav"
      className={cm.cn(
        'sticky top-0 z-50 bg-[var(--fugue-bg)]/80 backdrop-blur-md border-b',
        'border-[color-mix(in_oklab,var(--daw-primary)_20%,transparent)]',
        'shadow-[0_0_15px_color-mix(in_oklab,var(--daw-primary)_10%,transparent)]',
      )}
    >
      <div
        className={cm.cn(
          cm.maxW('7xl'),
          cm.sp('px', 6),
          cm.sp('py', 4),
          cm.flex({ align: 'center', justify: 'between' }),
          cm.mxAuto,
        )}
      >
        <Link
          to="/"
          data-mol-id="public-nav-brand"
          className={cm.cn(
            'text-xl font-extrabold tracking-tighter text-on-surface',
            "after:content-[''] after:ml-2 after:inline-block after:w-2 after:h-2",
            'after:rounded-full after:bg-[var(--daw-secondary)] after:animate-pulse',
          )}
        >
          {APP_NAME}
        </Link>
        <div className={cm.flex({ align: 'center', gap: 'md' })}>
          {isAuthenticated ? (
            <Link to="/dashboard" data-mol-id="public-nav-dashboard" className={ctaClass}>
              {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                data-mol-id="public-nav-login"
                className={cm.cn(
                  'text-sm font-medium text-on-surface-variant hover:text-on-surface',
                )}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link to="/signup" data-mol-id="public-nav-signup" className={ctaClass}>
                {t('landing.getStarted', {}, { defaultValue: 'Open the studio' })}
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

export default PublicNav
