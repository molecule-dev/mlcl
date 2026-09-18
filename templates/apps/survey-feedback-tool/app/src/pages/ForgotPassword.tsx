import { useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthShell } from '../components/AuthShell.js'

export function ForgotPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { requestStatus, requestError, requestReset } = usePasswordReset()
  // Cross-view auth form persistence — the email typed here carries to the
  // other auth views (Login/Signup/Reset) via the shared @molecule hook.
  const { fields: authFormFields, setField: setAuthFormField } = useAuthFormState()
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const [submitted, setSubmitted] = useState(false)

  const loading = requestStatus === 'pending'
  const error =
    requestError instanceof Error
      ? requestError.message
      : requestError
        ? t(
            'forgotPassword.failed',
            {},
            { defaultValue: 'Could not send reset email. Please try again.' },
          )
        : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await requestReset({ email })
      setSubmitted(true)
    } catch (_error) {
      // Error tracked in hook state — no additional handling needed here
    }
  }

  return (
    <AuthShell
      heading={t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
      subheading={t(
        'forgotPassword.subheading',
        {},
        { defaultValue: "Enter your email and we'll send you a recovery link." },
      )}
      footer={
        <>
          <span>{t('auth.login.rememberedIt', {}, { defaultValue: 'Remembered it?' })}</span>
          <Link
            to="/login"
            className={cm.cn(cm.fontWeight('semibold'), 'text-primary hover:underline')}
          >
            {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
          </Link>
        </>
      }
    >
      {submitted ? (
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 4, align: 'start' }))}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(12),
              cm.h(12),
              cm.roundedFull,
              'bg-[var(--color-success-light)] text-[color:var(--color-on-success)]',
            )}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 24 }} aria-hidden="true">
              mark_email_read
            </span>
          </div>
          <p className={cm.cn(cm.fontWeight('semibold'), cm.textSize('base'), 'text-on-surface')}>
            {t('common.checkYourInbox', {}, { defaultValue: 'Check your inbox' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
            {t(
              'forgotPassword.successBody',
              { email },
              {
                defaultValue:
                  'If an account matches {{email}}, a reset link is on its way. Check your inbox and spam folders.',
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
                'rounded-md bg-error-light text-[color:var(--color-on-error)]',
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
                aria-hidden="true"
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
              ? t('common.sendingLinkEllipsis', {}, { defaultValue: 'Sending link…' })
              : t('auth.forgotPassword.sendResetLink', {}, { defaultValue: 'Send reset link' })}
          </button>
        </form>
      )}
    </AuthShell>
  )
}

export default ForgotPassword
