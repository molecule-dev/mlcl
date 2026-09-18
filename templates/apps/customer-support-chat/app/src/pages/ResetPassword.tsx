import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthShell } from '../components/AuthShell.js'

function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { confirmReset, confirmStatus } = usePasswordReset()
  const loading = confirmStatus === 'pending'
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError(
        t('auth.signup.passwordsDoNotMatchPeriod', {}, { defaultValue: 'Passwords do not match.' }),
      )
      return
    }
    if (!token) {
      setError(
        t(
          'resetPassword.missingToken',
          {},
          { defaultValue: 'Reset link is missing or expired. Request a new one.' },
        ),
      )
      return
    }
    try {
      await confirmReset({ token, password })
      navigate('/login')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(
              'auth.resetPassword.couldNotReset',
              {},
              { defaultValue: 'Could not reset password.' },
            ),
      )
    }
  }

  const fieldShell = cm.cn(
    cm.flex({ align: 'center', gap: 2 }),
    cm.sp('px', 4),
    'h-12 rounded-md border border-[color:var(--color-border)] bg-surface-secondary focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition-shadow',
  )

  return (
    <AuthShell
      heading={t('auth.resetPassword.setNewPassword', {}, { defaultValue: 'Set a new password' })}
      subheading={t(
        'resetPassword.subheading',
        { appName: APP_NAME },
        { defaultValue: 'Choose a strong password to secure your {{appName}} workspace.' },
      )}
      footer={
        <Link
          to="/login"
          className={cm.cn(cm.fontWeight('semibold'), 'text-primary-dark hover:underline')}
        >
          {t('resetPassword.backToSignIn', {}, { defaultValue: 'Back to Sign in' })}
        </Link>
      }
    >
      <form className={cm.cn(cm.flex({ direction: 'col', gap: 4 }))} onSubmit={handleSubmit}>
        {error && (
          <div
            role="alert"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'rounded-md bg-[var(--color-status-error-bg)] text-[var(--color-status-error-text)]',
            )}
          >
            {error}
          </div>
        )}
        <label className={cm.cn(cm.flex({ direction: 'col', gap: 1 }))}>
          <span
            className={cm.cn(
              cm.fontWeight('semibold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('resetPassword.passwordLabel', {}, { defaultValue: 'New password' })}
          </span>
          <div className={fieldShell}>
            <span
              className="material-symbols-outlined text-on-surface-variant"
              style={{ fontSize: 18 }}
            >
              lock
            </span>
            <input
              type="password"
              required
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={cm.cn(
                cm.flex1,
                cm.sp('p', 0),
                cm.fontWeight('medium'),
                cm.textSize('sm'),
                'bg-transparent border-none focus:outline-none focus:ring-0 text-on-surface',
              )}
              placeholder={t(
                'common.atLeast8Characters',
                {},
                { defaultValue: 'At least 8 characters' },
              )}
            />
          </div>
        </label>
        <label className={cm.cn(cm.flex({ direction: 'col', gap: 1 }))}>
          <span
            className={cm.cn(
              cm.fontWeight('semibold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
          </span>
          <div className={fieldShell}>
            <span
              className="material-symbols-outlined text-on-surface-variant"
              style={{ fontSize: 18 }}
            >
              lock_reset
            </span>
            <input
              type="password"
              required
              autoComplete="new-password"
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={cm.cn(
                cm.flex1,
                cm.sp('p', 0),
                cm.fontWeight('medium'),
                cm.textSize('sm'),
                'bg-transparent border-none focus:outline-none focus:ring-0 text-on-surface',
              )}
              placeholder={t(
                'resetPassword.confirmPlaceholder',
                {},
                { defaultValue: 'Repeat the password' },
              )}
            />
          </div>
        </label>
        <button
          type="submit"
          disabled={loading}
          className={cm.cn(
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'rounded-md bg-gradient-to-r from-primary to-secondary text-white shadow-md hover:shadow-lg hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-60',
          )}
        >
          {loading
            ? t('common.updatingEllipsis', {}, { defaultValue: 'Updating…' })
            : t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
        </button>
      </form>
    </AuthShell>
  )
}

export default ResetPassword
export { ResetPassword, ResetPassword as ResetPasswordPage }
