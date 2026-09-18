import { getClassMap } from '@molecule/app-ui'

import LoginBrandHeader from './LoginBrandHeader.js'
import LoginForm from './LoginForm.js'
import LoginSignupPrompt from './LoginSignupPrompt.js'

function LoginCard() {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 8),
        'bg-surface-container-lowest/90 backdrop-blur-xl rounded-xl md:p-12 border border-border/80 shadow-[0_20px_40px_rgba(26,27,32,0.08)]',
      )}
    >
      {/* Brand Identity */}
      <LoginBrandHeader />
      {/* Login Form */}
      <LoginForm />
      {/* Bottom Redirect */}
      <LoginSignupPrompt />
    </div>
  )
}

export default LoginCard
export { LoginCard }
