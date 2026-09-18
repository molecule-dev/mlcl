import { useState } from 'react'
import { useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { ArgentAuthShell } from '../components/ArgentAuthShell.js'
import { FloatingInput } from '../components/FloatingInput.js'

export function ForgotPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
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
      // Error tracked in hook state via requestError
    }
  }

  return (
    <ArgentAuthShell
      eyebrow={t('auth.resetPassword.accountRecovery', {}, { defaultValue: 'Account recovery' })}
      heading={t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
      subheading={
        submitted
          ? t(
              'forgotPassword.successSubheading',
              { email },
              { defaultValue: 'Check {{email}} for a reset link. It expires in 60 minutes.' },
            )
          : t(
              'forgotPassword.subheading',
              { appName: APP_NAME },
              {
                defaultValue:
                  "Enter the email on your {{appName}} account and we'll send you a secure reset link.",
              },
            )
      }
      footerLink={{
        to: '/login',
        promptKey: 'forgotPassword.backPrompt',
        promptDefault: 'Remembered it?',
        ctaKey: 'forgotPassword.backCta',
        ctaDefault: 'Back to sign in',
      }}
    >
      {submitted ? (
        <div
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-2xl bg-success/10 border border-success/20 text-on-surface flex items-start gap-3',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-success')} aria-hidden="true">
            mark_email_read
          </span>
          <div>
            <p className={cm.cn(cm.fontWeight('semibold'), cm.sp('mb', 1))}>
              {t('forgotPassword.successTitle', {}, { defaultValue: 'Reset email on its way' })}
            </p>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
              {t(
                'forgotPassword.successBody',
                {},
                {
                  defaultValue:
                    "If you don't see it in a few minutes, check your spam folder or try a different email.",
                },
              )}
            </p>
            <button
              type="button"
              onClick={() => navigate('/reset-password')}
              className={cm.cn(
                cm.sp('mt', 4),
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-full border border-outline hover:bg-surface-container transition-colors',
              )}
            >
              {t('forgotPassword.gotLinkCta', {}, { defaultValue: 'I have a reset link →' })}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
          <FloatingInput
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            placeholder={t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 4),
              cm.fontWeight('bold'),
              'bg-primary text-on-primary rounded-full hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2',
            )}
          >
            <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
              {isSubmitting ? 'progress_activity' : 'send'}
            </span>
            {isSubmitting
              ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
              : t('auth.forgotPassword.sendResetLink', {}, { defaultValue: 'Send reset link' })}
          </button>
          {requestError ? (
            <p
              role="alert"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                'rounded-xl bg-error/10 text-error border border-error/20',
              )}
            >
              {requestError.message}
            </p>
          ) : null}
        </form>
      )}
    </ArgentAuthShell>
  )
}
