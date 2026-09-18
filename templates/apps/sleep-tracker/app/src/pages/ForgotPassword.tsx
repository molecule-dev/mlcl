import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthInput } from '../components/AuthInput.js'
import { AuthShell } from '../components/AuthShell.js'

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
      // Error tracked in hook state — usePasswordReset surfaces it via requestError
    }
  }

  return (
    <AuthShell
      eyebrow={t('forgotPassword.eyebrow', {}, { defaultValue: 'No worries' })}
      heading={t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
      subheading={t(
        'forgotPassword.subheading',
        {},
        { defaultValue: 'Enter your email and we’ll send a reset link.' },
      )}
      footer={
        <Link
          to="/login"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            cm.textPrimary,
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')}>arrow_back</span>
          {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
        </Link>
      }
    >
      {submitted ? (
        <div className={cm.cn(cm.textCenter, 'space-y-4')}>
          <div
            className={cm.cn(
              'w-16 h-16 mx-auto rounded-full flex items-center justify-center bg-primary text-on-primary shadow-md',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-3xl')}>mark_email_read</span>
          </div>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            {t('common.checkYourInbox', {}, { defaultValue: 'Check your inbox' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'forgotPassword.successBody',
              { email },
              { defaultValue: 'If an account exists for {{email}}, a reset link is on its way.' },
            )}
          </p>
          <button
            type="button"
            onClick={() => navigate('/reset-password')}
            className={cm.cn(
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.textSize('base'),
              'w-full bg-primary text-on-primary rounded-xl shadow-md hover:shadow-lg transition-all',
            )}
          >
            {t('forgotPassword.continueButton', {}, { defaultValue: 'Enter reset code' })}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={cm.cn('space-y-4')}>
          <AuthInput
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            icon="mail"
            placeholder={t(
              'auth.passwordPlaceholderEmail',
              {},
              { defaultValue: 'you@example.com' },
            )}
            label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          />

          {requestError ? (
            <div
              className={cm.cn(
                cm.sp('p', 3),
                cm.textSize('sm'),
                'rounded-xl bg-error-container text-on-error-container',
              )}
            >
              {requestError.message}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className={cm.cn(
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.textSize('base'),
              'w-full bg-primary text-on-primary rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed',
            )}
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
