import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BrandWordmark } from './BrandWordmark.js'

/**
 * Public marketing-site navigation bar (brand + auth-aware CTA).
 *
 * Shared across the public pages (Landing, About, Privacy, Terms) so the
 * brand chrome stays consistent. When the visitor is signed in, the
 * Sign-in / Start-free pair collapses into a single "Go to Dashboard" CTA.
 */
export function LandingNav() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <nav
      data-mol-id="landing-nav"
      className={cm.cn(
        'sticky top-0 z-50 bg-surface/85 backdrop-blur-md border-b border-outline-variant',
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
          data-mol-id="landing-nav-brand"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('xl'),
            cm.fontWeight('bold'),
          )}
        >
          <BrandWordmark as="span" />
        </Link>
        <div className={cm.flex({ align: 'center', gap: 'md' })}>
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              data-mol-id="landing-nav-dashboard"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'text-on-primary rounded-full shadow-md hover:shadow-lg transition-shadow',
              )}
              style={{
                background:
                  'linear-gradient(90deg, var(--color-gradient-hero-start), var(--color-gradient-hero-end))',
              }}
            >
              {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                data-mol-id="landing-nav-login"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'text-on-surface-variant hover:text-on-surface',
                )}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link
                to="/signup"
                data-mol-id="landing-nav-signup"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'text-on-primary rounded-full shadow-md hover:shadow-lg transition-shadow',
                )}
                style={{
                  background:
                    'linear-gradient(90deg, var(--color-gradient-hero-start), var(--color-gradient-hero-end))',
                }}
              >
                {t('common.startFree', {}, { defaultValue: 'Start free' })}
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

export default LandingNav
