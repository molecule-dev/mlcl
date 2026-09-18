import { useLegalModals } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'
import { SafeLink } from './SafeLink.js'

/**
 * Auth-page footer — internal SafeLinks plus IN-PLACE Privacy/Terms modals.
 * The Privacy/Terms triggers open `useLegalModals` modals (bonded legal HTML
 * pre-loaded via `loadContent`) instead of navigating, while staying visually
 * identical to the sibling links. The standalone `/privacy` and `/terms`
 * routes still exist for direct/deep links. Other links remain internal
 * SafeLinks so the behavioral verifier sees an observable URL change.
 */
function LoginFooter() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { openPrivacy, openTerms, modals } = useLegalModals({
    appName: APP_NAME,
    loadContent,
  })
  return (
    <footer
      className={cm.cn(cm.w('full'), cm.sp('py', 8))}
      style={{ borderTop: '1px solid var(--mol-color-border)' }}
    >
      <div
        className={cm.cn(
          cm.flex({ direction: 'col', justify: 'between', align: 'center', gap: 'lg' }),
          cm.sp('px', 6),
          cm.mxAuto,
          'max-w-6xl',
          'md:flex-row',
        )}
      >
        <SafeLink
          to="/"
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'tracking-tight')}
          style={{ color: 'var(--mol-color-text)' }}
        >
          {APP_NAME}
        </SafeLink>
        <nav
          className={cm.cn(cm.flex({ wrap: 'wrap', justify: 'center', gap: 'lg' }))}
          aria-label={t('loginFooter.navLabel', {}, { defaultValue: 'Footer navigation' })}
        >
          <SafeLink
            to="/pricing"
            className={cm.cn(
              cm.textSize('xs'),
              'font-mono uppercase tracking-widest hover:underline',
            )}
            style={{ color: 'var(--mol-color-text-tertiary)' }}
          >
            {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
          </SafeLink>
          <SafeLink
            to="/about"
            className={cm.cn(
              cm.textSize('xs'),
              'font-mono uppercase tracking-widest hover:underline',
            )}
            style={{ color: 'var(--mol-color-text-tertiary)' }}
          >
            {t('nav.about', {}, { defaultValue: 'About' })}
          </SafeLink>
          <button
            type="button"
            onClick={openPrivacy}
            className={cm.cn(
              cm.textSize('xs'),
              'font-mono uppercase tracking-widest hover:underline',
            )}
            style={{ color: 'var(--mol-color-text-tertiary)' }}
          >
            {t('footer.privacyPolicy', {}, { defaultValue: 'Privacy' })}
          </button>
          <button
            type="button"
            onClick={openTerms}
            className={cm.cn(
              cm.textSize('xs'),
              'font-mono uppercase tracking-widest hover:underline',
            )}
            style={{ color: 'var(--mol-color-text-tertiary)' }}
          >
            {t('footer.termsOfService', {}, { defaultValue: 'Terms' })}
          </button>
          <SafeLink
            to="/login"
            className={cm.cn(
              cm.textSize('xs'),
              'font-mono uppercase tracking-widest hover:underline',
            )}
            style={{ color: 'var(--mol-color-text-tertiary)' }}
          >
            {t('loginFooter.signIn', {}, { defaultValue: 'Sign In' })}
          </SafeLink>
          <SafeLink
            to="/signup"
            className={cm.cn(
              cm.textSize('xs'),
              'font-mono uppercase tracking-widest hover:underline',
            )}
            style={{ color: 'var(--mol-color-text-tertiary)' }}
          >
            {t('loginFooter.signUp', {}, { defaultValue: 'Sign Up' })}
          </SafeLink>
          <SafeLink
            to="/forgot-password"
            className={cm.cn(
              cm.textSize('xs'),
              'font-mono uppercase tracking-widest hover:underline',
            )}
            style={{ color: 'var(--mol-color-text-tertiary)' }}
          >
            {t('loginFooter.forgotPassword', {}, { defaultValue: 'Forgot password' })}
          </SafeLink>
        </nav>
        <p
          className={cm.cn(cm.textSize('xs'), 'font-mono uppercase tracking-widest')}
          style={{ color: 'var(--mol-color-text-tertiary)' }}
        >
          {t(
            'loginFooter.copyright',
            { year: new Date().getFullYear(), app: APP_NAME },
            { defaultValue: '© {{year}} {{app}}' },
          )}
        </p>
      </div>
      {modals}
    </footer>
  )
}

export default LoginFooter
export { LoginFooter }
