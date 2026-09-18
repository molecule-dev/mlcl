import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
function LoginForm() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { login } = useAuth()
  const navigate = useNavigate()
  // Cross-view auth form persistence (email shared across Login/Signup/
  // Forgot/Reset, cleared on success) via the shared @molecule hook.
  const {
    fields: authFormFields,
    setField: setAuthFormField,
    clear: clearAuthForm,
  } = useAuthFormState()
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await login({ email, password })
      clearAuthForm()
      navigate('/dashboard')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('auth.error.loginFailed', {}, { defaultValue: 'Login failed' }),
      )
    } finally {
      setLoading(false)
    }
  }

  const inputClass = cm.cn(
    cm.w('full'),
    cm.sp('pl', 10),
    cm.sp('pr', 3),
    cm.sp('py', 3),
    cm.textSize('sm'),
    'block bg-surface-container-high border-0 rounded-xl text-on-surface font-body focus:ring-0 focus:outline-none transition-all duration-200',
  )
  const passwordInputClass = cm.cn(
    cm.w('full'),
    cm.sp('pl', 10),
    cm.sp('pr', 10),
    cm.sp('py', 3),
    cm.textSize('sm'),
    'block bg-surface-container-high border-0 rounded-xl text-on-surface font-body focus:ring-0 focus:outline-none transition-all duration-200',
  )

  return (
    <form className={cm.stack(5)} onSubmit={handleSubmit}>
      {/* Email Field */}
      <div>
        <label className={'sr-only'} htmlFor="email">
          {t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
        </label>
        <div className={'relative'}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.sp('pl', 3),
              'absolute inset-y-0 left-0 pointer-events-none',
            )}
          >
            <span
              className={cm.cn(
                cm.textSize('sm'),
                'material-symbols-outlined text-on-surface-variant/50',
              )}
            >
              mail
            </span>
          </div>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required={true}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder={t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
          />
        </div>
      </div>
      {/* Password Field */}
      <div>
        <label className={'sr-only'} htmlFor="password">
          {t('auth.login.password', {}, { defaultValue: 'Password' })}
        </label>
        <div className={'relative'}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.sp('pl', 3),
              'absolute inset-y-0 left-0 pointer-events-none',
            )}
          >
            <span
              className={cm.cn(
                cm.textSize('sm'),
                'material-symbols-outlined text-on-surface-variant/50',
              )}
            >
              lock
            </span>
          </div>
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required={true}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={passwordInputClass}
            placeholder={t('auth.login.password', {}, { defaultValue: 'Password' })}
          />
          <button
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.sp('pr', 3),
              'absolute inset-y-0 right-0 text-on-surface-variant/50 hover:text-primary transition-colors',
            )}
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={
              showPassword
                ? t('login.hidePassword', {}, { defaultValue: 'Hide password' })
                : t('login.showPassword', {}, { defaultValue: 'Show password' })
            }
          >
            <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
              {showPassword ? 'visibility_off' : 'visibility'}
            </span>
          </button>
        </div>
      </div>
      {error && (
        <p
          data-mol-id="login-error"
          role="alert"
          className={cm.cn(cm.textSize('xs'), cm.sp('px', 1), 'text-error')}
        >
          {error}
        </p>
      )}
      {/* Forgot Password */}
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'end' }), cm.sp('mt', 2))}>
        <Link
          className={
            'text-sm font-medium text-primary hover:text-primary-container transition-colors duration-200 font-body'
          }
          to="/forgot-password"
        >
          {t('auth.login.forgotPassword', {}, { defaultValue: 'Forgot password?' })}
        </Link>
      </div>
      {/* Sign In Button */}
      <div className={cm.sp('pt', 2)}>
        <button
          className={cm.cn(
            cm.w('full'),
            cm.flex({ justify: 'center' }),
            cm.sp('py', 3),
            cm.sp('px', 4),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'border border-transparent rounded-xl text-on-primary bg-gradient-to-br from-primary to-primary-container hover:opacity-90 focus:outline-none transition-all duration-200 shadow-sm font-body',
          )}
          type="submit"
          disabled={loading}
        >
          {loading
            ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
            : t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
        </button>
      </div>
    </form>
  )
}

export default LoginForm
export { LoginForm }
