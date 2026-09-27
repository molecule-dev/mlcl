import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useAuthClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthShell } from '../components/AuthShell.js'

function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const client = useAuthClient()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!token) {
      setError(
        t('resetPassword.missingToken', {}, { defaultValue: 'Reset link is invalid or expired.' }),
      )
      return
    }
    if (password !== confirm) {
      setError(
        t('auth.signup.passwordsDoNotMatchPeriod', {}, { defaultValue: 'Passwords do not match.' }),
      )
      return
    }
    setLoading(true)
    try {
      await client.confirmPasswordReset({ token, password })
      navigate('/login')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('resetPassword.failed', {}, { defaultValue: 'Could not update password.' }),
      )
    } finally {
      setLoading(false)
    }
  }

  const inputClass = cm.cn(
    cm.w('full'),
    cm.sp('px', 4),
    cm.sp('py', 3),
    'rounded-xl bg-surface-secondary border border-border text-foreground placeholder-foreground-tertiary focus:border-primary focus:ring-2 focus:ring-primary/40 outline-none transition-all',
  )
  const labelText = cm.cn(
    cm.textSize('xs'),
    cm.fontWeight('semibold'),
    cm.textMuted,
    'uppercase tracking-widest',
  )

  return (
    <AuthShell
      heading={t('auth.resetPassword.setNewPassword', {}, { defaultValue: 'Set a new password' })}
      subheading={t(
        'resetPassword.subheading',
        {},
        { defaultValue: 'Choose a fresh password to keep talking.' },
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
        <label className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(2))}>
          <span className={labelText}>
            {t('resetPassword.newPassword', {}, { defaultValue: 'New password' })}
          </span>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t(
              'common.atLeast8Characters',
              {},
              { defaultValue: 'At least 8 characters' },
            )}
            className={inputClass}
          />
        </label>
        <label className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(2))}>
          <span className={labelText}>
            {t('auth.signup.confirmNewPassword', {}, { defaultValue: 'Confirm new password' })}
          </span>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={t(
              'resetPassword.confirmPlaceholder',
              {},
              { defaultValue: 'Repeat your new password' },
            )}
            className={inputClass}
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
            ? t('common.updatingEllipsis', {}, { defaultValue: 'Updating…' })
            : t('auth.resetPassword.updatePassword', {}, { defaultValue: 'Update password' })}
        </button>
      </form>
    </AuthShell>
  )
}

export default ResetPassword
export { ResetPassword, ResetPassword as ResetPasswordPage }
