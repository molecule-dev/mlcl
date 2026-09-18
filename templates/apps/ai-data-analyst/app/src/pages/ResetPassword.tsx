import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ClarionAuthShell } from '../components/ClarionAuthShell.js'

function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
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
    if (password.length < 8) {
      setError(
        t(
          'resetPassword.passwordTooShort',
          { min: 8 },
          { defaultValue: 'Password must be at least {{min}} characters' },
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
          : t('resetPassword.resetFailed', {}, { defaultValue: 'Reset failed' }),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <ClarionAuthShell
      heading={t('auth.resetPassword.setNewPassword', {}, { defaultValue: 'Set a new password' })}
      subheading={t(
        'resetPassword.subheading',
        {},
        {
          defaultValue:
            'Pick a strong one — at least 8 characters with a mix of letters and numbers.',
        },
      )}
      footer={
        <Link
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-primary hover:text-primary-container transition-colors',
          )}
          to="/login"
        >
          {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
        </Link>
      }
    >
      <form className={cm.stack(5)} onSubmit={handleSubmit}>
        <div>
          <label className={'sr-only'} htmlFor="password">
            {t('resetPassword.newPasswordLabel', {}, { defaultValue: 'New password' })}
          </label>
          <div className={'relative'}>
            <span
              className={cm.cn(
                'absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none material-symbols-outlined text-on-surface-variant/60',
                cm.textSize('sm'),
              )}
              aria-hidden="true"
            >
              lock
            </span>
            <input
              autoComplete="new-password"
              className={cm.cn(
                cm.w('full'),
                cm.sp('pl', 10),
                cm.sp('pr', 3),
                cm.sp('py', 3),
                cm.textSize('sm'),
                'block bg-surface-container-high border-0 rounded-xl text-on-surface placeholder:text-on-surface-variant/60 focus:ring-2 focus:ring-primary focus:outline-none transition-all',
              )}
              id="password"
              name="password"
              placeholder={t(
                'resetPassword.newPasswordPlaceholder',
                {},
                { defaultValue: 'New password' },
              )}
              required
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className={'sr-only'} htmlFor="confirm">
            {t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
          </label>
          <div className={'relative'}>
            <span
              className={cm.cn(
                'absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none material-symbols-outlined text-on-surface-variant/60',
                cm.textSize('sm'),
              )}
              aria-hidden="true"
            >
              lock
            </span>
            <input
              autoComplete="new-password"
              className={cm.cn(
                cm.w('full'),
                cm.sp('pl', 10),
                cm.sp('pr', 10),
                cm.sp('py', 3),
                cm.textSize('sm'),
                'block bg-surface-container-high border-0 rounded-xl text-on-surface placeholder:text-on-surface-variant/60 focus:ring-2 focus:ring-primary focus:outline-none transition-all',
              )}
              id="confirm"
              name="confirm"
              placeholder={t(
                'auth.signup.confirmPassword',
                {},
                { defaultValue: 'Confirm password' },
              )}
              required
              type={showPassword ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            <button
              type="button"
              aria-label={
                showPassword
                  ? t('resetPassword.hidePassword', {}, { defaultValue: 'Hide password' })
                  : t('resetPassword.showPassword', {}, { defaultValue: 'Show password' })
              }
              className={cm.cn(
                'absolute inset-y-0 right-0 flex items-center pr-3 text-on-surface-variant/60 hover:text-primary transition-colors',
              )}
              onClick={() => setShowPassword((v) => !v)}
            >
              <span
                className={cm.cn('material-symbols-outlined', cm.textSize('sm'))}
                aria-hidden="true"
              >
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>

        {error ? (
          <p role="alert" className={cm.cn(cm.textSize('xs'), 'text-error')}>
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className={cm.cn(
            cm.w('full'),
            cm.flex({ align: 'center', justify: 'center', gap: 2 }),
            cm.sp('py', 3),
            cm.sp('px', 4),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'rounded-xl text-on-primary bg-gradient-to-br from-primary to-primary-container hover:opacity-90 disabled:opacity-50 transition-opacity shadow-sm',
          )}
        >
          {loading ? (
            <>
              <span
                className={cm.cn('material-symbols-outlined animate-spin', cm.textSize('base'))}
                aria-hidden="true"
              >
                progress_activity
              </span>
              {t('common.resettingEllipsis', {}, { defaultValue: 'Resetting…' })}
            </>
          ) : (
            <>
              <span
                className={cm.cn('material-symbols-outlined', cm.textSize('base'))}
                aria-hidden="true"
              >
                lock_reset
              </span>
              {t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
            </>
          )}
        </button>
      </form>
    </ClarionAuthShell>
  )
}

export default ResetPassword
export { ResetPassword, ResetPassword as ResetPasswordPage }
