import { useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthShell } from '../components/AuthShell.js'
import { AuthField } from './Login.js'

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

  const isSubmitting = requestStatus === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await requestReset({ email })
      setSubmitted(true)
    } catch (_error) {
      // error is surfaced via the auth hook's own state — no local handling needed
    }
  }

  return (
    <AuthShell
      heading={t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
      subtitle={t('forgotPassword.subtitle', {}, { defaultValue: "We'll email you a reset link." })}
      showSamplePreview={false}
      footer={
        <p className={cm.textCenter}>
          <Link
            to="/login"
            className={cm.cn(
              'font-bold text-primary hover:underline inline-flex items-center gap-1',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              arrow_back
            </span>
            {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
          </Link>
        </p>
      }
    >
      {submitted ? (
        <div
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-2xl border border-success/30 bg-success-container/40 text-on-success-container text-center',
          )}
          role="status"
        >
          <span className="material-symbols-outlined text-3xl text-success" aria-hidden="true">
            mark_email_read
          </span>
          <p className={cm.cn(cm.fontWeight('bold'), cm.sp('mt', 2), 'text-base font-extrabold')}>
            {t('common.checkYourInbox', {}, { defaultValue: 'Check your inbox' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1))}>
            {t(
              'forgotPassword.successBody',
              { email },
              { defaultValue: 'If {{email}} is a registered account, a reset link is on its way.' },
            )}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
          <AuthField
            id="forgot-email"
            type="email"
            label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
            icon="mail"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            required
          />

          {requestError && (
            <p
              className={cm.cn(
                cm.sp('p', 3),
                cm.textSize('sm'),
                'rounded-xl bg-error-container/50 text-on-error-container border border-error/30',
              )}
              role="alert"
            >
              {requestError.message}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 4),
              cm.fontWeight('bold'),
              'rounded-2xl bg-primary text-on-primary text-sm shadow-md hover:scale-[1.01] transition-transform disabled:opacity-50 disabled:hover:scale-100',
            )}
            data-mol-id="forgot-submit"
          >
            {isSubmitting
              ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
              : t('auth.forgotPassword.sendResetLink', {}, { defaultValue: 'Send reset link' })}
          </button>
        </form>
      )}
    </AuthShell>
  )
}
