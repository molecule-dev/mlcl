import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

interface LandingTopNavBarProps {
  /**
   * `fixed` pins the bar over the hero (Landing) the way the Stitch design
   * shows it; `static` (default) keeps it in flow for the scrolling public
   * pages (About / Privacy / Terms) that share this chrome.
   */
  variant?: 'fixed' | 'static'
}

/**
 * Public marketing top nav, shared across the Landing page and the
 * standalone public pages (About / Privacy / Terms) so the brand chrome
 * stays consistent. Auth-aware: when the visitor is signed in, the
 * Sign in / Start free trial links collapse into a single Go to Dashboard
 * CTA pointing at the app's primary authed route (`/surveys`).
 */
export function LandingTopNavBar({ variant = 'static' }: LandingTopNavBarProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <header
      data-mol-id="landing-nav"
      className={cm.cn(
        'w-full',
        variant === 'fixed' ? 'fixed inset-x-0 top-0 z-50' : 'relative z-40',
        variant === 'fixed' && 'ambient-shadow bg-surface/80 backdrop-blur-xl',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          'mx-auto w-full max-w-7xl gap-4 px-6 py-4 lg:px-8',
        )}
      >
        <Link to="/" className={cm.cn('text-2xl font-black tracking-tighter text-primary')}>
          {APP_NAME}
        </Link>
        <nav
          className={cm.cn(cm.flex({ align: 'center', gap: 8 }), 'hidden md:flex')}
          aria-label={t('landing.navAria', {}, { defaultValue: 'Marketing' })}
        >
          <a
            href="#product"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'text-on-surface-variant transition-colors hover:text-primary',
            )}
          >
            {t('nav.product', {}, { defaultValue: 'Features' })}
          </a>
          <a
            href="#templates"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'text-on-surface-variant transition-colors hover:text-primary',
            )}
          >
            {t('nav.templates', {}, { defaultValue: 'Templates' })}
          </a>
          <a
            href="#pricing"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'text-on-surface-variant transition-colors hover:text-primary',
            )}
          >
            {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
          </a>
        </nav>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }))}>
          {isAuthenticated ? (
            <Link
              to="/surveys"
              data-mol-id="landing-nav-dashboard"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 2 }),
                cm.sp('px', 6),
                cm.sp('py', 2.5),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'rounded-full bg-gradient-to-br from-primary to-secondary text-on-primary transition-opacity hover:opacity-90',
              )}
            >
              {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 18 }}
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
                  cm.flex({ align: 'center' }),
                  cm.sp('px', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'hidden min-h-[36px] items-center text-on-surface-variant transition-colors hover:text-primary md:flex',
                )}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link
                to="/signup"
                data-mol-id="landing-nav-cta"
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 2 }),
                  cm.sp('px', 6),
                  cm.sp('py', 2.5),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  'rounded-full bg-gradient-to-br from-primary to-secondary text-on-primary transition-opacity hover:opacity-90',
                )}
              >
                {t('common.startFreeTrial', {}, { defaultValue: 'Get Started' })}
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 18 }}
                  aria-hidden="true"
                >
                  arrow_forward
                </span>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export default LandingTopNavBar
