import { useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthShell, BrandHeader, Field } from './Login.js'

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

  const submitting = requestStatus === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await requestReset({ email })
      setSubmitted(true)
    } catch (_error) {
      // error is surfaced via requestError from the hook
    }
  }

  return (
    <AuthShell>
      <BrandHeader />
      <header className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), cm.textCenter)}>
        <h2
          className={cm.cn(
            cm.textSize('2xl'),
            cm.fontWeight('bold'),
            'tracking-tight text-on-surface',
          )}
        >
          {t('forgotPassword.heading', {}, { defaultValue: 'Reset your password.' })}
        </h2>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'forgotPassword.subtitle',
            {},
            {
              defaultValue: 'Enter the email on your account and we\u2019ll send you a reset link.',
            },
          )}
        </p>
      </header>

      {submitted ? (
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'sm', align: 'center' }),
            cm.sp('p', 6),
            cm.textCenter,
            'rounded-2xl bg-primary/10 text-on-surface',
          )}
        >
          <span
            className="material-symbols-outlined text-3xl text-primary"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            mark_email_read
          </span>
          <p className={cm.cn(cm.fontWeight('semibold'))}>
            {t(
              'forgotPassword.success',
              { email },
              { defaultValue: 'Check {{email}} for a reset link.' },
            )}
          </p>
          <Link
            to="/login"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-primary hover:underline',
            )}
          >
            {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
          <Field
            label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
            icon="alternate_email"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className={cm.cn(
                cm.sp('py', 3),
                cm.textSize('base'),
                'flex-1 bg-transparent outline-none text-on-surface',
              )}
            />
          </Field>

          {requestError && (
            <p
              role="alert"
              className={cm.cn(
                cm.sp('p', 3),
                cm.textSize('sm'),
                'rounded-lg bg-error/10 text-error',
              )}
            >
              {requestError.message}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className={cm.cn(
              cm.sp('py', 3),
              cm.roundedFull,
              cm.textSize('base'),
              cm.fontWeight('bold'),
              'bg-primary text-on-primary hover:bg-primary-hover disabled:opacity-60 transition-colors shadow-md',
            )}
          >
            {submitting
              ? t('forgotPassword.submitting', {}, { defaultValue: 'Sending\u2026' })
              : t('auth.forgotPassword.sendResetLink', {}, { defaultValue: 'Send reset link' })}
          </button>

          <footer className={cm.cn(cm.textCenter, cm.textSize('sm'))}>
            <Link
              to="/login"
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-primary hover:underline decoration-2 underline-offset-2',
              )}
            >
              {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
            </Link>
          </footer>
        </form>
      )}
    </AuthShell>
  )
}

export default ForgotPassword
