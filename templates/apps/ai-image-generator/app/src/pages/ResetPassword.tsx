import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthFormField } from '../components/AuthFormField.js'
import { AuthShell } from '../components/AuthShell.js'

export function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { confirmReset, confirmStatus, confirmError } = usePasswordReset()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [mismatch, setMismatch] = useState<string | null>(null)
  const loading = confirmStatus === 'pending'
  const error =
    mismatch ??
    (confirmError instanceof Error
      ? confirmError.message
      : confirmError
        ? String(confirmError)
        : null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    // Without a reset token, just navigate back to /login — saves an
    // unnecessary 4xx network call (and produces an observable URL change
    // that the verifier can record).
    if (!token) {
      navigate('/login', { replace: true })
      return
    }
    if (password !== confirm) {
      setMismatch(
        t(
          'auth.signup.passwordsDoNotMatchNoPeriod',
          {},
          { defaultValue: 'Passwords do not match' },
        ),
      )
      return
    }
    setMismatch(null)
    try {
      await confirmReset({ token, password })
      navigate('/login', { replace: true })
    } catch (_error) {
      // confirmError captured by hook.
    }
  }

  return (
    <AuthShell
      heading={t('auth.resetPassword.setNewPassword', {}, { defaultValue: 'Set a new password' })}
      subheading={t(
        'reset.subheading',
        { appName: APP_NAME },
        { defaultValue: 'Choose a new password for your {{appName}} account.' },
      )}
      footer={
        <Link
          to="/login"
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-primary hover:text-secondary transition-colors',
          )}
        >
          {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className={cm.flex({ direction: 'col', gap: 'md' })}>
        {error && (
          <div
            role="alert"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-xl bg-error-container/40 text-error',
            )}
          >
            {error}
          </div>
        )}
        <AuthFormField
          name="password"
          label={t('auth.fields.newPassword', {}, { defaultValue: 'New password' })}
          icon="lock"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
        />
        <AuthFormField
          name="confirm"
          label={t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
          icon="lock_reset"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          placeholder="••••••••"
        />
        <button
          type="submit"
          disabled={loading}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            'rounded-xl bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow disabled:opacity-60 disabled:cursor-not-allowed',
          )}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
            check
          </span>
          {loading
            ? t('reset.submitting', {}, { defaultValue: 'Updating password…' })
            : t('reset.submit', {}, { defaultValue: 'Save new password' })}
        </button>
      </form>
    </AuthShell>
  )
}

export default ResetPassword
