// Phase 1 baseline — verbatim JSX of design-personal-finance-login.html
// Do not hand-edit; Phase 2 will extract sections one at a time.
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import LoginBrandingHeader from '../components/LoginBrandingHeader.js'
import LoginForm from '../components/LoginForm.js'
import LoginGlobalFooter from '../components/LoginGlobalFooter.js'
import SocialLoginButtons from '../components/SocialLoginButtons.js'
function Login() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'center' }),
        cm.sp('p', 6),
        cm.minH('screen'),
        'bg-surface-container-low font-body text-on-surface',
      )}
    >
      <main className={cm.cn(cm.w('full'), cm.maxW('md'))}>
        {/* Login Card */}
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'xl' }),
            cm.sp('p', 10),
            'bg-surface-container-lowest rounded-xl tonal-sculpting',
          )}
        >
          {/* Branding Header */}
          <LoginBrandingHeader />
          {/* Form */}
          <LoginForm />
          {/* Divider */}
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.sp('py', 2),
              'relative',
            )}
          >
            <div className={cm.cn(cm.flex({ align: 'center' }), 'absolute inset-0')}>
              <div className={cm.cn(cm.w('full'), 'bg-surface-container h-[1px]')}></div>
            </div>
            <span
              className={cm.cn(
                cm.sp('px', 4),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'relative bg-surface-container-lowest text-outline uppercase tracking-widest',
              )}
            >
              {t('login.orContinueWith', {}, { defaultValue: 'or continue with' })}
            </span>
          </div>
          {/* Social Logins */}
          <SocialLoginButtons />
        </div>
        {/* Footer Link */}
        <footer className={cm.cn(cm.sp('mt', 8), cm.textCenter)}>
          <p
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-on-surface-variant')}
          >
            {t('auth.login.dontHaveAccount', {}, { defaultValue: "Don't have an account?" })}

            <Link
              className={cm.cn(
                'text-primary font-bold hover:underline decoration-2 underline-offset-4 ml-1',
              )}
              to="/signup"
            >
              {t('login.signUp', {}, { defaultValue: 'Sign Up' })}
            </Link>
          </p>
        </footer>
      </main>
      {/* Global Footer from Shared Components (Condensed for Login View) */}
      <LoginGlobalFooter />
    </div>
  )
}

export default Login
export { Login, Login as LoginPage }
