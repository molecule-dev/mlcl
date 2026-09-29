/**
 * Public top navigation — the cinematic Rushes brand bar shown on the
 * marketing/public pages (Landing, About, Privacy, Terms).
 *
 * Auth-aware: when the visitor is already signed in, the Sign in / Start
 * cutting pair collapses to a single "Go to Dashboard" CTA so a logged-in
 * user is never sent back through the auth flow.
 */
import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BrandWordmark } from './BrandWordmark.js'

const ctaClass = (cm: ReturnType<typeof getClassMap>): string =>
  cm.cn(
    cm.fontWeight('semibold'),
    cm.sp('px', 4),
    cm.sp('py', 2),
    cm.textSize('sm'),
    'rounded-lg bg-gradient-to-r from-[var(--video-cta-from)] to-[var(--video-cta-to)] text-white hover:opacity-90 transition-opacity',
  )

export function PublicNav() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <nav
      data-mol-id="public-nav"
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between' }),
        cm.sp('px', 6),
        'h-16 border-b border-[var(--video-border-subtle)] backdrop-blur-md bg-[var(--video-panel-bg)]/80 sticky top-0 z-30',
      )}
    >
      <BrandWordmark size="md" />
      <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }))}>
        {isAuthenticated ? (
          <Link to="/dashboard" data-mol-id="public-nav-dashboard" className={ctaClass(cm)}>
            {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
          </Link>
        ) : (
          <>
            <Link
              to="/login"
              data-mol-id="public-nav-login"
              className={
                'font-mono text-[11px] uppercase tracking-widest text-[var(--video-text-muted-alt)] hover:text-[var(--video-link)] transition-colors'
              }
            >
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </Link>
            <Link to="/signup" data-mol-id="public-nav-signup" className={ctaClass(cm)}>
              {t('landing.cta', {}, { defaultValue: 'Start cutting' })}
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}

export default PublicNav
