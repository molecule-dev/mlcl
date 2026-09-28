/**
 * LandingTopNavBar — shared public top navigation for Rapport's marketing &
 * content pages (Landing, About, Privacy, Terms).
 *
 * Auth-aware: when the visitor is signed in, the Sign in / Start free links
 * collapse into a single "Go to Dashboard" CTA. Section anchors are prefixed
 * with `/` so they scroll in-page on Landing and navigate back to Landing from
 * the standalone content pages.
 */
import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ThemeToggle } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'

export function LandingTopNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()
  return (
    <header
      data-mol-id="landing-top-nav"
      className={cm.cn(
        cm.flex({ justify: 'between', align: 'center' }),
        cm.sp('px', 6),
        cm.sp('py', 4),
        'md:px-12',
      )}
    >
      <Link
        data-mol-id="landing-logo"
        to="/"
        className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}
      >
        <span className={'material-symbols-outlined text-primary text-2xl'}>graphic_eq</span>
        <span className={cm.cn(cm.fontWeight('bold'), cm.textSize('xl'), 'tracking-tight')}>
          {t('common.appName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
        </span>
      </Link>
      <nav
        className={cm.cn(cm.flex({ align: 'center', gap: 6 }), cm.textSize('sm'), 'hidden md:flex')}
      >
        <a
          href="/#features"
          className={'text-on-surface-variant hover:text-on-surface transition-colors'}
        >
          {t('nav.features', {}, { defaultValue: 'Features' })}
        </a>
        <a
          href="/#testimonials"
          className={'text-on-surface-variant hover:text-on-surface transition-colors'}
        >
          {t('landing.nav.customers', {}, { defaultValue: 'Customers' })}
        </a>
        <Link
          to="/pricing"
          className={'text-on-surface-variant hover:text-on-surface transition-colors'}
        >
          {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
        </Link>
      </nav>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
        <ThemeToggle />
        {isAuthenticated ? (
          <Link
            data-mol-id="landing-dashboard"
            to="/dashboard"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              cm.sp('px', 5),
              cm.sp('py', 2),
              'rounded-full bg-primary text-on-primary hover:scale-[1.02] transition-transform',
            )}
          >
            {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
          </Link>
        ) : (
          <>
            <Link
              data-mol-id="landing-signin"
              to="/login"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                cm.sp('px', 4),
                cm.sp('py', 2),
                'text-on-surface hover:text-primary transition-colors',
              )}
            >
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </Link>
            <Link
              data-mol-id="landing-signup"
              to="/signup"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                cm.sp('px', 5),
                cm.sp('py', 2),
                'rounded-lg btn-gradient text-on-primary hover:scale-[1.03] transition-transform duration-300 ease-out shadow-ambient',
              )}
            >
              {t('common.startFree', {}, { defaultValue: 'Start free' })}
            </Link>
          </>
        )}
      </div>
    </header>
  )
}

export default LandingTopNavBar
