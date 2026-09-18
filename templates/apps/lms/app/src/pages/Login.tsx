// Phase 1 baseline — verbatim JSX of design-lms-login.html
// Do not hand-edit; Phase 2 will extract sections one at a time.
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import LoginBranding from '../components/LoginBranding.js'
import LoginFooter from '../components/LoginFooter.js'
import LoginForm from '../components/LoginForm.js'
import LoginSignupPrompt from '../components/LoginSignupPrompt.js'
import LoginWelcome from '../components/LoginWelcome.js'
function Login() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.surface, 'font-body text-on-surface antialiased')}>
      {/* Shell Suppression: This is a focused login page, so TopNavBar/SideNav are excluded as per Shell Visibility & Relevance */}
      <main
        className={cm.cn(
          cm.minH('screen'),
          cm.flex({ align: 'center', justify: 'center' }),
          cm.sp('p', 6),
          cm.surface,
        )}
        aria-label={t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
      >
        <div
          className={cm.cn(
            cm.w('full'),
            cm.maxW('md'),
            cm.sp('p', 12),
            'bg-surface-container-lowest scholar-shadow rounded-xl relative overflow-hidden',
          )}
        >
          {/* Branding Section */}
          <LoginBranding />
          {/* Welcome Text */}
          <LoginWelcome />
          {/* Form */}
          <LoginForm />
          {/* Secondary Action */}
          <LoginSignupPrompt />
        </div>
      </main>
      {/* Footer Component as defined in JSON (Content/Styles merged) */}
      <LoginFooter />
    </div>
  )
}

export default Login
export { Login, Login as LoginPage }
