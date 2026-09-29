import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BrandWordmark } from '../components/BrandWordmark.js'
import { AuthField } from './Login.js'

export function ForgotPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { requestStatus, requestError, requestReset } = usePasswordReset()
  // Cross-view auth form persistence — the email typed here carries to
  // Reset Password (and back to Login/Signup). NOT cleared on submit so it
  // survives the navigation to the reset view.
  const { fields: authFormFields, setField: setAuthFormField } = useAuthFormState()
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const isSent = requestStatus === 'resolved'
  const isPending = requestStatus === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await requestReset({ email })
    } catch (_error) {
      // error state is tracked inside the requestReset hook
    }
  }

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        cm.flex({ align: 'center', justify: 'center' }),
        cm.sp('p', 6),
        'bg-gradient-to-br from-blue-50 via-slate-50 to-emerald-50 antialiased',
      )}
    >
      <main className={cm.cn(cm.w('full'), cm.maxW('md'), cm.stack(8))}>
        <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'sm', justify: 'center' }))}>
          <BrandWordmark as="span" size="lg" />
        </Link>

        <div className={cm.cn(cm.sp('p', 8), 'bg-surface rounded-2xl shadow-xl shadow-blue-500/5')}>
          {isSent ? (
            <div className={cm.cn(cm.stack(4), cm.textCenter)}>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.w(16),
                  cm.h(16),
                  cm.roundedFull,
                  'mx-auto bg-success-light text-success',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-3xl')}>mark_email_read</span>
              </div>
              <h2 className={cm.cn('text-2xl font-extrabold tracking-tight text-foreground')}>
                {t('common.checkYourInbox', {}, { defaultValue: 'Check your inbox' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-foreground-secondary')}>
                {t(
                  'forgotPassword.sentBody',
                  { email },
                  { defaultValue: 'We sent a reset link to {{email}}. It expires in 60 minutes.' },
                )}
              </p>
              <Link
                to="/login"
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  'text-blue-600 hover:underline mt-2',
                )}
              >
                {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
              </Link>
            </div>
          ) : (
            <>
              <div className={cm.stack(2)}>
                <h2 className={cm.cn('text-2xl font-extrabold tracking-tight text-foreground')}>
                  {t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
                </h2>
                <p className={cm.cn(cm.textSize('sm'), 'text-foreground-secondary')}>
                  {t(
                    'forgotPassword.subheading',
                    {},
                    {
                      defaultValue:
                        'Enter your email and we\u2019ll send you a link to set a new password.',
                    },
                  )}
                </p>
              </div>
              <form onSubmit={handleSubmit} className={cm.cn(cm.stack(4), cm.sp('mt', 6))}>
                <AuthField
                  label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                  icon="mail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
                {requestError && (
                  <p
                    className={cm.cn(
                      cm.sp('p', 3),
                      cm.textSize('xs'),
                      'rounded-lg bg-rose-50 text-error border border-rose-200',
                    )}
                  >
                    {requestError.message}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={isPending}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                    cm.sp('py', 3),
                    cm.fontWeight('bold'),
                    'rounded-xl bg-gradient-to-br from-blue-600 to-emerald-500 text-white shadow-lg hover:shadow-xl disabled:opacity-50 transition-all',
                  )}
                >
                  {isPending
                    ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
                    : t(
                        'auth.forgotPassword.sendResetLink',
                        {},
                        { defaultValue: 'Send reset link' },
                      )}
                </button>
              </form>
              <p
                className={cm.cn(
                  cm.textCenter,
                  cm.textSize('sm'),
                  'text-foreground-secondary mt-6',
                )}
              >
                {t('forgotPassword.remember', {}, { defaultValue: 'Remember your password?' })}{' '}
                <Link
                  to="/login"
                  className={cm.cn(cm.fontWeight('bold'), 'text-blue-600 hover:underline')}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default ForgotPassword
export { ForgotPassword as ForgotPasswordPage }
