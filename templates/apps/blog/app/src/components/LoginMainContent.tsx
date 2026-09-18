import { getClassMap } from '@molecule/app-ui'

import LoginForm from './LoginForm.js'
import LoginFormHeader from './LoginFormHeader.js'

function LoginMainContent() {
  const cm = getClassMap()
  return (
    <main
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'center' }),
        cm.flex1,
        cm.sp('pb', 12),
        cm.sp('px', 6),
        'pt-24',
      )}
    >
      <div
        className={cm.cn(
          cm.w('full'),
          'max-w-[440px] animate-in fade-in slide-in-from-bottom-4 duration-700',
        )}
      >
        {/* Header Text */}
        <LoginFormHeader />
        {/* Login Form */}
        <LoginForm />
      </div>
    </main>
  )
}

export default LoginMainContent
export { LoginMainContent }
