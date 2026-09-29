import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BRAND_GRADIENT } from '../branding.js'
import { BrandWordmark } from './BrandWordmark.js'

/**
 * Public, brand-consistent top navigation shared by the Landing page and the
 * standalone public pages (About, Privacy, Terms). Auth-aware: when the visitor
 * is signed in, the Sign in / Start free trial links collapse into a single
 * "Go to Dashboard" CTA that points at the primary authed route.
 */
export function PublicTopNav() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <nav
      data-mol-id="public-top-nav"
      className={cm.cn(
        'sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant/40',
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
        <BrandWordmark />
        <div className={cm.flex({ align: 'center', gap: 'md' })}>
          {isAuthenticated ? (
            <Link
              to="/ask"
              data-mol-id="public-nav-dashboard"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                'rounded-full text-white hover:opacity-90 transition-opacity',
              )}
              style={{ background: BRAND_GRADIENT }}
            >
              {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'text-on-surface-variant hover:text-on-surface',
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
                  'rounded-full text-white hover:opacity-90 transition-opacity',
                )}
                style={{ background: BRAND_GRADIENT }}
              >
                {t('common.startFreeTrial', {}, { defaultValue: 'Start free trial' })}
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

export default PublicTopNav
