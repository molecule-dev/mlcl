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
 *
 * Design: frosted-glass bar (backdrop-blur + soft shadow, no hard border)
 * with centered section links that anchor into the landing page.
 */
const NAV_LINKS = [
  { to: '/#features', key: 'landing.nav.features', defaultValue: 'Features' },
  { to: '/#how-it-works', key: 'landing.nav.howItWorks', defaultValue: 'How it works' },
  { to: '/#stats', key: 'landing.nav.stats', defaultValue: 'Stats' },
] as const

export function LandingNav() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <nav
      data-mol-id="landing-nav"
      className={cm.cn('sticky top-0 z-50 bg-surface/80 backdrop-blur-xl shadow-sm')}
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
            'text-2xl font-bold tracking-tight',
          )}
        >
          <BrandWordmark as="span" size="lg" />
        </Link>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }), 'hidden md:flex')}>
          {NAV_LINKS.map((l) => (
            <a
              key={l.to}
              href={l.to}
              data-mol-id={`landing-nav-link-${l.key.split('.').pop()}`}
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant hover:text-primary transition-colors duration-300',
              )}
            >
              {t(l.key, {}, { defaultValue: l.defaultValue })}
            </a>
          ))}
        </div>
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
                'bg-momentum text-on-gradient rounded-full shadow-md hover:shadow-lg transition-all duration-300 active:scale-95',
              )}
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
                  'px-2 text-on-surface-variant hover:text-primary transition-colors duration-300',
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
                  'bg-momentum text-on-gradient rounded-full shadow-md hover:shadow-lg transition-all duration-300 active:scale-95',
                )}
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
