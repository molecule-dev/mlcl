import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import LoginFooter from '../components/LoginFooter.js'
import LoginTopNavBar from '../components/LoginTopNavBar.js'
import ResetPasswordForm from '../components/ResetPasswordForm.js'
function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.flex({ direction: 'col' }), cm.minH('screen'), 'bg-background')}>
      {/* TopNavBar */}
      <LoginTopNavBar />
      {/* Main Content Canvas */}
      <main
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.sp('pb', 12),
          cm.sp('px', 6),
          cm.flex1,
          'pt-24',
        )}
      >
        <div
          className={cm.cn(
            cm.w('full'),
            'max-w-[440px]',
            'animate-in fade-in slide-in-from-bottom-4 duration-700',
          )}
        >
          <div className={cm.cn(cm.textCenter, cm.sp('mb', 10))}>
            <h1
              className={cm.cn(
                cm.sp('mb', 2),
                'font-headline text-[2.5rem] leading-tight tracking-tight text-on-surface',
              )}
            >
              {t('auth.resetPassword.setNewPassword', {}, { defaultValue: 'Set a new password' })}
            </h1>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                'font-sans-ui text-on-surface-variant tracking-wide',
              )}
            >
              {t(
                'resetPassword.subtitle',
                {},
                { defaultValue: 'Choose a new password for your account' },
              )}
            </p>
          </div>
          <ResetPasswordForm />
        </div>
      </main>
      {/* Footer */}
      <LoginFooter />
    </div>
  )
}

export default ResetPassword
export { ResetPassword, ResetPassword as ResetPasswordPage }
