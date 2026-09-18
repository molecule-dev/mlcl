import { useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthShell } from '../components/AuthShell.js'

function ForgotPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { requestReset, requestStatus } = usePasswordReset()
  const loading = requestStatus === 'pending'
  // Cross-view auth form persistence — the email typed here carries to the
  // other auth views (Login/Signup/Reset) via the shared @molecule hook.
  const { fields: authFormFields, setField: setAuthFormField } = useAuthFormState()
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await requestReset({ email })
      setSubmitted(true)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(
              'auth.forgotPassword.couldNotSendResetLink',
              {},
              { defaultValue: 'Could not send reset link.' },
            ),
      )
    }
  }

  return (
    <AuthShell
      heading={t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
      subheading={t(
        'forgotPassword.subheading',
        {},
        { defaultValue: 'Enter your email — we’ll send you a secure reset link.' },
      )}
      footer={
        <Link
          to="/login"
          className={cm.cn(cm.fontWeight('semibold'), 'text-primary-dark hover:underline')}
        >
          {t('forgotPassword.backToSignIn', {}, { defaultValue: 'Back to Sign in' })}
        </Link>
      }
    >
      {submitted ? (
        <div
          role="status"
          aria-live="polite"
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 3, align: 'start' }),
            cm.sp('p', 5),
            'rounded-md bg-[var(--color-status-success-bg)] text-[var(--color-status-success-text)]',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
              mark_email_read
            </span>
            <span className={cm.cn(cm.fontWeight('bold'))}>
              {t('common.checkYourInbox', {}, { defaultValue: 'Check your inbox' })}
            </span>
          </div>
          <p className={cm.cn(cm.textSize('sm'))}>
            {t(
              'forgotPassword.successBody',
              { email },
              {
                defaultValue:
                  'If an account exists for {{email}}, a reset link is on its way. The link expires in 30 minutes.',
              },
            )}
          </p>
        </div>
      ) : (
        <form className={cm.cn(cm.flex({ direction: 'col', gap: 4 }))} onSubmit={handleSubmit}>
          {error && (
            <div
              role="alert"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'rounded-md bg-[var(--color-status-error-bg)] text-[var(--color-status-error-text)]',
              )}
            >
              {error}
            </div>
          )}
          <label className={cm.cn(cm.flex({ direction: 'col', gap: 1 }))}>
            <span
              className={cm.cn(
                cm.fontWeight('semibold'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
            </span>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 2 }),
                cm.sp('px', 4),
                'h-12 rounded-md border border-[color:var(--color-border)] bg-surface-secondary focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition-shadow',
              )}
            >
              <span
                className="material-symbols-outlined text-on-surface-variant"
                style={{ fontSize: 18 }}
              >
                mail
              </span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={cm.cn(
                  cm.flex1,
                  cm.sp('p', 0),
                  cm.fontWeight('medium'),
                  cm.textSize('sm'),
                  'bg-transparent border-none focus:outline-none focus:ring-0 text-on-surface placeholder:text-on-surface-variant',
                )}
                placeholder={t(
                  'auth.passwordPlaceholderCompanyEmail',
                  {},
                  { defaultValue: 'you@company.com' },
                )}
              />
            </div>
          </label>
          <button
            type="submit"
            disabled={loading}
            className={cm.cn(
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'rounded-md bg-gradient-to-r from-primary to-secondary text-white shadow-md hover:shadow-lg hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-60',
            )}
          >
            {loading
              ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
              : t('auth.forgotPassword.sendResetLink', {}, { defaultValue: 'Send reset link' })}
          </button>
        </form>
      )}
    </AuthShell>
  )
}

export default ForgotPassword
export { ForgotPassword, ForgotPassword as ForgotPasswordPage }
