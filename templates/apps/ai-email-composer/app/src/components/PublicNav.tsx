import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { BrandWordmark } from './BrandWordmark.js'

/**
 * Shared public top navigation for Signet's marketing surfaces (Landing,
 * About, Privacy, Terms). Keeps the brand wordmark + CTA chrome identical
 * across every public page.
 *
 * Auth-aware: when the visitor is already signed in, the Sign in / Try
 * Signet free links collapse into a single "Go to Dashboard" CTA pointing
 * at the primary authed route.
 */
export function PublicNav() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <nav
      data-mol-id="public-nav"
      className={cm.cn('sticky top-0 z-50 backdrop-blur-md border-b border-outline-variant/40')}
      style={{
        background:
          'color-mix(in srgb, var(--mol-color-surface, var(--color-bg-card)) 80%, transparent)',
      }}
    >
      <div
        className={cm.cn(
          cm.maxW('7xl'),
          cm.sp('px', 6),
          cm.sp('py', 4),
          cm.flex({ align: 'center', justify: 'between' }),
          'mx-auto',
        )}
      >
        <BrandWordmark size="md" />
        <div className={cm.flex({ align: 'center', gap: 'md' })}>
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              data-mol-id="public-nav-dashboard"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'text-white rounded-full transition-all hover:shadow-lg active:scale-95',
              )}
              style={{
                background:
                  'linear-gradient(135deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 70%, #a78bfa))',
                boxShadow: '0 4px 12px color-mix(in srgb, var(--color-primary) 25%, transparent)',
              }}
            >
              {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'text-on-surface-variant hover:text-on-surface transition-colors',
                )}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link
                to="/signup"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  'text-white rounded-full transition-all hover:shadow-lg active:scale-95',
                )}
                style={{
                  background:
                    'linear-gradient(135deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 70%, #a78bfa))',
                  boxShadow: '0 4px 12px color-mix(in srgb, var(--color-primary) 25%, transparent)',
                }}
              >
                {t(
                  'landing.getStarted',
                  { app: APP_NAME },
                  { defaultValue: `Try ${APP_NAME} free` },
                )}
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

export default PublicNav
