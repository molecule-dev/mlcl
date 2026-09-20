import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { LoginBrandPanel } from '../components/LoginBrandPanel.js'

export function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { confirmStatus, confirmError, confirmReset } = usePasswordReset()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const loading = confirmStatus === 'pending'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError(
        t('auth.signup.passwordsDoNotMatchPeriod', {}, { defaultValue: 'Passwords do not match.' }),
      )
      return
    }
    setError(null)
    try {
      await confirmReset({ token, password })
      setDone(true)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : ((confirmError instanceof Error ? confirmError.message : null) ??
              t(
                'auth.resetPassword.couldNotReset',
                {},
                { defaultValue: 'Could not reset password.' },
              )),
      )
    }
  }

  return (
    <div className={cm.cn(cm.minH('screen'), 'flex bg-background text-on-surface antialiased')}>
      <LoginBrandPanel />
      <main
        className={cm.cn(
          'flex-1 flex items-center justify-center',
          cm.sp('px', 6),
          cm.sp('py', 10),
        )}
      >
        <div className={cm.cn(cm.w('full'), cm.maxW('md'))}>
          <header className={cm.sp('mb', 8)}>
            <p
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-primary-dark',
              )}
            >
              {t('auth.resetPassword.accountRecovery', {}, { defaultValue: 'Account recovery' })}
            </p>
            <h1
              className={cm.cn(
                cm.sp('mt', 2),
                cm.textSize('3xl'),
                'font-extrabold tracking-tight text-on-surface',
              )}
            >
              {t('auth.resetPassword.setNewPassword', {}, { defaultValue: 'Set a new password' })}
            </h1>
            <p className={cm.cn(cm.sp('mt', 2), cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'resetPassword.subheading',
                {},
                {
                  defaultValue:
                    'Choose a strong password — at least 12 characters with mixed case.',
                },
              )}
            </p>
          </header>

          {done ? (
            <div
              role="status"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 5),
                'rounded-2xl bg-success/10 text-success border border-success/20',
              )}
            >
              <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                <span aria-hidden="true" className="material-symbols-outlined">
                  task_alt
                </span>
                <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'))}>
                  {t(
                    'auth.resetPassword.passwordUpdated',
                    {},
                    { defaultValue: 'Password updated.' },
                  )}
                </p>
              </div>
              <p className={cm.cn(cm.sp('mt', 2), cm.textSize('sm'), 'text-success/80')}>
                {t(
                  'resetPassword.signInPrompt',
                  {},
                  { defaultValue: 'Use your new password to sign in.' },
                )}
              </p>
              <Link
                to="/login"
                className={cm.cn(
                  cm.sp('mt', 4),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'inline-block rounded-xl bg-primary text-on-primary',
                )}
              >
                {t('resetPassword.signInCta', {}, { defaultValue: 'Sign in →' })}
              </Link>
            </div>
          ) : (
            <>
              {error ? (
                <div
                  role="alert"
                  aria-live="assertive"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.sp('mb', 6),
                    cm.textSize('sm'),
                    'rounded-xl bg-error/10 text-error font-semibold',
                  )}
                >
                  {error}
                </div>
              ) : null}
              <form
                onSubmit={handleSubmit}
                className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}
              >
                <PasswordField
                  id="password"
                  label={t('resetPassword.passwordLabel', {}, { defaultValue: 'New password' })}
                  value={password}
                  onChange={setPassword}
                />
                <PasswordField
                  id="confirm"
                  label={t(
                    'auth.signup.confirmNewPassword',
                    {},
                    { defaultValue: 'Confirm new password' },
                  )}
                  value={confirm}
                  onChange={setConfirm}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 3),
                    cm.sp('mt', 2),
                    cm.fontWeight('bold'),
                    cm.textSize('sm'),
                    'rounded-xl bg-primary text-on-primary shadow-md shadow-primary/20 hover:opacity-90 transition-opacity disabled:opacity-50',
                  )}
                >
                  {loading
                    ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                    : t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
                </button>
              </form>
            </>
          )}

          <p
            className={cm.cn(
              cm.sp('mt', 8),
              cm.textCenter,
              cm.textSize('sm'),
              'text-on-surface-variant',
            )}
          >
            <Link
              to="/login"
              className={cm.cn(cm.fontWeight('bold'), 'text-primary-dark hover:underline')}
            >
              ← {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}

function PasswordField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
}) {
  const cm = getClassMap()
  return (
    <div className={cm.flex({ direction: 'col', gap: 'sm' })}>
      <label
        htmlFor={id}
        className={cm.cn(
          'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </label>
      <div
        className={cm.cn(
          cm.flex({ align: 'center' }),
          cm.sp('px', 4),
          cm.sp('py', 3),
          'rounded-xl border border-outline-variant/30 bg-surface-container-lowest focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all',
        )}
      >
        <span
          aria-hidden="true"
          className={cm.cn('material-symbols-outlined text-[20px] text-on-surface-variant')}
        >
          lock
        </span>
        <input
          id={id}
          type="password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
          autoComplete="new-password"
          required
          className={cm.cn(
            cm.sp('ml', 3),
            cm.fontWeight('medium'),
            cm.textSize('sm'),
            'flex-1 bg-transparent border-none outline-none text-on-surface placeholder:text-on-surface-variant/60',
          )}
        />
      </div>
    </div>
  )
}

export default ResetPassword
