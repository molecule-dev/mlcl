import { useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AulaAuthShell } from '../components/AulaAuthShell.js'

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
      // error is tracked in requestError from the hook — no local handling needed
    }
  }

  return (
    <AulaAuthShell
      eyebrow={t('forgotPassword.eyebrow', {}, { defaultValue: 'Recover access' })}
      title={t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
      subtitle={t(
        'forgotPassword.subtitle',
        {},
        {
          defaultValue: 'Enter the email tied to your school account and we’ll send a reset link.',
        },
      )}
      footer={
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant text-center')}>
          <Link
            to="/login"
            className={cm.cn(cm.fontWeight('bold'), 'text-primary hover:underline')}
          >
            {t('auth.backToSignInArrow', {}, { defaultValue: '← Back to sign in' })}
          </Link>
        </p>
      }
    >
      {submitted ? (
        <div className={cm.stack(4)}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 3 }),
              cm.sp('p', 4),
              'rounded-xl bg-success/15 text-success',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[24px]')}>mark_email_read</span>
            <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
              {t(
                'forgotPassword.success',
                {},
                {
                  defaultValue: 'If an account exists for that email, a reset link is on its way.',
                },
              )}
            </p>
          </div>
          <Link
            to="/login"
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center', gap: 2 }),
              cm.fontWeight('bold'),
              cm.sp('py', 3),
              'w-full rounded-xl bg-primary text-on-primary hover:bg-primary-dark transition-colors',
            )}
          >
            {t('forgotPassword.toLogin', {}, { defaultValue: 'Return to sign in' })}
            <span className={cm.cn('material-symbols-outlined text-[18px]')}>arrow_forward</span>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={cm.stack(5)}>
          {requestError && (
            <div
              role="alert"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                'rounded-xl bg-error-container text-on-error-container',
              )}
            >
              {requestError.message}
            </div>
          )}
          <label className={cm.stack(2)}>
            <span
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              placeholder={t(
                'forgotPassword.emailPlaceholder',
                {},
                { defaultValue: 'you@school.edu' },
              )}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                'rounded-xl bg-surface-container-low border-0 text-on-surface placeholder:text-on-surface-variant/70 focus:ring-2 focus:ring-primary/30 outline-none transition-all',
              )}
            />
          </label>
          <button
            type="submit"
            disabled={isSubmitting}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center', gap: 2 }),
              cm.fontWeight('bold'),
              cm.sp('py', 3),
              cm.sp('px', 5),
              'w-full rounded-xl bg-gradient-to-r from-primary to-primary-dark text-on-primary shadow-lg shadow-primary/30 hover:scale-[1.01] active:scale-[0.99] transition-transform disabled:opacity-60',
            )}
          >
            {isSubmitting
              ? t('common.sendingLinkEllipsis', {}, { defaultValue: 'Sending link…' })
              : t('auth.forgotPassword.sendResetLink', {}, { defaultValue: 'Send reset link' })}
            {!isSubmitting && (
              <span className={cm.cn('material-symbols-outlined text-[18px]')}>arrow_forward</span>
            )}
          </button>
        </form>
      )}
    </AulaAuthShell>
  )
}

export default ForgotPassword
