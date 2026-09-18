// Phase 1 baseline — verbatim JSX of design-blog-login.html
// Do not hand-edit; Phase 2 will extract sections one at a time.
import { useEffect } from 'react'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import LoginFooter from '../components/LoginFooter.js'
import LoginMainContent from '../components/LoginMainContent.js'
import LoginTopNavBar from '../components/LoginTopNavBar.js'
function Login() {
  const cm = getClassMap()
  const { isLoading } = useAuth()
  const { t } = useTranslation()
  const pageTitle = t('login.pageTitle', {}, { defaultValue: 'Sign In' })
  useEffect(() => {
    document.title = pageTitle
  }, [pageTitle])
  if (isLoading) {
    return (
      <div
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
          cm.minH('screen'),
          cm.page,
        )}
      >
        <div
          className={cm.cn(
            cm.roundedFull,
            cm.h(12),
            cm.w(12),
            'animate-spin border-b-2 border-stone-900',
          )}
        ></div>
      </div>
    )
  }
  return (
    <div
      aria-label={pageTitle}
      className={cm.cn(cm.flex({ direction: 'col' }), cm.minH('screen'), cm.page)}
    >
      {/* TopNavBar */}
      <LoginTopNavBar />
      {/* Main Content Canvas */}
      <LoginMainContent />
      {/* Footer */}
      <LoginFooter />
    </div>
  )
}

export default Login
export { Login, Login as LoginPage }
