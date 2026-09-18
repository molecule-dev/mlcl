import { useEffect } from 'react'
import { useNavigate } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import AuthFooter from '../components/AuthFooter.js'
import LoginForm from '../components/LoginForm.js'
import LoginHeader from '../components/LoginHeader.js'
import SignUpPrompt from '../components/SignUpPrompt.js'
function Login() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true })
  }, [user, navigate])
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.w('full'),
        cm.minH('screen'),
        'bg-mesh-gradient font-body text-on-surface antialiased overflow-hidden',
      )}
      aria-label={t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
    >
      {/* Top Navigation Suppressed: Transactional Screen (Login) */}
      {/* Main Canvas */}
      <main
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.sp('p', 6),
          'flex-grow relative z-10',
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center' }),
            cm.w('full'),
            cm.sp('p', 10),
            'glass-card max-w-[440px] rounded-[12px]',
          )}
        >
          <LoginHeader />
          <LoginForm />
          <SignUpPrompt />
        </div>
      </main>
      {/* Footer Component */}
      <AuthFooter />
    </div>
  )
}

export default Login
export { Login, Login as LoginPage }
