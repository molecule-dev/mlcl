import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthBrandPanel } from '../components/AuthBrandPanel.js'
import { authConfig } from '../config.js'

export function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
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
        t(
          'resetPassword.tooShort',
          {},
          { defaultValue: 'Password must be at least 8 characters.' },
        ),
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
      await http.post(`${authConfig.baseURL}${authConfig.resetPasswordEndpoint}`, {
        token,
        password,
      })
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
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        cm.flex({}),
        'bg-surface text-on-surface antialiased flex-col md:flex-row',
      )}
    >
      <AuthBrandPanel />
      <section
        className={cm.cn(
          cm.sp('p', 8),
          cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
          'w-full md:w-[45%] lg:p-16 relative',
        )}
      >
        <div
          className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'md:hidden self-start mb-12')}
        >
          <span
            className="material-symbols-outlined text-3xl"
            style={{ color: 'var(--mol-color-primary-dark)' }}
          >
            account_balance
          </span>
          <span
            className={cm.cn('text-2xl font-black tracking-tight')}
            style={{ color: 'var(--mol-color-primary-dark)' }}
          >
            {APP_NAME}
          </span>
        </div>

        <div className={cm.cn(cm.w('full'), 'max-w-[440px]')}>
          <header className={cm.cn(cm.sp('mb', 10), 'text-center md:text-left')}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.sp('mb', 3),
                'uppercase tracking-[0.3em] text-primary',
              )}
            >
              {t('auth.resetPassword.accountRecovery', {}, { defaultValue: 'Account recovery' })}
            </p>
            <h1
              className={cm.cn(
                cm.textSize('3xl'),
                cm.fontWeight('bold'),
                cm.sp('mb', 2),
                'tracking-tight',
              )}
            >
              {t(
                'auth.resetPassword.setNewPasswordShort',
                {},
                { defaultValue: 'Set new password' },
              )}
            </h1>
            <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant')}>
              {t(
                'resetPassword.subheading',
                {},
                { defaultValue: 'Choose a strong password — eight characters minimum.' },
              )}
            </p>
          </header>

          {error ? (
            <div
              role="alert"
              aria-live="assertive"
              className={cm.cn(
                cm.sp('p', 3),
                cm.sp('mb', 4),
                cm.textSize('sm'),
                'rounded-lg bg-error/10 text-error',
              )}
            >
              {error}
            </div>
          ) : null}

          <form className={cm.cn('space-y-6')} onSubmit={handleSubmit}>
            <PasswordField
              id="reset-password"
              label={t('resetPassword.passwordLabel', {}, { defaultValue: 'New password' })}
              value={password}
              onChange={setPassword}
              placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
              show={showPassword}
              onToggleShow={() => setShowPassword((v) => !v)}
              showLabel={t('resetPassword.showPassword', {}, { defaultValue: 'Show password' })}
              hideLabel={t('resetPassword.hidePassword', {}, { defaultValue: 'Hide password' })}
            />
            <PasswordField
              id="reset-confirm"
              label={t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
              value={confirm}
              onChange={setConfirm}
              placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
              show={showPassword}
              onToggleShow={() => setShowPassword((v) => !v)}
              showLabel={t('resetPassword.showPassword', {}, { defaultValue: 'Show password' })}
              hideLabel={t('resetPassword.hidePassword', {}, { defaultValue: 'Hide password' })}
            />

            <button
              type="submit"
              disabled={loading}
              className={cm.cn(
                cm.sp('py', 3),
                cm.sp('px', 4),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                cm.w('full'),
                'bg-primary text-on-primary rounded-lg hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-60',
              )}
            >
              {loading
                ? t('common.resettingEllipsis', {}, { defaultValue: 'Resetting…' })
                : t('resetPassword.submit', {}, { defaultValue: 'Reset Password' })}
            </button>
          </form>

          <p
            className={cm.cn(
              cm.sp('mt', 10),
              cm.textSize('sm'),
              cm.textCenter,
              'text-on-surface-variant',
            )}
          >
            <Link
              to="/login"
              className={cm.cn(cm.fontWeight('bold'), 'transition-colors hover:opacity-80')}
              style={{ color: 'var(--color-accent-text, var(--color-accent))' }}
            >
              {t('resetPassword.backToLogin', {}, { defaultValue: '← Back to Sign In' })}
            </Link>
          </p>
        </div>
      </section>
    </div>
  )
}

interface PasswordFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  show: boolean
  onToggleShow: () => void
  showLabel: string
  hideLabel: string
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  placeholder,
  show,
  onToggleShow,
  showLabel,
  hideLabel,
}: PasswordFieldProps) {
  const cm = getClassMap()
  return (
    <div>
      <label
        htmlFor={id}
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          cm.sp('mb', 2),
          'block uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </label>
      <div className="relative">
        <span
          className={cm.cn(
            'absolute inset-y-0 left-0 px-3 flex items-center text-on-surface-variant pointer-events-none',
          )}
          aria-hidden="true"
        >
          <span className={cm.cn('material-symbols-outlined text-xl')}>lock</span>
        </span>
        <input
          id={id}
          type={show ? 'text' : 'password'}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="new-password"
          className={cm.cn(
            cm.sp('pl', 10),
            cm.sp('pr', 10),
            cm.sp('py', 3),
            cm.textSize('sm'),
            cm.w('full'),
            'border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors',
          )}
        />
        <button
          type="button"
          onClick={onToggleShow}
          className={cm.cn(
            'absolute inset-y-0 right-0 px-3 flex items-center text-on-surface-variant hover:text-on-surface focus:outline-none',
          )}
          aria-label={show ? hideLabel : showLabel}
        >
          <span className={cm.cn('material-symbols-outlined text-xl')}>
            {show ? 'visibility_off' : 'visibility'}
          </span>
        </button>
      </div>
    </div>
  )
}

export default ResetPassword
