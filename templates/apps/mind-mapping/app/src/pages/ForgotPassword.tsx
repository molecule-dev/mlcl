import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { DendriteAuthCard } from '../components/DendriteAuthCard.js'

export function ForgotPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { requestStatus, requestError, requestReset } = usePasswordReset()
  // Cross-view auth form persistence — the email typed here carries to
  // Reset Password (and back to Login/Signup). NOT cleared on submit so it
  // survives the navigation to the reset view.
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
      // tracked in hook state via requestError
    }
  }

  return (
    <DendriteAuthCard
      heading={t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
      subheading={t(
        'forgotPassword.subheading',
        {},
        { defaultValue: 'Enter your email and we’ll send a fresh reset link.' },
      )}
      brandStatement={t(
        'forgotPassword.brandStatement',
        {},
        { defaultValue: 'Your maps are safe. We’ll get you back to your branches in a moment.' },
      )}
      footer={
        <span>
          <Link to="/login" className={cm.cn('font-bold text-primary hover:underline')}>
            {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
          </Link>
        </span>
      }
    >
      {submitted ? (
        <div className={cm.cn(cm.stack(4))}>
          <div
            className={cm.cn(
              cm.sp('p', 4),
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.textSize('sm'),
              'rounded-xl bg-primary-fixed text-on-primary-container',
            )}
          >
            <span
              className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              mark_email_read
            </span>
            <span>
              {t(
                'forgotPassword.success',
                {},
                {
                  defaultValue: 'If an account with that email exists, a reset link is on its way.',
                },
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className={cm.cn(
              cm.w('full'),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              'rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-md hover:scale-[1.02] active:scale-[0.98] transition-transform',
            )}
          >
            {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
          </button>
        </div>
      ) : (
        <form className={cm.cn(cm.stack(5))} onSubmit={handleSubmit}>
          {requestError && (
            <div
              role="alert"
              className={cm.cn(
                cm.sp('p', 3),
                cm.textSize('sm'),
                'rounded-xl bg-error-container/40 text-on-error-container border border-error/30',
              )}
            >
              {requestError.message}
            </div>
          )}
          <div className={cm.stack(2)}>
            <label
              htmlFor="forgot-email"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'tracking-wide text-on-surface',
              )}
            >
              {t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
            </label>
            <input
              id="forgot-email"
              type="email"
              autoComplete="email"
              required
              disabled={isSubmitting}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t(
                'auth.passwordPlaceholderNameCompany',
                {},
                { defaultValue: 'name@company.com' },
              )}
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                'rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-primary/30 transition-all',
              )}
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className={cm.cn(
              cm.w('full'),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
              'rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-md hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-transform',
            )}
          >
            {isSubmitting
              ? t('common.sendingLinkEllipsis', {}, { defaultValue: 'Sending link…' })
              : t('auth.forgotPassword.sendResetLink', {}, { defaultValue: 'Send reset link' })}
            <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>send</span>
          </button>
        </form>
      )}
    </DendriteAuthCard>
  )
}

export default ForgotPassword
