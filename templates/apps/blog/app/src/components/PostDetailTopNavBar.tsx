import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { SafeLink } from './SafeLink.js'
function PostDetailTopNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <nav className={cm.cn(cm.w('full'), 'fixed top-0 z-50 bg-background/80 backdrop-blur-md')}>
      <div
        className={cm.cn(
          cm.flex({ justify: 'between', align: 'center' }),
          cm.sp('px', 8),
          cm.sp('py', 4),
          cm.mxAuto,
          'max-w-7xl',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xl' }))}>
          <SafeLink
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('bold'),
              'font-serif text-[var(--color-status-published)] dark:text-[var(--color-status-published)] tracking-tight',
            )}
            to="/"
          >
            {t('postDetailTopNavBar.brand', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
          </SafeLink>
          <div className={cm.cn(cm.flex({ gap: 'lg' }), 'hidden md:flex')}>
            <SafeLink
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('medium'),
                'text-foreground-secondary hover:text-primary transition-colors duration-200 uppercase tracking-widest',
              )}
              to="/about"
            >
              {t('postDetailTopNavBar.about', {}, { defaultValue: 'Our story' })}
            </SafeLink>
            <SafeLink
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('medium'),
                'text-foreground-secondary hover:text-primary transition-colors duration-200 uppercase tracking-widest',
              )}
              to="/pricing"
            >
              {t('postDetailTopNavBar.membership', {}, { defaultValue: 'Membership' })}
            </SafeLink>
            <SafeLink
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('medium'),
                'text-foreground-secondary hover:text-primary transition-colors duration-200 uppercase tracking-widest',
              )}
              to="/signup?intent=write"
            >
              {t('postDetailTopNavBar.write', {}, { defaultValue: 'Write' })}
            </SafeLink>
          </div>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
          <SafeLink
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('medium'),
              'hidden md:block text-foreground-secondary hover:text-primary transition-colors duration-200',
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
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'bg-primary text-on-primary uppercase tracking-widest hover:bg-primary-container transition-all active:scale-95 duration-200',
            )}
            to="/signup"
          >
            {t('common.getStarted', {}, { defaultValue: 'Get started' })}
          </SafeLink>
        </div>
      </div>
    </nav>
  )
}

export default PostDetailTopNavBar
export { PostDetailTopNavBar }
