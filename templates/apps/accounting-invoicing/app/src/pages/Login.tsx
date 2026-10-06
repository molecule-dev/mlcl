import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthBrandPanel } from '../components/AuthBrandPanel.js'
import { BrandWordmark } from '../components/BrandWordmark.js'
import { OAuthButtons } from '../components/OAuthButtons.js'

export function Login() {
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
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    // Yield a frame so the spinner DOM update flushes before the network
    // request fires. Avoids racing the response error past the spinner
    // mutation in tooling that watches for "first observable effect".
    await new Promise((resolve) => setTimeout(resolve, 80))
    try {
      await login({ email, password })
      clearAuthForm()
      navigate('/dashboard')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('login.failed', {}, { defaultValue: 'Sign in failed.' }),
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
        <div className={cm.cn('md:hidden self-start mb-12')}>
          <BrandWordmark as="span" size="lg" />
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
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </p>
            <h1
              className={cm.cn(
                cm.textSize('3xl'),
                cm.fontWeight('bold'),
                cm.sp('mb', 2),
                'tracking-tight',
              )}
            >
              {t('auth.login.signInTitle', {}, { defaultValue: 'Welcome back' })}
            </h1>
            <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant')}>
              {t('login.subheading', {}, { defaultValue: 'Sign in to manage your books.' })}
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
            <div>
              <label
                htmlFor="login-email"
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  cm.sp('mb', 2),
                  'block uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
              </label>
              <div className="relative">
                <span
                  className={cm.cn(
                    'absolute inset-y-0 left-0 px-3 flex items-center text-on-surface-variant pointer-events-none',
                  )}
                  aria-hidden="true"
                >
                  <span className={cm.cn('material-symbols-outlined text-xl')}>mail</span>
                </span>
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t(
                    'auth.passwordPlaceholderCompanyEmail',
                    {},
                    { defaultValue: 'you@company.com' },
                  )}
                  className={cm.cn(
                    cm.sp('pl', 10),
                    cm.sp('pr', 3),
                    cm.sp('py', 3),
                    cm.textSize('sm'),
                    cm.w('full'),
                    'border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors',
                  )}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password"
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  cm.sp('mb', 2),
                  'block uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('auth.login.password', {}, { defaultValue: 'Password' })}
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
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
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
                  onClick={() => setShowPassword((v) => !v)}
                  className={cm.cn(
                    'absolute inset-y-0 right-0 px-3 flex items-center text-on-surface-variant hover:text-on-surface focus:outline-none',
                  )}
                  aria-label={
                    showPassword
                      ? t('login.hidePassword', {}, { defaultValue: 'Hide password' })
                      : t('login.showPassword', {}, { defaultValue: 'Show password' })
                  }
                >
                  <span className={cm.cn('material-symbols-outlined text-xl')}>
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <div
              className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.textSize('sm'))}
            >
              <label
                className={cm.cn('flex items-center gap-2 cursor-pointer text-on-surface-variant')}
              >
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className={cm.cn(
                    'h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary',
                  )}
                />
                {t('auth.login.rememberMe', {}, { defaultValue: 'Remember me' })}
              </label>
              <Link
                to="/forgot-password"
                className={cm.cn(cm.fontWeight('bold'), 'transition-colors hover:opacity-80')}
                style={{ color: 'var(--color-accent-text, var(--color-accent))' }}
              >
                {t('auth.login.forgotPassword', {}, { defaultValue: 'Forgot password?' })}
              </Link>
            </div>

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
                ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
                : t('login.submit', {}, { defaultValue: 'Sign In' })}
            </button>
          </form>

          <div className={cm.cn(cm.sp('mt', 8))}>
            <OAuthButtons />
          </div>

          <p
            className={cm.cn(
              cm.sp('mt', 10),
              cm.textSize('sm'),
              cm.textCenter,
              'text-on-surface-variant',
            )}
          >
            {t('login.noAccount', { appName: APP_NAME }, { defaultValue: 'New to {{appName}}?' })}{' '}
            <Link
              to="/signup"
              className={cm.cn(cm.fontWeight('bold'), 'transition-colors hover:opacity-80')}
              style={{ color: 'var(--color-accent-text, var(--color-accent))' }}
            >
              {t('login.signupCta', {}, { defaultValue: 'Start your free trial' })}
            </Link>
          </p>
        </div>
      </section>
    </div>
  )
}

export default Login
