import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import LoginCard from '../components/LoginCard.js'

function Login() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      data-mol-id="page-login"
      aria-label={t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-background text-on-surface antialiased',
      )}
    >
      <main
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.sp('p', 6),
          'flex-grow relative overflow-hidden',
        )}
      >
        <div
          aria-hidden="true"
          className={cm.cn(
            cm.roundedFull,
            'absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-surface-container blur-3xl opacity-50 mix-blend-multiply pointer-events-none',
          )}
        ></div>
        <div
          aria-hidden="true"
          className={cm.cn(
            cm.roundedFull,
            'absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-surface-variant blur-3xl opacity-30 mix-blend-multiply pointer-events-none',
          )}
        ></div>
        <LoginCard />
      </main>
    </div>
  )
}

export default Login
export { Login, Login as LoginPage }
