import { getClassMap } from '@molecule/app-ui'

import LoginDivider from './LoginDivider.js'
import LoginForm from './LoginForm.js'
import LoginHeader from './LoginHeader.js'
import LoginLogo from './LoginLogo.js'
import LoginSignUpPrompt from './LoginSignUpPrompt.js'
import LoginSocialButtons from './LoginSocialButtons.js'

function LoginCard() {
  const cm = getClassMap()
  return (
    <main
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'center' }),
        cm.sp('p', 6),
        'flex-grow relative z-10',
      )}
    >
      <div
        className={cm.cn(
          cm.w('full'),
          cm.sp('p', 8),
          cm.flex({ direction: 'col', align: 'center' }),
          cm.stack(8),
          'max-w-[440px] glass-card ambient-glow rounded-lg md:p-10',
        )}
      >
        {/* Logo Section */}
        <LoginLogo />
        {/* Header */}
        <LoginHeader />
        {/* Form */}
        <LoginForm />
        {/* Divider */}
        <LoginDivider />
        {/* Social Logins */}
        <LoginSocialButtons />
        {/* Footer Link */}
        <LoginSignUpPrompt />
      </div>
    </main>
  )
}

export default LoginCard
export { LoginCard }
