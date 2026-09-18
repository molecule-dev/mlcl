// Phase 1 baseline — verbatim JSX of design-helpdesk-ticketing-login.html
// Do not hand-edit; Phase 2 will extract sections one at a time.
import { useEffect } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import LoginCard from '../components/LoginCard.js'
import LoginDecorations from '../components/LoginDecorations.js'
import LoginFooter from '../components/LoginFooter.js'
import LoginLogo from '../components/LoginLogo.js'

function Login() {
  const cm = getClassMap()
  const { t } = useTranslation()
  useEffect(() => {
    document.title = t(
      'login.pageTitle',
      { appName: APP_NAME },
      { defaultValue: 'Sign in — {{appName}} Support' },
    )
  }, [t])
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'center' }),
        cm.minH('screen'),
        cm.sp('p', 6),
        'bg-background selection:bg-primary-fixed selection:text-on-primary-fixed',
      )}
    >
      <main
        className={cm.cn(
          cm.w('full'),
          cm.maxW('[440px]'),
          cm.stack(10),
          'animate-in fade-in duration-700',
        )}
      >
        {/* Logo Area */}
        <LoginLogo />
        {/* Login Card */}
        <LoginCard />
        {/* Global Footer (Shared Component Guidance) */}
        <LoginFooter />
      </main>
      <LoginDecorations />
    </div>
  )
}

export default Login
export { Login, Login as LoginPage }
