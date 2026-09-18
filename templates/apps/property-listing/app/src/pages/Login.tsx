// Phase 1 baseline — verbatim JSX of design-property-listing-login.html
// Phase 2 added a screen-reader-only page heading so the page itself
// (not just child components) routes a string through `t()`.
import { useLegalModals } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import LoginBrandHeader from '../components/LoginBrandHeader.js'
import LoginFooter from '../components/LoginFooter.js'
import LoginForm from '../components/LoginForm.js'
import LoginSignupPrompt from '../components/LoginSignupPrompt.js'
import LoginWelcomeHeader from '../components/LoginWelcomeHeader.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { loadContent } from '../config.js'

function Login() {
  const cm = getClassMap()
  const { t } = useTranslation()
  // In-place Privacy/Terms modals (no navigation) — same bonded legal HTML
  // as the standalone /privacy and /terms routes, pre-loaded via loadContent.
  const { openPrivacy, openTerms, modals } = useLegalModals({ appName: APP_NAME, loadContent })
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'center' }),
        cm.sp('p', 6),
        cm.minH('screen'),
        'bg-background font-body text-on-surface selection:bg-primary-fixed selection:text-on-primary-fixed',
      )}
    >
      <h1 className={cm.srOnly}>{t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}</h1>
      <main className={cm.cn(cm.w('full'), cm.maxW('lg'))}>
        {/* Auth Card */}
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', gap: 'xl' }),
            cm.w('full'),
            cm.sp('p', 10),
            'bg-surface-container-lowest rounded-xl md:p-14 luxury-shadow',
          )}
        >
          {/* Logo */}
          <LoginBrandHeader />
          {/* Header */}
          <LoginWelcomeHeader />
          <LoginForm />
          <OAuthButtons />
          <LoginSignupPrompt />
          {/* Legal consent — Terms/Privacy open in-place modals (no navigation). */}
          <p className={cm.cn(cm.textCenter, cm.textSize('xs'), 'text-on-surface-variant')}>
            {t('auth.legalConsent', {}, { defaultValue: 'By continuing, you agree to our' })}{' '}
            <button
              type="button"
              onClick={openTerms}
              className={cm.cn('font-semibold text-primary hover:underline')}
            >
              {t('nav.terms', {}, { defaultValue: 'Terms' })}
            </button>{' '}
            {t('common.and', {}, { defaultValue: 'and' })}{' '}
            <button
              type="button"
              onClick={openPrivacy}
              className={cm.cn('font-semibold text-primary hover:underline')}
            >
              {t('nav.privacy', {}, { defaultValue: 'Privacy' })}
            </button>
          </p>
        </div>
        <LoginFooter />
      </main>
      {/* Background Decoration */}
      <div className={cm.cn('fixed inset-0 -z-10 overflow-hidden pointer-events-none')}>
        <div
          className={cm.cn(
            'w-[40%]',
            'h-[40%]',
            cm.roundedFull,
            'absolute top-[-10%] right-[-10%] bg-primary/5 blur-[120px]',
          )}
        ></div>
        <div
          className={cm.cn(
            'w-[40%]',
            'h-[40%]',
            cm.roundedFull,
            'absolute bottom-[-10%] left-[-10%] bg-secondary/5 blur-[120px]',
          )}
        ></div>
      </div>
      {modals}
    </div>
  )
}

export default Login
export { Login, Login as LoginPage }
