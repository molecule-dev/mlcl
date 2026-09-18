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
      navigate('/')
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

  return (
    <form className={cm.cn(cm.w('full'), cm.stack(6))} onSubmit={handleSubmit}>
      {/* Email Field */}
      <div className={cm.stack(2)}>
        <label
          htmlFor="login-email"
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            cm.sp('ml', 1),
            'block text-on-surface-variant',
          )}
        >
          {t('login.email', {}, { defaultValue: 'Email Address' })}
        </label>
        <div className={cm.cn('relative')}>
          <input
            className={cm.cn(
              cm.w('full'),
              cm.sp('px', 4),
              'bg-surface-container-high border-0 rounded-DEFAULT py-3.5 text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary-container focus:bg-surface-container-lowest transition-all duration-300',
            )}
            id="login-email"
            name="email"
            autoComplete="email"
            placeholder={t(
              'auth.passwordPlaceholderEmail',
              {},
              { defaultValue: 'you@example.com' },
            )}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
      </div>
      {/* Password Field */}
      <div className={cm.stack(2)}>
        <div className={cm.cn(cm.flex({ justify: 'between', align: 'center' }), cm.sp('px', 1))}>
          <label
            htmlFor="login-password"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'text-on-surface-variant',
            )}
          >
            {t('auth.login.password', {}, { defaultValue: 'Password' })}
          </label>
          <Link
            className={cm.cn('text-sm font-bold text-tertiary hover:underline transition-all')}
            to="/forgot-password"
          >
            {t('auth.login.forgotPassword', {}, { defaultValue: 'Forgot password?' })}
          </Link>
        </div>
        <div className={cm.cn('relative')}>
          <input
            className={cm.cn(
              cm.w('full'),
              cm.sp('px', 4),
              'bg-surface-container-high border-0 rounded-DEFAULT py-3.5 text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary-container focus:bg-surface-container-lowest transition-all duration-300',
            )}
            id="login-password"
            name="password"
            autoComplete="current-password"
            placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            aria-label={
              showPassword
                ? t('login.hidePassword', {}, { defaultValue: 'Hide password' })
                : t('login.showPassword', {}, { defaultValue: 'Show password' })
            }
            aria-pressed={showPassword}
            className={cm.cn(
              'absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors',
            )}
            type="button"
            onClick={() => setShowPassword(!showPassword)}
          >
            <span
              className={cm.cn('material-symbols-outlined')}
              data-icon={showPassword ? 'visibility_off' : 'visibility'}
            >
              {showPassword ? 'visibility_off' : 'visibility'}
            </span>
          </button>
        </div>
      </div>
      {error && (
        <div
          data-mol-id="login-error"
          role="alert"
          className={cm.cn(
            cm.textSize('sm'),
            cm.textCenter,
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.roundedFull,
            'bg-error-container text-on-error-container',
          )}
        >
          {error}
        </div>
      )}
      {/* CTA Button */}
      <button
        className={cm.cn(
          cm.w('full'),
          cm.sp('py', 4),
          cm.sp('px', 6),
          cm.roundedFull,
          cm.fontWeight('bold'),
          cm.textSize('lg'),
          cm.sp('mt', 2),
          'bg-gradient-to-r from-primary to-secondary text-white shadow-lg hover:opacity-90 active:scale-[0.98] transition-all duration-200 disabled:opacity-60',
        )}
        type="submit"
        disabled={loading}
      >
        {loading
          ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
          : t('login.submit', {}, { defaultValue: 'Sign In' })}
      </button>
    </form>
  )
}

export default LoginForm
export { LoginForm }
