import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { OAuthProviderLogo } from '@molecule/app-oauth-logos-react'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
function LoginCard() {
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
    <div
      className={cm.cn(
        'bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm overflow-hidden',
      )}
    >
      <div className={cm.cn(cm.sp('p', 8), 'md:p-10', cm.stack(10))}>
        <header className={cm.stack(2)}>
          <h2
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[2.25rem] leading-tight tracking-[-0.02em] text-on-surface',
            )}
          >
            {t('auth.login.signInTitle', {}, { defaultValue: 'Welcome back' })}
          </h2>
          <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant')}>
            {t(
              'login.welcomeSubheading',
              {},
              { defaultValue: 'Sign in to report and follow issues' },
            )}
          </p>
        </header>
        {error && (
          <div
            data-mol-id="login-error"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.textCenter,
              'bg-error-container text-on-error-container rounded-lg',
            )}
            role="alert"
          >
            {error}
          </div>
        )}
        <form className={cm.stack(6)} onSubmit={handleSubmit}>
          {/* Email Field */}
          <div className={cm.stack(2)}>
            <label
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'block text-on-surface-variant tracking-wide uppercase',
              )}
              htmlFor="email"
            >
              {t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
            </label>
            <input
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 4),
                'py-3.5 bg-surface-container-low border-none rounded-lg text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary-container transition-all',
              )}
              id="email"
              name="email"
              placeholder={t(
                'auth.passwordPlaceholderNameCompany',
                {},
                { defaultValue: 'name@company.com' },
              )}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {/* Password Field */}
          <div className={cm.stack(2)}>
            <div className={cm.flex({ align: 'center', justify: 'between', gap: 3, wrap: 'wrap' })}>
              <label
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'block text-on-surface-variant tracking-wide uppercase',
                )}
                htmlFor="password"
              >
                {t('auth.login.password', {}, { defaultValue: 'Password' })}
              </label>
              <Link
                className={cm.cn(
                  'text-sm font-bold text-primary hover:text-primary-container transition-colors',
                )}
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
                  'py-3.5 bg-surface-container-low border-none rounded-lg text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary-container transition-all',
                )}
                id="password"
                name="password"
                placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                className={cm.cn(
                  'absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors',
                )}
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={
                  showPassword
                    ? t('login.hidePassword', {}, { defaultValue: 'Hide password' })
                    : t('login.showPassword', {}, { defaultValue: 'Show password' })
                }
              >
                <span
                  className={cm.cn('material-symbols-outlined text-[20px]')}
                  data-icon="visibility"
                >
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>
          {/* Sign In Button */}
          <button
            className={cm.cn(
              cm.w('full'),
              cm.sp('py', 4),
              cm.sp('px', 6),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'rounded-lg bg-login-gradient text-white tracking-wide transition-all hover:opacity-95 active:scale-[0.98] login-card-shadow',
            )}
            type="submit"
            disabled={loading}
          >
            {loading
              ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
              : t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </button>
        </form>
        {/* Divider */}
        <div className={cm.cn('relative')}>
          <div
            aria-hidden="true"
            className={cm.cn(cm.flex({ align: 'center' }), 'absolute inset-0')}
          >
            <div className={cm.cn(cm.w('full'), 'border-t border-surface-container-high')}></div>
          </div>
          <div
            className={cm.cn(
              cm.flex({ justify: 'center' }),
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              'relative uppercase tracking-widest',
            )}
          >
            <span className={cm.cn(cm.sp('px', 4), 'bg-surface-container-lowest text-outline')}>
              {t('login.continueWith', {}, { defaultValue: 'or continue with' })}
            </span>
          </div>
        </div>
        {/* Social Logins */}
        <div className={cm.grid({ cols: 3, gap: 'md' })}>
          {(['google', 'github', 'gitlab'] as const).map((provider) => {
            const labelKey = `login.continueWith${provider[0].toUpperCase()}${provider.slice(1)}`
            const fallback = `Continue with ${provider[0].toUpperCase()}${provider.slice(1)}`
            return (
              <button
                key={provider}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.sp('py', 3),
                  cm.sp('px', 4),
                  'rounded-lg bg-surface-container-high text-on-surface hover:bg-surface-variant transition-colors group',
                )}
                onClick={() => {
                  window.location.href = `/auth/${provider}`
                }}
                aria-label={t(labelKey, {}, { defaultValue: fallback })}
              >
                <span className={cm.cn('group-hover:scale-110 transition-transform')}>
                  <OAuthProviderLogo provider={provider} size={22} ariaLabel="" />
                </span>
              </button>
            )
          })}
        </div>
      </div>
      {/* Card Footer */}
      <div
        className={cm.cn(cm.sp('px', 8), cm.sp('py', 5), cm.textCenter, 'bg-surface-container-low')}
      >
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('auth.login.dontHaveAccount', {}, { defaultValue: "Don't have an account?" })}
          <Link
            className={cm.cn(
              'font-bold text-primary hover:text-primary-container transition-colors ml-1',
            )}
            to="/signup"
          >
            {t('auth.login.signUp', {}, { defaultValue: 'Sign up' })}
          </Link>
        </p>
      </div>
    </div>
  )
}

export default LoginCard
export { LoginCard }
