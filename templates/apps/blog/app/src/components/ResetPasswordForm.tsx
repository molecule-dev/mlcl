import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export default function ResetPasswordForm() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!token) {
    return (
      <div className={cm.cn(cm.stack(4), cm.textCenter)} role="alert" aria-live="polite">
        <p className={cm.cn(cm.textSize('base'), 'font-sans-ui text-on-surface')}>
          {t(
            'resetPassword.invalidLink',
            {},
            { defaultValue: 'This password reset link is invalid or has expired.' },
          )}
        </p>
        <div
          className={cm.cn(
            cm.flex({ justify: 'center', gap: 'lg' }),
            cm.textSize('sm'),
            'font-sans-ui',
          )}
        >
          <Link className={cm.fv172820a0} to="/login">
            {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
          </Link>
          <Link className={cm.fv015ce32d} to="/forgot-password">
            {t('common.requestANewLink', {}, { defaultValue: 'Request a new link' })}
          </Link>
        </div>
      </div>
    )
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      setError(
        t('resetPassword.tooShort', {}, { defaultValue: 'Password must be at least 8 characters' }),
      )
      return
    }
    if (password !== confirm) {
      setError(
        t(
          'auth.signup.passwordsDoNotMatchNoPeriod',
          {},
          { defaultValue: 'Passwords do not match' },
        ),
      )
      return
    }
    setLoading(true)
    setError(null)
    try {
      await http.post('/api/users/reset-password', { token, password })
      navigate('/login')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('resetPassword.error', {}, { defaultValue: 'Reset failed' }),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className={cm.cn(cm.stack(6))} onSubmit={onSubmit}>
      <div className={cm.fv4f3df6dd}>
        <label
          className={cm.cn(
            cm.sp('ml', 1),
            'font-sans-ui text-[0.7rem] uppercase tracking-widest text-on-surface-variant',
          )}
          htmlFor="new-password"
        >
          {t('resetPassword.newPassword', {}, { defaultValue: 'New password' })}
        </label>
        <input
          id="new-password"
          className={cm.cn(
            cm.w('full'),
            cm.sp('py', 3),
            cm.textSize('base'),
            'bg-transparent border-0 border-b border-outline-variant/30 focus:ring-0 focus:border-primary transition-all font-sans-ui placeholder:text-outline/50',
          )}
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            setError(null)
          }}
          required
          minLength={8}
          autoComplete="new-password"
          aria-describedby={error ? 'new-password-hint reset-error' : 'new-password-hint'}
          aria-invalid={error ? true : undefined}
        />
        <p
          id="new-password-hint"
          className={cm.cn(cm.sp('ml', 1), 'font-sans-ui text-[0.7rem] text-on-surface-variant')}
        >
          {t('common.atLeast8Characters', {}, { defaultValue: 'At least 8 characters' })}
        </p>
      </div>
      <div className={cm.fv4f3df6dd}>
        <label
          className={cm.cn(
            cm.sp('ml', 1),
            'font-sans-ui text-[0.7rem] uppercase tracking-widest text-on-surface-variant',
          )}
          htmlFor="confirm-password"
        >
          {t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
        </label>
        <input
          id="confirm-password"
          className={cm.cn(
            cm.w('full'),
            cm.sp('py', 3),
            cm.textSize('base'),
            'bg-transparent border-0 border-b border-outline-variant/30 focus:ring-0 focus:border-primary transition-all font-sans-ui placeholder:text-outline/50',
          )}
          type="password"
          value={confirm}
          onChange={(e) => {
            setConfirm(e.target.value)
            setError(null)
          }}
          required
          minLength={8}
          autoComplete="new-password"
          aria-describedby={error ? 'reset-error' : undefined}
          aria-invalid={error ? true : undefined}
        />
      </div>
      {error && (
        <p
          id="reset-error"
          className={cm.cn(cm.textSize('xs'), 'font-sans-ui text-error')}
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
      <div className={cm.cn(cm.sp('pt', 4))}>
        <button
          className={cm.cn(
            cm.w('full'),
            cm.h(48),
            cm.roundedFull,
            cm.fontWeight('semibold'),
            cm.textSize('sm'),
            'bg-gradient-to-br from-primary to-primary-container text-on-primary font-sans-ui tracking-wide shadow-lg shadow-primary/10 transition-transform active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed',
          )}
          disabled={loading}
          type="submit"
        >
          {loading
            ? t('common.resettingEllipsis', {}, { defaultValue: 'Resetting…' })
            : t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
        </button>
      </div>
      <div
        className={cm.cn(
          cm.flex({ justify: 'between', align: 'center' }),
          cm.sp('pt', 2),
          cm.textSize('xs'),
          'font-sans-ui',
        )}
      >
        <Link className={cm.fv172820a0} to="/login">
          {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
        </Link>
        <Link className={cm.fv172820a0} to="/forgot-password">
          {t('common.requestANewLink', {}, { defaultValue: 'Request a new link' })}
        </Link>
      </div>
    </form>
  )
}
