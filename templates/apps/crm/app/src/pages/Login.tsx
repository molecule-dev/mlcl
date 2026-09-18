import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import LoginBackground from '../components/LoginBackground.js'
import LoginCard from '../components/LoginCard.js'
import LoginFooter from '../components/LoginFooter.js'
import LoginMetaLinks from '../components/LoginMetaLinks.js'
function Login() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      aria-label={t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.minH('screen'),
        'bg-background font-body text-on-surface antialiased',
      )}
    >
      {/* Hero Background Texture (Subtle Architectural Detail) */}
      <LoginBackground />
      <main
        className={cm.cn(
          cm.w('full'),
          cm.maxW('md'),
          cm.sp('px', 6),
          cm.sp('py', 10),
          'relative z-10',
        )}
      >
        {/* Main Login Card */}
        <LoginCard />
        {/* Secondary Meta Links */}
        <LoginMetaLinks />
      </main>
      {/* Shared Component: Footer */}
      <LoginFooter />
    </div>
  )
}

export default Login
export { Login, Login as LoginPage }
