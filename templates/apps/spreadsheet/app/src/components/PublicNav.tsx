import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'

/**
 * Shared public-page navigation chrome (About / Privacy / Terms).
 * Mirrors the Landing header brand mark and is auth-aware: signed-in
 * visitors get a single "Go to Dashboard" CTA instead of sign-in/sign-up.
 */
export function PublicNav() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  const ctaClass =
    'inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-on-primary rounded-full bg-gradient-to-br from-primary to-primary-dark shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform'

  return (
    <header
      data-mol-id="public-nav"
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between' }),
        cm.sp('px', 8),
        cm.sp('py', 5),
        'sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/40',
      )}
    >
      <Link
        to="/"
        data-mol-id="public-nav-brand"
        className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}
      >
        <span
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(9),
            cm.h(9),
            'rounded-xl bg-gradient-to-br from-primary to-primary-dark text-on-primary shadow-lg shadow-primary/30',
          )}
          aria-hidden="true"
        >
          <span
            className={'material-symbols-outlined text-xl'}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            grid_on
          </span>
        </span>
        <span className={cm.cn('text-xl font-extrabold tracking-tight text-on-surface')}>
          {APP_NAME}
        </span>
      </Link>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
        <ThemeToggle />
        {isAuthenticated ? (
          <Link to="/workbooks" data-mol-id="public-nav-dashboard" className={ctaClass}>
            {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
            <span className={'material-symbols-outlined text-base'} aria-hidden="true">
              arrow_forward
            </span>
          </Link>
        ) : (
          <>
            <Link
              to="/login"
              className={
                'hidden sm:inline-flex px-4 py-2 text-sm font-bold text-on-surface-variant hover:text-primary transition-colors'
              }
            >
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </Link>
            <Link to="/signup" data-mol-id="public-nav-signup" className={ctaClass}>
              {t('common.startFree', {}, { defaultValue: 'Start free' })}
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </>
        )}
      </div>
    </header>
  )
}

export default PublicNav
