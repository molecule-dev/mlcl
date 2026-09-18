import { useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthInputField } from '../components/AuthInputField.js'
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
      // Error is tracked in hook state via requestReset; no additional handling needed
    }
  }

  if (submitted) {
    return (
      <AuthShell
        subtitle={t(
          'forgotPassword.confirmTagline',
          {},
          { defaultValue: 'Check your inbox for the reset link.' },
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
            cm.sp('p', 6),
            cm.textCenter,
            'rounded-2xl bg-success/10 border border-success/20',
          )}
        >
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(12),
              cm.h(12),
              cm.roundedFull,
              'bg-success/20 text-success',
            )}
            aria-hidden="true"
          >
            <span className={cm.cn('material-symbols-outlined text-2xl')}>check_circle</span>
          </span>
          <p className={cm.cn(cm.textSize('base'), 'font-bold text-on-surface')}>
            {t(
              'forgotPassword.successHeading',
              { email },
              { defaultValue: 'Reset link on the way' },
            )}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
            {t(
              'forgotPassword.successBody',
              { email },
              {
                defaultValue:
                  "We sent reset instructions to {{email}}. If you don't see it in a few minutes, check spam or try a different address.",
              },
            )}
          </p>
        </div>
        <Link
          to="/login"
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            cm.textCenter,
            'text-primary hover:underline decoration-2 underline-offset-4',
          )}
        >
          {t('auth.backToSignInArrow', {}, { defaultValue: '← Back to sign in' })}
        </Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      subtitle={t(
        'forgotPassword.tagline',
        {},
        { defaultValue: 'Enter your email and we’ll send a reset link.' },
      )}
    >
      <form className={cm.cn(cm.flex({ direction: 'col' }), 'gap-6')} onSubmit={handleSubmit}>
        <AuthInputField
          id="email"
          type="email"
          autoComplete="email"
          required
          icon="mail"
          label={t('forgotPassword.emailLabel', {}, { defaultValue: 'Email Address' })}
          placeholder={t('auth.passwordPlaceholderEmail', {}, { defaultValue: 'you@example.com' })}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {requestError && (
          <div
            data-mol-id="forgot-error"
            role="alert"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.textCenter,
              'bg-error-container text-on-error-container rounded-xl',
            )}
          >
            {requestError.message}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className={cm.cn(
            cm.sp('py', 4),
            cm.roundedFull,
            cm.textSize('base'),
            cm.fontWeight('bold'),
            'text-white hover:shadow-lg active:scale-95 transition-all disabled:opacity-60',
          )}
          style={{
            background:
              'linear-gradient(135deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 70%, #a78bfa))',
            boxShadow: '0 8px 24px color-mix(in srgb, var(--color-primary) 28%, transparent)',
          }}
        >
          {isSubmitting
            ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
            : t('auth.forgotPassword.sendResetLink', {}, { defaultValue: 'Send reset link' })}
        </button>
      </form>

      <Link
        to="/login"
        className={cm.cn(
          cm.textSize('sm'),
          cm.fontWeight('bold'),
          cm.textCenter,
          'text-on-surface-variant hover:text-primary',
        )}
      >
        {t('auth.backToSignInArrow', {}, { defaultValue: '← Back to sign in' })}
      </Link>
    </AuthShell>
  )
}

export default ForgotPassword
export { ForgotPassword as ForgotPasswordPage }
