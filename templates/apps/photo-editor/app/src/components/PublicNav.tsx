/**
 * Public top navigation shared by the Landing, About, Privacy, and Terms
 * pages so the brand chrome stays identical across every unauthenticated
 * surface. Auth-aware: once the visitor is signed in the sign-in / sign-up
 * pair collapses into a single "Go to Dashboard" CTA pointing at the
 * primary authed route (`/library`).
 */
import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { LustraWordmark } from './LustraWordmark.js'

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
        'h-16 border-b border-[var(--photo-border)] backdrop-blur-md bg-[var(--photo-toolbar-bg)]/80 sticky top-0 z-30',
      )}
    >
      <LustraWordmark size="md" to="/" />
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
        {isAuthenticated ? (
          <Link
            to="/library"
            data-mol-id="public-nav-dashboard"
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'rounded-lg bg-gradient-to-r from-[var(--photo-accent)] to-[var(--photo-danger)] text-white hover:opacity-90 transition-opacity',
            )}
          >
            {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
          </Link>
        ) : (
          <>
            <Link
              to="/login"
              data-mol-id="public-nav-login"
              className={cm.cn(
                'font-mono text-[11px] uppercase tracking-widest text-[var(--photo-text-muted)] hover:text-[var(--photo-panel-text-highlight)] transition-colors',
              )}
            >
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </Link>
            <Link
              to="/signup"
              data-mol-id="public-nav-signup"
              className={cm.cn(
                cm.fontWeight('semibold'),
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'rounded-lg bg-gradient-to-r from-[var(--photo-accent)] to-[var(--photo-danger)] text-white hover:opacity-90 transition-opacity',
              )}
            >
              {t('landing.cta', { appName: APP_NAME }, { defaultValue: 'Open {{appName}}' })}
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}

export default PublicNav
