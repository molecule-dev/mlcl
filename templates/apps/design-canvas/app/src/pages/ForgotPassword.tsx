import { useState } from 'react'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
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

  const isSubmitting = requestStatus === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await requestReset({ email })
      setSubmitted(true)
    } catch (_error) {
      // error is tracked in hook state (requestError) and surfaced by the form
    }
  }

  return (
    <AuthShell
      eyebrow={t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })!}
      heading={t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })!}
      subheading={t(
        'forgot.subheading',
        { appName: APP_NAME },
        {
          defaultValue:
            'Enter the email tied to your {{appName}} workspace and we’ll send a reset link.',
        },
      )!}
      bottomLink={{
        to: '/login',
        prompt: t('auth.login.rememberedIt', {}, { defaultValue: 'Remembered it?' })!,
        cta: t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })!,
      }}
    >
      {submitted ? (
        <div className={cm.cn(cm.stack(4), cm.textCenter, cm.sp('py', 4))}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(14),
              cm.h(14),
              cm.roundedFull,
              'mx-auto bg-tertiary/25 text-tertiary',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[28px]')}>mark_email_read</span>
          </span>
          <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-on-surface')}>
            {t('common.checkYourInbox', {}, { defaultValue: 'Check your inbox' })}
          </h2>
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'text-on-surface-variant leading-relaxed',
            )}
          >
            {t(
              'forgot.success.body',
              { email },
              {
                defaultValue:
                  'If an account exists for {{email}}, a reset link is on its way. The link expires in 30 minutes.',
              },
            )}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} data-mol-id="forgot-form" className={cm.cn(cm.stack(5))}>
          <label className={cm.cn(cm.stack(2))}>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
            </span>
            <input
              id="forgot-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              placeholder={t('forgot.emailPlaceholder', {}, { defaultValue: 'mara@studio.com' })!}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.fontWeight('medium'),
                cm.textSize('sm'),
                'bg-surface-container-low border border-outline-variant/40 rounded-xl focus:bg-surface focus:ring-2 focus:ring-primary/30 transition-all outline-none',
              )}
            />
          </label>
          {requestError && (
            <div
              role="alert"
              className={cm.cn(
                cm.sp('p', 3),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'rounded-xl bg-error-container/40 text-on-error-container',
              )}
            >
              {requestError.message}
            </div>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
              'bg-gradient-to-br from-primary to-secondary text-white rounded-xl shadow-lg shadow-primary/30 hover:scale-[1.01] transition-transform disabled:opacity-60',
            )}
          >
            {isSubmitting
              ? t('common.sendingLinkEllipsis', {}, { defaultValue: 'Sending link…' })
              : t('auth.forgotPassword.sendResetLink', {}, { defaultValue: 'Send reset link' })}
            <span className={cm.cn('material-symbols-outlined text-[18px]')}>send</span>
          </button>
        </form>
      )}
    </AuthShell>
  )
}

export default ForgotPassword
