import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import AuthHeader from './AuthHeader.js'
import { OAuthButtons } from './OAuthButtons.js'
import SignInPrompt from './SignInPrompt.js'
import SignupForm from './SignupForm.js'

export default function SignupCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
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
      <AuthHeader
        title={t('auth.signup.createYourAccount', {}, { defaultValue: 'Create your account' })}
        subtitle={t(
          'signup.subtitle',
          {},
          { defaultValue: 'Start organizing your projects in minutes' },
        )}
      />
      <SignupForm />
      <SignInPrompt />
      <OAuthButtons />
    </div>
  )
}
export { SignupCard }
