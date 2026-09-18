import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import LoginBackgroundOrbs from '../components/LoginBackgroundOrbs.js'
import LoginCard from '../components/LoginCard.js'
import LoginFooter from '../components/LoginFooter.js'

function Login() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        'bg-surface font-body text-on-surface min-h-screen flex flex-col relative overflow-hidden',
      )}
      aria-label={t('login.pageLabel', {}, { defaultValue: 'Sign in to Chatbot Builder' })}
    >
      <LoginBackgroundOrbs />
      {/* Main Content */}
      <LoginCard />
      {/* Shared Component Footer */}
      <LoginFooter />
    </div>
  )
}

export default Login
export { Login, Login as LoginPage }
