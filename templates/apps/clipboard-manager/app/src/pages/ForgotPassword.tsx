import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

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
      // Error tracked in hook state
    }
  }

  return (
    <AuthShell
      brandSubtitle={
        submitted
          ? t(
              'forgotPassword.brandSubtitleSent',
              {},
              { defaultValue: 'Check your inbox for a reset link.' },
            )
          : t('forgotPassword.brandSubtitle', {}, { defaultValue: 'Copy once, find forever.' })
      }
      heading={t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
      body={
        submitted
          ? undefined
          : t(
              'forgotPassword.body',
              {},
              { defaultValue: 'Enter your email — we will send you a one-time reset link.' },
            )
      }
      footerSlot={
        !submitted ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            <Link
              to="/login"
              className={cm.cn('font-semibold hover:underline')}
              style={{ color: 'var(--color-primary)' }}
            >
              {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
            </Link>
          </p>
        ) : undefined
      }
    >
      {submitted ? (
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', gap: 'lg' }),
            cm.textCenter,
            cm.sp('py', 4),
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'w-12 h-12 rounded-full text-white',
            )}
            style={{ background: 'var(--color-primary)' }}
          >
            <span
              className="material-symbols-outlined text-3xl"
              aria-hidden="true"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              check_circle
            </span>
          </div>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'forgotPassword.sentMessage',
              { email },
              { defaultValue: 'We sent a reset link to {{email}}.' },
            )}
          </p>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'hover:underline')}
            style={{ color: 'var(--color-primary)' }}
          >
            {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
          </button>
        </div>
      ) : (
        <form className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))} onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="email"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                cm.sp('mb', 1),
                'block text-on-surface',
              )}
            >
              {t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t(
                'auth.passwordPlaceholderEmail',
                {},
                { defaultValue: 'you@example.com' },
              )}
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'rounded-md border border-outline-variant bg-surface-container-lowest font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
              )}
            />
          </div>

          {requestError && (
            <div
              data-mol-id="forgot-error"
              role="alert"
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'rounded-md bg-error-container/30 text-error border border-error/30',
              )}
            >
              {requestError.message}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              cm.sp('mt', 2),
              'rounded-md text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60',
            )}
            style={{ background: 'var(--color-primary)' }}
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

export default ForgotPassword
export { ForgotPassword as ForgotPasswordPage }
