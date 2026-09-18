import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

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

  const isSubmitting = confirmStatus === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) return
    try {
      await confirmReset({ token, password })
      await login({ email, password })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // Error tracked in hook state via confirmReset's own status
    }
  }

  return (
    <AuthShell
      eyebrow={t('resetPassword.eyebrow', {}, { defaultValue: 'New password' })}
      title={t('resetPassword.title', {}, { defaultValue: 'Set a fresh password' })}
      subtitle={t(
        'resetPassword.subtitle',
        {},
        { defaultValue: 'Pick a strong password — at least 10 characters with a number.' },
      )}
      footnote={
        <p
          style={{
            fontSize: '13px',
            color: 'var(--mol-color-text-secondary)',
            textAlign: 'center',
          }}
        >
          <Link
            to="/login"
            style={{ color: 'var(--color-sidebar-hover)', fontWeight: 600, textDecoration: 'none' }}
          >
            {t('auth.backToSignInArrow', {}, { defaultValue: '← Back to sign in' })}
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
        <Field label={t('resetPassword.email', {}, { defaultValue: 'Account email' })}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            placeholder="you@yourstudio.com"
            aria-label={t('resetPassword.email', {}, { defaultValue: 'Account email' })}
            style={inputStyle}
          />
        </Field>
        <Field label={t('auth.resetPassword.resetToken', {}, { defaultValue: 'Reset token' })}>
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
            placeholder={t(
              'resetPassword.tokenPlaceholder',
              {},
              { defaultValue: 'Paste from email' },
            )}
            aria-label={t('auth.resetPassword.resetToken', {}, { defaultValue: 'Reset token' })}
            style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace" }}
          />
        </Field>
        <Field label={t('resetPassword.password', {}, { defaultValue: 'New password' })}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            placeholder="••••••••"
            aria-label={t('resetPassword.password', {}, { defaultValue: 'New password' })}
            style={inputStyle}
          />
        </Field>
        <Field
          label={t('auth.signup.confirmNewPassword', {}, { defaultValue: 'Confirm new password' })}
        >
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
            placeholder="••••••••"
            aria-label={t(
              'auth.signup.confirmNewPassword',
              {},
              { defaultValue: 'Confirm new password' },
            )}
            style={inputStyle}
          />
        </Field>
        {confirmError ? (
          <div
            style={{
              padding: '10px 12px',
              backgroundColor: 'var(--color-overdue-light)',
              color: 'var(--color-overdue)',
              fontSize: '13px',
              borderRadius: '10px',
              border: '1px solid var(--color-overdue-light)',
            }}
          >
            {confirmError.message}
          </div>
        ) : null}
        {password && confirmPassword && password !== confirmPassword ? (
          <div
            style={{
              padding: '10px 12px',
              backgroundColor: 'var(--color-sent-light)',
              color: 'var(--color-sent)',
              fontSize: '13px',
              borderRadius: '10px',
              border: '1px solid var(--color-sent-light)',
            }}
          >
            {t('resetPassword.mismatch', {}, { defaultValue: "Passwords don't match yet." })}
          </div>
        ) : null}
        <button
          type="submit"
          disabled={isSubmitting}
          className={cm.cn(cm.fontWeight('bold'))}
          style={{
            padding: '12px 18px',
            borderRadius: '12px',
            backgroundColor: 'var(--color-accent)',
            color: 'var(--color-sidebar-text-active)',
            fontSize: '14px',
            border: 'none',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            opacity: isSubmitting ? 0.7 : 1,
            boxShadow: '0 8px 22px var(--color-accent-shadow)',
          }}
        >
          {isSubmitting
            ? t('common.updatingEllipsis', {}, { defaultValue: 'Updating…' })
            : t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
        </button>
      </form>
    </AuthShell>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: '12px',
  border: '1px solid var(--mol-color-border)',
  backgroundColor: 'var(--mol-color-surface-secondary)',
  fontSize: '14px',
  color: 'var(--mol-color-text)',
  outline: 'none',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <span
        style={{
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--mol-color-text-secondary)',
          fontWeight: 700,
        }}
      >
        {label}
      </span>
      {children}
    </label>
  )
}

export default ResetPassword
