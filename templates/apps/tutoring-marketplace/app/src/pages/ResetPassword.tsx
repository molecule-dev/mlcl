import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthShell } from '../components/AuthShell.js'

export function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { confirmStatus, confirmError, confirmReset } = usePasswordReset()
  const { login } = useLogin()

  const [token, setToken] = useState(searchParams.get('token') || '')
  const urlEmail = searchParams.get('email') ?? undefined
  // Cross-view auth form persistence — the reset link's ?email= seeds it and
  // wins; the email also carries from the Forgot/Login views. Cleared on success.
  const {
    fields: authFormFields,
    setField: setAuthFormField,
    clear: clearAuthForm,
  } = useAuthFormState(urlEmail ? { initialFields: { email: urlEmail } } : undefined)
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [mismatch, setMismatch] = useState(false)

  const isSubmitting = confirmStatus === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setMismatch(true)
      return
    }
    setMismatch(false)
    try {
      await confirmReset({ token, password })
      await login({ email, password })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      /* tracked in hook */
    }
  }

  return (
    <AuthShell
      eyebrow={t('auth.resetPassword.setNewPassword', {}, { defaultValue: 'Set a new password' })}
      heading={t('resetPassword.heading', {}, { defaultValue: 'Pick a strong new password.' })}
      subheading={t(
        'resetPassword.subheading',
        {},
        {
          defaultValue: 'We’ll sign you in automatically after the reset succeeds.',
        },
      )}
      footerRight={
        <Link
          to="/login"
          className={cm.cn(
            cm.fontWeight('semibold'),
            'text-primary hover:underline decoration-2 underline-offset-4',
          )}
        >
          {t('auth.backToSignInArrow', {}, { defaultValue: '← Back to sign in' })}
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className={cm.stack(5)}>
        <Field label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className={cm.cn(
              cm.w('full'),
              cm.textSize('sm'),
              'px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/30',
            )}
            placeholder={`you@${APP_NAME.toLowerCase()}.app`}
          />
        </Field>
        <Field label={t('auth.resetPassword.resetCode', {}, { defaultValue: 'Reset code' })}>
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
            className={cm.cn(
              cm.w('full'),
              cm.textSize('sm'),
              'px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono tracking-wider',
            )}
            placeholder="ABC-123-XYZ"
          />
        </Field>
        <Field label={t('resetPassword.newPassword', {}, { defaultValue: 'New password' })}>
          <span className={cm.cn('relative block')}>
            <span
              aria-hidden="true"
              className={cm.cn(
                'material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant',
              )}
            >
              lock
            </span>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
              className={cm.cn(
                cm.w('full'),
                cm.textSize('sm'),
                'pl-11 pr-12 py-3 rounded-xl bg-surface-container-low border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/30',
              )}
              placeholder="At least 8 characters"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className={cm.cn(
                'absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors p-1',
              )}
              aria-label={
                showPassword
                  ? t('resetPassword.hidePassword', {}, { defaultValue: 'Hide password' })
                  : t('resetPassword.showPassword', {}, { defaultValue: 'Show password' })
              }
            >
              <span className={cm.cn('material-symbols-outlined')}>
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </span>
        </Field>
        <Field label={t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}>
          <input
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
            className={cm.cn(
              cm.w('full'),
              cm.textSize('sm'),
              'px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/30',
            )}
          />
        </Field>

        {(mismatch || confirmError) && (
          <p
            role="alert"
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('p', 3),
              'rounded-xl bg-error-container text-on-error-container',
            )}
          >
            {mismatch
              ? t(
                  'resetPassword.mismatch',
                  {},
                  { defaultValue: 'Passwords don’t match. Try again.' },
                )
              : confirmError?.message}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
            'rounded-xl py-3.5 text-on-primary shadow-lg transition-transform hover:scale-[1.02] disabled:opacity-60',
          )}
          style={{
            background:
              'linear-gradient(135deg, var(--mol-color-primary) 0%, var(--mol-color-primary-dark) 100%)',
          }}
        >
          {isSubmitting
            ? t('common.resettingEllipsis', {}, { defaultValue: 'Resetting…' })
            : t('resetPassword.submit', {}, { defaultValue: 'Reset & sign in' })}
        </button>
      </form>
    </AuthShell>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const cm = getClassMap()
  return (
    <label className={cm.stack(2)}>
      <span
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          'uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </span>
      {children}
    </label>
  )
}
