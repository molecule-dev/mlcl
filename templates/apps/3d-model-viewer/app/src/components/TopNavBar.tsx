import { Link, useLocation } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
function TopNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()
  const location = useLocation()
  // Active state derives from the current route — never hardcode it, or the
  // same item renders "active" on every page that shares this nav.
  const navLinkClass = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/')
      ? cm.cn(
          cm.fontWeight('semibold'),
          cm.sp('pb', 1),
          cm.textSize('sm'),
          'text-primary border-b-2 border-primary font-inter tracking-tight',
        )
      : cm.cn(
          cm.sp('pb', 1),
          cm.textSize('sm'),
          'text-foreground-secondary font-inter tracking-tight transition-colors hover:text-primary',
        )
  return (
    <header
      className={cm.cn(
        cm.w('full'),
        'fixed top-0 z-50 bg-surface/70 backdrop-blur-xl bg-surface-secondary/50 shadow-sm transition-all duration-200',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ justify: 'between', align: 'center' }),
          cm.sp('px', 8),
          cm.sp('py', 4),
          cm.maxW('7xl'),
          cm.mxAuto,
        )}
      >
        <div className={cm.flex({ align: 'center', gap: 8 })}>
          <Link
            className={cm.cn(
              cm.textSize('2xl'),
              'font-black tracking-tighter text-foreground transition-opacity hover:opacity-80',
            )}
            to="/"
          >
            {t('topNavBar.brandName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
          </Link>
          <nav className={cm.cn('hidden md:flex gap-6')}>
            <Link className={navLinkClass('/models')} to="/models">
              {t('topNavBar.showcase', {}, { defaultValue: 'Showcase' })}
            </Link>
            {/* Only render nav items that resolve to real routes — drop the
            decorative "Tools / Learning / Pricing" placeholders so users
            don't click into dead-ends. */}
            <Link className={navLinkClass('/about')} to="/about">
              {t('nav.about', {}, { defaultValue: 'About' })}
            </Link>
          </nav>
        </div>
        <div className={cm.flex({ align: 'center', gap: 4 })}>
          {isAuthenticated ? (
            <Link
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'primary-gradient text-on-primary rounded-xl hover:shadow-ambient transform hover:scale-[0.98] transition-all',
              )}
              to="/dashboard"
            >
              {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
            </Link>
          ) : (
            <>
              <Link
                className={cm.cn(
                  cm.fontWeight('medium'),
                  cm.textSize('sm'),
                  'hidden md:block text-foreground-secondary hover:text-primary transition-colors',
                )}
                to="/login"
              >
                {t('common.logIn', {}, { defaultValue: 'Log In' })}
              </Link>
              <Link
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'primary-gradient text-on-primary rounded-xl hover:shadow-ambient transform hover:scale-[0.98] transition-all',
                )}
                to="/signup"
              >
                {t('topNavBar.startCreating', {}, { defaultValue: 'Start Creating' })}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export default TopNavBar
export { TopNavBar }
