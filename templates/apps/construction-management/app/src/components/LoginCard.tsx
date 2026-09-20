import { getClassMap } from '@molecule/app-ui'

import AuthHeader from './AuthHeader.js'
import LoginForm from './LoginForm.js'
import { OAuthButtons } from './OAuthButtons.js'
import SignupPrompt from './SignupPrompt.js'

export default function LoginCard() {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center' }),
        cm.stack(12),
        cm.sp('p', 16),
        cm.w('full'),
        'max-w-[540px]',
        'bg-surface rounded-2xl custom-shadow',
      )}
    >
      <AuthHeader />
      <LoginForm />
      <SignupPrompt />
      <OAuthButtons />
    </div>
  )
}
export { LoginCard }
