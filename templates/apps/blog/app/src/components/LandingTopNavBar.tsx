import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ThemeToggle } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { SafeLink } from './SafeLink.js'
import { UserMenu } from './UserMenu.js'
function LandingTopNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()
  return (
    <header className={cm.cn(cm.w('full'), 'fixed top-0 z-50 bg-surface/80 backdrop-blur-md')}>
      <div
        className={cm.cn(
          cm.flex({ justify: 'between', align: 'center' }),
          cm.sp('px', 6),
          cm.sp('py', 4),
          cm.mxAuto,
          cm.w('full'),
          'max-w-7xl',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xl' }))}>
          <SafeLink
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('bold'),
              'font-serif text-[var(--color-status-published)] tracking-tight',
            )}
            to="/"
          >
            {t(
              'landingTopNavBar.brandName',
              { appName: APP_NAME },
              { defaultValue: '{{appName}}' },
            )}
          </SafeLink>
          <nav
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'lg' }),
              cm.textSize('xs'),
              'hidden md:flex font-label tracking-wide',
            )}
          >
            <SafeLink
              className={cm.cn(
                cm.fontWeight('medium'),
                'text-foreground-secondary hover:text-[var(--color-status-published)] transition-all',
              )}
              to="/about"
            >
              {t('landingTopNavBar.ourStory', {}, { defaultValue: 'Our Story' })}
            </SafeLink>
            <SafeLink
              className={cm.cn(
                cm.fontWeight('medium'),
                'text-foreground-secondary hover:text-[var(--color-status-published)] transition-all',
              )}
              to="/pricing"
            >
              {t('landingTopNavBar.membership', {}, { defaultValue: 'Membership' })}
            </SafeLink>
            <SafeLink
              className={cm.cn(
                cm.fontWeight('medium'),
                'text-foreground-secondary hover:text-[var(--color-status-published)] transition-all',
              )}
              to="/signup?intent=write"
            >
              {t('landingTopNavBar.write', {}, { defaultValue: 'Write' })}
            </SafeLink>
          </nav>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
          <ThemeToggle />
          {isAuthenticated ? (
            <>
              <SafeLink
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 2),
                  cm.roundedFull,
                  cm.fontWeight('semibold'),
                  cm.textSize('xs'),
                  'bg-primary text-on-primary uppercase tracking-widest hover:bg-primary-container transition-all scale-98 active:scale-95 duration-200',
                )}
                to="/dashboard"
              >
                {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              </SafeLink>
              <UserMenu />
            </>
          ) : (
            <>
              <SafeLink
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'text-foreground-secondary hover:text-[var(--color-status-published)] transition-all',
                )}
                to="/login"
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </SafeLink>
              <SafeLink
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 2),
                  cm.roundedFull,
                  cm.fontWeight('semibold'),
                  cm.textSize('xs'),
                  'bg-primary text-on-primary uppercase tracking-widest hover:bg-primary-container transition-all scale-98 active:scale-95 duration-200',
                )}
                to="/signup"
              >
                {t('common.getStarted', {}, { defaultValue: 'Get started' })}
              </SafeLink>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export default LandingTopNavBar
export { LandingTopNavBar }
