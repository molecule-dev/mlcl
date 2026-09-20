import { useEffect } from 'react'
import { Navigate } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import AuthFooter from '../components/AuthFooter.js'
import LoginCard from '../components/LoginCard.js'

function Login() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()
  const pageTitle = t('login.pageTitle', {}, { defaultValue: 'Sign In' })

  useEffect(() => {
    document.title = pageTitle
  }, [pageTitle])

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div
      aria-label={pageTitle}
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.minH('screen'),
        cm.sp('p', 6),
        'bg-background text-on-background selection:bg-primary-fixed selection:text-primary',
      )}
    >
      <main
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.flex1,
          cm.w('full'),
          cm.maxW('full'),
        )}
      >
        <LoginCard />
      </main>
      <AuthFooter />
    </div>
  )
}

export default Login
export { Login, Login as LoginPage }
