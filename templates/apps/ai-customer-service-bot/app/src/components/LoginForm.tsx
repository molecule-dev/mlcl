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
  const [rememberMe, setRememberMe] = useState(false)

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
          : t('login.failed', {}, { defaultValue: 'Invalid email or password' }),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <form data-mol-id="login-form" className={cm.stack(6)} onSubmit={handleSubmit}>
      <div className={cm.stack(4)}>
        <div>
          <label
            className={cm.cn(
              cm.fontWeight('medium'),
              cm.sp('ml', 1),
              'block text-[0.6875rem] uppercase tracking-widest text-on-surface mb-1.5',
            )}
            htmlFor="email"
          >
            {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          </label>
          <div className="relative">
            <span
              className={cm.cn(
                cm.flex({ align: 'center' }),
                cm.sp('pl', 3),
                'absolute inset-y-0 left-0 pointer-events-none text-outline',
              )}
            >
              <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>mail</span>
            </span>
            <input
              data-mol-id="login-email"
              className={cm.cn(
                cm.w('full'),
                cm.sp('pl', 10),
                cm.sp('pr', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                'bg-surface-container-low border-transparent rounded-xl text-on-surface focus:ring-2 focus:ring-primary/30 focus:bg-surface-container-lowest focus:border-transparent transition-all duration-300',
              )}
              id="email"
              name="email"
              placeholder={t('login.emailPlaceholder', {}, { defaultValue: 'agent@rapport.io' })}
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label
            className={cm.cn(
              cm.fontWeight('medium'),
              cm.sp('ml', 1),
              'block text-[0.6875rem] uppercase tracking-widest text-on-surface mb-1.5',
            )}
            htmlFor="password"
          >
            {t('auth.login.password', {}, { defaultValue: 'Password' })}
          </label>
          <div className="relative">
            <span
              className={cm.cn(
                cm.flex({ align: 'center' }),
                cm.sp('pl', 3),
                'absolute inset-y-0 left-0 pointer-events-none text-outline',
              )}
            >
              <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>lock</span>
            </span>
            <input
              data-mol-id="login-password"
              className={cm.cn(
                cm.w('full'),
                cm.sp('pl', 10),
                cm.sp('pr', 10),
                cm.sp('py', 3),
                cm.textSize('sm'),
                'bg-surface-container-low border-transparent rounded-xl text-on-surface focus:ring-2 focus:ring-primary/30 focus:bg-surface-container-lowest focus:border-transparent transition-all duration-300',
              )}
              id="password"
              name="password"
              placeholder="••••••••"
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              data-mol-id="login-toggle-password"
              className={cm.cn(
                cm.flex({ align: 'center' }),
                cm.sp('pr', 3),
                'absolute inset-y-0 right-0 text-outline hover:text-on-surface transition-colors',
              )}
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={t(
                'login.togglePassword',
                {},
                { defaultValue: 'Toggle password visibility' },
              )}
              aria-pressed={showPassword}
            >
              <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>
      </div>
      <div className={cm.flex({ align: 'center', justify: 'between' })}>
        <div className={cm.flex({ align: 'center' })}>
          <input
            data-mol-id="login-remember"
            className={cm.cn(
              cm.w(4),
              cm.h(4),
              'text-primary bg-surface-container-low border-transparent rounded focus:ring-primary/30',
            )}
            id="remember-me"
            name="remember-me"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          <label
            className={cm.cn(cm.sp('ml', 2), cm.textSize('sm'), 'block text-on-surface-variant')}
            htmlFor="remember-me"
          >
            {t('auth.login.rememberMe', {}, { defaultValue: 'Remember me' })}
          </label>
        </div>
        <div className={cm.textSize('sm')}>
          <Link
            data-mol-id="login-forgot-link"
            className="font-medium text-primary hover:text-primary-container transition-colors"
            to="/forgot-password"
          >
            {t('auth.login.forgotPassword', {}, { defaultValue: 'Forgot password?' })}
          </Link>
        </div>
      </div>
      {error && (
        <p
          data-mol-id="login-error"
          role="alert"
          className={cm.cn(cm.textSize('sm'), cm.textCenter, 'text-error')}
        >
          {error}
        </p>
      )}
      <div>
        <button
          data-mol-id="login-submit"
          className={cm.cn(
            cm.w('full'),
            cm.flex({ justify: 'center' }),
            cm.sp('px', 4),
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            'py-3.5 border border-transparent rounded-xl text-on-primary bg-gradient-to-br from-primary to-primary-container hover:scale-[1.02] transition-transform duration-300 ease-out shadow-[0_8px_16px_-4px_rgba(37,99,235,0.2)]',
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
