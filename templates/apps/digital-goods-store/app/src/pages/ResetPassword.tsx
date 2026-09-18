import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useLogin, usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

export function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { confirmStatus, confirmError, confirmReset } = usePasswordReset()
  const { login } = useLogin()

  const [token] = useState(searchParams.get('token') || 'demo-token')
  const [emailParam] = useState(searchParams.get('email') || '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const isSubmitting = confirmStatus === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) return
    try {
      await confirmReset({ token, password })
      if (emailParam) await login({ email: emailParam, password })
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // tracked in hook state — usePasswordReset exposes confirmError
    }
  }

  const fieldClass = cm.cn(
    cm.w('full'),
    cm.sp('px', 4),
    cm.sp('py', 3),
    cm.fontWeight('medium'),
    'rounded-xl bg-bg-secondary border border-border focus:outline-none focus:border-primary text-on-surface placeholder:text-on-surface-variant',
  )
  const labelClass = cm.cn(
    cm.textSize('xs'),
    cm.fontWeight('bold'),
    cm.sp('mb', 2),
    'block uppercase tracking-widest text-on-surface-variant',
  )

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'relative overflow-hidden bg-bg',
      )}
    >
      <div
        className={cm.cn('absolute inset-0 -z-10')}
        style={{
          background:
            'radial-gradient(circle at 80% 0%, var(--color-primary-light) 0%, transparent 45%), radial-gradient(circle at 0% 100%, var(--color-accent-light) 0%, transparent 50%), var(--color-bg)',
        }}
        aria-hidden="true"
      />
      <main
        className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.flex1, cm.sp('p', 6))}
      >
        <div className={cm.cn(cm.w('full'), cm.maxW('md'))}>
          <header className={cm.cn(cm.textCenter, cm.sp('mb', 8))}>
            <Link
              to="/"
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                cm.sp('mb', 4),
              )}
              aria-label={APP_NAME}
            >
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.roundedFull,
                  'bg-gradient-to-br from-primary to-accent shadow-md shadow-primary/30',
                )}
                style={{ width: 44, height: 44 }}
              >
                <span className="material-symbols-outlined text-white" style={{ fontSize: 26 }}>
                  inventory_2
                </span>
              </span>
              <span
                className={cm.cn(
                  cm.textSize('2xl'),
                  cm.fontWeight('bold'),
                  'tracking-tight text-on-surface',
                )}
              >
                {APP_NAME}
              </span>
            </Link>
            <h1
              className={cm.cn(
                cm.textSize('3xl'),
                cm.fontWeight('bold'),
                'text-on-surface tracking-tight',
              )}
            >
              {t('auth.resetPassword.setNewPassword', {}, { defaultValue: 'Set a new password' })}
            </h1>
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
              {t(
                'resetPassword.subtitle',
                {},
                {
                  defaultValue:
                    'Choose something at least 8 characters long. We\u2019ll sign you back in.',
                },
              )}
            </p>
          </header>

          <div
            className={cm.cn(
              cm.sp('p', 8),
              'rounded-3xl bg-surface border border-border shadow-xl shadow-primary/5',
            )}
          >
            <form className={cm.stack(5)} onSubmit={handleSubmit}>
              <div>
                <label className={labelClass} htmlFor="reset-password">
                  {t('resetPassword.password', {}, { defaultValue: 'New password' })}
                </label>
                <input
                  id="reset-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="reset-confirm">
                  {t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
                </label>
                <input
                  id="reset-confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={fieldClass}
                />
                {confirmPassword && confirmPassword !== password && (
                  <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-error')}>
                    {t(
                      'resetPassword.mismatch',
                      {},
                      { defaultValue: 'Passwords don\u2019t match' },
                    )}
                  </p>
                )}
              </div>

              {confirmError && (
                <div
                  role="alert"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.textSize('sm'),
                    'rounded-xl bg-error-light text-error',
                  )}
                >
                  {confirmError.message}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || password !== confirmPassword}
                className={cm.cn(
                  cm.sp('py', 4),
                  cm.fontWeight('bold'),
                  'rounded-xl text-white shadow-lg shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 transition-all',
                )}
                style={{
                  background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
                }}
              >
                {isSubmitting
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
              </button>
            </form>
          </div>

          <p
            className={cm.cn(
              cm.textCenter,
              cm.textSize('sm'),
              cm.sp('mt', 8),
              'text-on-surface-variant',
            )}
          >
            <Link
              to="/login"
              className={cm.cn(cm.fontWeight('bold'), 'text-primary-dark hover:text-primary-hover')}
            >
              {t('auth.backToSignInArrow', {}, { defaultValue: '← Back to sign in' })}
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}

export default ResetPassword
