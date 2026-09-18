import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

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

  const [email] = useState(searchParams.get('email') || '')
  const [token] = useState(searchParams.get('token') || '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const isResetting = confirmStatus === 'pending'
  const passwordsMatch = password === confirmPassword || !confirmPassword

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordsMatch) return
    try {
      await confirmReset({ token, password })
      if (email) {
        try {
          await login({ email, password })
        } catch (_error) {
          // Auto-login after reset is best-effort; navigate to home regardless.
        }
      }
      navigate('/home', { replace: true })
    } catch (_error) {
      // Error tracked in hook state via confirmReset error; no additional handling needed.
    }
  }

  return (
    <AuthShell
      eyebrow={t(
        'auth.resetPassword.chooseNewPassword',
        {},
        { defaultValue: 'Choose a new password' },
      )}
      heading={t('auth.resetPassword.setNewPassword', {}, { defaultValue: 'Set a new password' })}
      subheading={t(
        'resetPassword.subheading',
        {},
        {
          defaultValue:
            'Pick something at least 12 characters long. We will sign you in once you save.',
        },
      )}
      meta={
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          <Link to="/login" className={cm.cn('font-semibold text-primary hover:underline')}>
            ← {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className={cm.stack(4)}>
        <label className={cm.stack(2)}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('resetPassword.newPassword', {}, { defaultValue: 'New password' })}
          </span>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 4),
              'h-12 rounded-lg border border-outline-variant bg-surface-container-lowest focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30 transition-all',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-[20px] text-on-surface-variant')}
              aria-hidden="true"
            >
              lock
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={12}
              placeholder="At least 12 characters"
              className={cm.cn(
                'flex-1 bg-transparent text-base text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none',
              )}
            />
          </div>
        </label>

        <label className={cm.stack(2)}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
          </span>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 4),
              'h-12 rounded-lg border bg-surface-container-lowest transition-all',
              passwordsMatch
                ? 'border-outline-variant focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30'
                : 'border-error focus-within:border-error focus-within:ring-2 focus-within:ring-error/30',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-[20px] text-on-surface-variant')}
              aria-hidden="true"
            >
              lock
            </span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
              placeholder="Re-enter your new password"
              className={cm.cn(
                'flex-1 bg-transparent text-base text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none',
              )}
            />
          </div>
          {!passwordsMatch ? (
            <span className={cm.cn(cm.textSize('xs'), 'text-error')}>
              {t(
                'auth.signup.passwordsDontMatchPeriod',
                {},
                { defaultValue: "Passwords don't match." },
              )}
            </span>
          ) : null}
        </label>

        {confirmError ? (
          <p
            className={cm.cn(
              cm.sp('p', 3),
              cm.textSize('sm'),
              'rounded-md bg-error/10 border border-error/40 text-on-surface',
            )}
          >
            {confirmError.message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isResetting || !passwordsMatch}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
            'h-12 rounded-lg bg-primary text-on-primary text-base font-semibold hover:bg-primary-hover disabled:opacity-60 transition-colors',
          )}
        >
          {isResetting ? (
            <>
              <span
                className={cm.cn('material-symbols-outlined animate-spin text-[18px]')}
                aria-hidden="true"
              >
                progress_activity
              </span>
              {t('common.resettingEllipsis', {}, { defaultValue: 'Resetting…' })}
            </>
          ) : (
            t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })
          )}
        </button>
      </form>
    </AuthShell>
  )
}
