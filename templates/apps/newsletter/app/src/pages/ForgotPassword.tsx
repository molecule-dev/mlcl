// Phase 1 — derived copy from Login (same stitch: design-blog-login.html).
// Phase 4 wires it to this screen's own auth flow (forgotPassword, not login).
import { useEffect } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import ForgotPasswordMainContent from '../components/ForgotPasswordMainContent.js'
import LoginFooter from '../components/LoginFooter.js'
import LoginTopNavBar from '../components/LoginTopNavBar.js'
function ForgotPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const pageTitle = t('forgotPassword.pageTitle', {}, { defaultValue: 'Forgot Password' })
  useEffect(() => {
    document.title = pageTitle
  }, [pageTitle])
  return (
    <div
      aria-label={pageTitle}
      className={cm.cn(cm.flex({ direction: 'col' }), cm.minH('screen'), cm.page)}
    >
      {/* TopNavBar */}
      <LoginTopNavBar />
      {/* Main Content Canvas */}
      <ForgotPasswordMainContent />
      {/* Footer */}
      <LoginFooter />
    </div>
  )
}

export default ForgotPassword
export { ForgotPassword, ForgotPassword as ForgotPasswordPage }
