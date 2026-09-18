import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { authClient } from '../bonds/index.js'
import { AuthShell } from '../components/AuthShell.js'

export function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError(
        t('reset.errorTooShort', {}, { defaultValue: 'Password must be at least 8 characters.' }),
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
      await authClient.confirmPasswordReset({ token, password })
      navigate('/login', { replace: true })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(
              'reset.errorGeneric',
              {},
              { defaultValue: 'Could not reset password. Request a new link.' },
            ),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      heading={t(
        'auth.resetPassword.chooseNewPassword',
        {},
        { defaultValue: 'Choose a new password' },
      )}
      subheading={t(
        'reset.subheading',
        {},
        { defaultValue: 'Pick something memorable but hard to guess.' },
      )}
      footer={
        <>
          <span className={cm.cn('text-on-surface-variant')}>
            {t('reset.backPrompt', {}, { defaultValue: 'Changed your mind?' })}
          </span>{' '}
          <Link
            to="/login"
            className={
              'text-primary hover:text-primary-container hover:underline decoration-2 underline-offset-4 transition-all'
            }
          >
            {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
          </Link>
        </>
      }
    >
      <form className={cm.cn('space-y-5')} onSubmit={handleSubmit}>
        {error && (
          <div
            role="alert"
            data-mol-id="reset-error"
            className={cm.cn(
              'px-4 py-3 rounded-xl bg-error-container text-on-error-container text-sm',
            )}
          >
            {error}
          </div>
        )}
        {!token && (
          <div
            role="alert"
            data-mol-id="reset-missing-token"
            className={cm.cn(
              'px-4 py-3 rounded-xl bg-tertiary-container text-on-tertiary-container text-sm',
            )}
          >
            {t(
              'reset.missingToken',
              {},
              {
                defaultValue:
                  'No reset token detected. Request a fresh reset link from the sign-in page.',
              },
            )}
          </div>
        )}
        <div>
          <label
            htmlFor="password"
            className={cm.cn(
              'block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2',
            )}
          >
            {t('reset.newPassword', {}, { defaultValue: 'New password' })}
          </label>
          <div className={cm.cn('relative')}>
            <span
              className={cm.cn(
                'material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant',
              )}
              aria-hidden="true"
            >
              lock
            </span>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t(
                'common.atLeast8Characters',
                {},
                { defaultValue: 'At least 8 characters' },
              )}
              className={
                'w-full pl-12 pr-12 py-3.5 bg-surface-container-low rounded-xl text-on-surface placeholder:text-outline focus:bg-surface-container-lowest focus:outline-none focus:shadow-[inset_0_0_0_2px_rgba(75,8,201,0.4)] transition-all'
              }
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              data-mol-id="toggle-password"
              aria-label={
                showPassword
                  ? t('reset.hidePassword', {}, { defaultValue: 'Hide password' })
                  : t('reset.showPassword', {}, { defaultValue: 'Show password' })
              }
              className={
                'absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors'
              }
            >
              <span className={cm.cn('material-symbols-outlined')}>
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>
        <div>
          <label
            htmlFor="confirm"
            className={cm.cn(
              'block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2',
            )}
          >
            {t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
          </label>
          <div className={cm.cn('relative')}>
            <span
              className={cm.cn(
                'material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant',
              )}
              aria-hidden="true"
            >
              lock_reset
            </span>
            <input
              id="confirm"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={t(
                'reset.confirmPlaceholder',
                {},
                { defaultValue: 'Re-enter your new password' },
              )}
              className={
                'w-full pl-12 pr-4 py-3.5 bg-surface-container-low rounded-xl text-on-surface placeholder:text-outline focus:bg-surface-container-lowest focus:outline-none focus:shadow-[inset_0_0_0_2px_rgba(75,8,201,0.4)] transition-all'
              }
            />
          </div>
        </div>
        <button
          type="submit"
          data-mol-id="btn-reset-password"
          disabled={loading || !token}
          className={cm.cn(
            'w-full py-3.5 px-4 bg-primary-container text-on-primary font-bold rounded-xl shadow-[0px_8px_24px_rgba(99,54,224,0.25)] hover:bg-primary hover:-translate-y-0.5 active:scale-[0.98] transition-all disabled:opacity-70',
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
