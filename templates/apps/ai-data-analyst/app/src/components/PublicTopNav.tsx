import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { BrandWordmark } from './BrandWordmark.js'
import { SafeLink } from './SafeLink.js'

/**
 * Public marketing top nav for anonymous-or-authed visitors on standalone
 * content pages (About, Privacy, Terms). Mirrors the Landing hero nav brand
 * mark so chrome stays consistent, and is auth-aware: signed-in users see a
 * single "Go to Dashboard" CTA instead of the Sign in / Try free pair.
 */
export function PublicTopNav() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <nav
      data-mol-id="public-top-nav"
      className={
        'sticky top-0 z-30 backdrop-blur-md bg-background/70 border-b border-outline-variant/40'
      }
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
        <SafeLink to="/" className={cm.cn('shrink-0')} aria-label={APP_NAME}>
          <BrandWordmark as="span" size="md" />
        </SafeLink>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }))}>
          <Link
            to="/pricing"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'text-on-surface-variant hover:text-on-surface transition-colors hidden sm:inline',
            )}
          >
            {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
          </Link>
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              data-mol-id="public-nav-dashboard"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 1 }),
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                cm.roundedFull,
                'bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-sm hover:opacity-90 transition-opacity',
              )}
            >
              {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              <span
                className={cm.cn('material-symbols-outlined', cm.textSize('base'))}
                aria-hidden="true"
              >
                arrow_forward
              </span>
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'text-on-surface-variant hover:text-on-surface transition-colors',
                )}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link
                to="/signup"
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 1 }),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  cm.roundedFull,
                  'bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-sm hover:opacity-90 transition-opacity',
                )}
              >
                {t('landing.nav.tryFree', {}, { defaultValue: 'Try free' })}
                <span
                  className={cm.cn('material-symbols-outlined', cm.textSize('base'))}
                  aria-hidden="true"
                >
                  arrow_forward
                </span>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

export default PublicTopNav
