import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * Public marketing-chrome navigation shared by the Landing page and the
 * standalone public pages (About, Privacy, Terms) so the brand stays
 * consistent. Auth-aware: signed-in visitors see a single "Go to
 * Dashboard" CTA instead of the Sign in / Get started pair.
 *
 * Restyled to reference/flagship-apps-designs/design-price-comparison-landing.html:
 * fixed blurred warm-paper bar with soft elevation, bold DM Sans wordmark,
 * an active link with the primary underline, and a deep-to-brand gradient
 * "Get started" button.
 */
export function LandingNav() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <nav
      data-mol-id="landing-nav"
      className={cm.cn(
        'sticky top-0 z-50 bg-surface/80 backdrop-blur-md shadow-[0_8px_32px_var(--shadow-tint)]',
      )}
    >
      <div
        className={cm.cn(
          cm.maxW('xl'),
          cm.sp('px', 6),
          cm.sp('py', 4),
          cm.flex({ align: 'center', justify: 'between' }),
          cm.mxAuto,
          'max-w-screen-2xl flex-wrap gap-x-6 gap-y-2',
        )}
      >
        <Link
          to="/"
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('xl'),
            'text-on-surface tracking-tight min-w-0 whitespace-nowrap shrink-0',
          )}
          style={{ fontFamily: 'var(--font-headline)' }}
        >
          {APP_NAME}
        </Link>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'lg' }),
            'hidden md:flex text-sm tracking-tight',
          )}
        >
          <Link
            to="/about"
            className={cm.cn(cm.fontWeight('bold'), 'text-primary border-b-2 border-primary pb-1')}
          >
            {t('landing.howItWorks', {}, { defaultValue: 'How it works' })}
          </Link>
          <Link
            to="/deals"
            className={cm.cn(
              cm.fontWeight('medium'),
              'text-on-surface hover:text-primary transition-all duration-300',
            )}
          >
            {t('landing.browseDeals', {}, { defaultValue: 'Browse Deals' })}
          </Link>
          <Link
            to="/pricing"
            className={cm.cn(
              cm.fontWeight('medium'),
              'text-on-surface hover:text-primary transition-all duration-300',
            )}
          >
            {t('landing.seePricing', {}, { defaultValue: 'See pricing' })}
          </Link>
          <Link
            to="/alerts"
            className={cm.cn(
              cm.fontWeight('medium'),
              'text-on-surface hover:text-primary transition-all duration-300',
            )}
          >
            {t('landing.nav.alerts', {}, { defaultValue: 'Alerts' })}
          </Link>
        </div>
        <div className={cm.flex({ align: 'center', gap: 'md' })}>
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              data-mol-id="nav-go-to-dashboard"
              className={cm.cn(
                cm.sp('px', 6),
                cm.sp('py', 2.5),
                cm.fontWeight('medium'),
                cm.textSize('sm'),
                'rounded-xl bg-gradient-to-br from-primary-deep to-primary text-on-primary hover:shadow-lg hover:shadow-primary/20 active:scale-95 transition-all whitespace-nowrap shrink-0',
              )}
            >
              {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('medium'),
                  cm.textSize('sm'),
                  'hidden sm:inline text-on-surface hover:text-primary transition-colors whitespace-nowrap',
                )}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link
                to="/signup"
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 2.5),
                  cm.fontWeight('medium'),
                  cm.textSize('sm'),
                  'rounded-xl bg-gradient-to-br from-primary-deep to-primary text-on-primary hover:shadow-lg hover:shadow-primary/20 active:scale-95 transition-all whitespace-nowrap shrink-0',
                )}
              >
                {t('landing.getStarted', {}, { defaultValue: 'Get started' })}
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

export default LandingNav
export { LandingNav as LandingTopNavBar }
