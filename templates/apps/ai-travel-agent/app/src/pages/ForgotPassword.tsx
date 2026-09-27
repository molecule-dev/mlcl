import { useRef, useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useAuthClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthShell } from '../components/AuthShell.js'

function ForgotPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const client = useAuthClient()
  // Cross-view auth form persistence — the email typed here carries to the
  // other auth views (Login/Signup/Reset) via the shared @molecule hook.
  const { fields: authFormFields, setField: setAuthFormField } = useAuthFormState()
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    // Prefer the live DOM value so the form still works when the input
    // was filled programmatically (e.g., automation that bypasses the
    // React-controlled value path).
    const submittedEmail = email.trim() || (inputRef.current?.value ?? '').trim()
    try {
      await client.requestPasswordReset({ email: submittedEmail })
      setSubmitted(true)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(
              'auth.forgotPassword.couldNotSendResetLink',
              {},
              { defaultValue: 'Could not send reset link.' },
            ),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      heading={t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
      subheading={t(
        'forgotPassword.subheading',
        {},
        { defaultValue: "Enter your email and we'll send you a reset link." },
      )}
      footer={
        <p className={cm.cn(cm.textCenter, cm.textSize('sm'), cm.textMuted)}>
          <Link
            to="/login"
            className={cm.cn(
              cm.fontWeight('semibold'),
              'text-secondary hover:text-secondary-light transition-colors',
            )}
          >
            {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
          </Link>
        </p>
      }
    >
      <form className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(4))} onSubmit={handleSubmit}>
        {submitted ? (
          <div
            role="status"
            data-mol-id="forgot-password-success"
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
              cm.sp('px', 4),
              cm.sp('py', 4),
              'rounded-xl bg-success/15 text-foreground border border-success/30 text-center',
            )}
          >
            <span
              className={cm.cn(
                cm.roundedFull,
                cm.flex({ align: 'center', justify: 'center' }),
                'h-10 w-10 bg-success/25 text-success',
              )}
            >
              <span className="material-symbols-outlined text-[20px]">mark_email_read</span>
            </span>
            <p className={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'))}>
              {t('forgotPassword.successTitle', {}, { defaultValue: 'Check your inbox.' })}
            </p>
            <p className={cm.cn(cm.textSize('xs'), cm.textMuted)}>
              {t(
                'forgotPassword.successBody',
                { email: email || (inputRef.current?.value ?? '') },
                { defaultValue: 'We just sent a reset link to {{email}}.' },
              )}
            </p>
          </div>
        ) : null}
        <label className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(2))}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              cm.textMuted,
              'uppercase tracking-widest',
            )}
          >
            {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          </span>
          <input
            ref={inputRef}
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
              cm.sp('px', 4),
              cm.sp('py', 3),
              'rounded-xl bg-surface-secondary border border-border text-foreground placeholder-foreground-tertiary focus:border-primary focus:ring-2 focus:ring-primary/40 outline-none transition-all',
            )}
          />
        </label>
        {error ? (
          <div
            role="alert"
            className={cm.cn(
              cm.roundedFull,
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.textCenter,
              'bg-error/15 text-error border border-error/30',
            )}
          >
            {error}
          </div>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className={cm.cn(
            cm.roundedFull,
            cm.fontWeight('bold'),
            cm.sp('py', 3),
            cm.textSize('base'),
            'bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/30 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60',
          )}
        >
          {loading
            ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
            : t('auth.forgotPassword.sendResetLink', {}, { defaultValue: 'Send reset link' })}
        </button>
      </form>
    </AuthShell>
  )
}

export default ForgotPassword
export { ForgotPassword, ForgotPassword as ForgotPasswordPage }
