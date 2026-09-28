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
    <header
      className={cm.cn(
        cm.w('full'),
        'fixed top-0 z-50 h-14 bg-surface/90 backdrop-blur-sm border-b border-surface-container-highest transition-colors duration-150 ease-out',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ justify: 'between', align: 'center' }),
          cm.sp('px', 6),
          'h-full mx-auto w-full max-w-7xl md:px-12',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }))}>
          <SafeLink className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'group')} to="/">
            <span
              className={cm.cn(
                'inline-flex items-center justify-center w-7 h-7 rounded-sm bg-primary-container text-on-primary-container shadow-sm',
                'transition-transform group-hover:scale-95 duration-150',
              )}
            >
              <span className={cm.fv5b245ffa} aria-hidden>
                mark_email_read
              </span>
            </span>
            <span
              className={cm.cn('font-headline text-xl font-medium tracking-tight text-on-surface')}
            >
              {t(
                'landingTopNavBar.brandName',
                { appName: APP_NAME },
                { defaultValue: '{{appName}}' },
              )}
            </span>
          </SafeLink>
          <nav
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'lg' }),
              cm.textSize('sm'),
              'hidden md:flex font-label',
            )}
          >
            <SafeLink
              className={cm.cn(
                cm.fontWeight('medium'),
                'inline-block px-1 py-2',
                'text-on-surface-variant hover:text-primary transition-colors duration-150',
              )}
              to="/#archive"
            >
              {t('landingTopNavBar.archive', {}, { defaultValue: 'Archive' })}
            </SafeLink>
            <SafeLink
              className={cm.cn(
                cm.fontWeight('medium'),
                'inline-block px-1 py-2',
                'text-on-surface-variant hover:text-primary transition-colors duration-150',
              )}
              to="/pricing"
            >
              {t('landingTopNavBar.membership', {}, { defaultValue: 'Pricing' })}
            </SafeLink>
            <SafeLink
              className={cm.cn(
                cm.fontWeight('medium'),
                'inline-block px-1 py-2',
                'text-on-surface-variant hover:text-primary transition-colors duration-150',
              )}
              to="/signup"
            >
              {t('landingTopNavBar.startWriting', {}, { defaultValue: 'Start writing' })}
            </SafeLink>
          </nav>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
          <ThemeToggle />
          {isAuthenticated ? (
            <>
              <SafeLink
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.roundedFull,
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'inline-flex items-center gap-1.5 bg-primary-container text-on-primary-container hover:bg-primary shadow-sm transition-colors duration-150',
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
                  'inline-block px-1 py-2',
                  'text-on-surface hover:text-primary transition-colors duration-150',
                )}
                to="/login"
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </SafeLink>
              <SafeLink
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.roundedFull,
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'inline-flex items-center gap-1.5 bg-primary-container text-on-primary-container hover:bg-primary shadow-sm transition-colors duration-150',
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
