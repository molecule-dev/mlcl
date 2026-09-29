import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'
import { OAuthButtons } from '../components/OAuthButtons.js'

export function Login() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard'
  const { status, error, login } = useLogin()
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

  const isLoggingIn = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login({ email, password })
      clearAuthForm()
      navigate(from, { replace: true })
    } catch (_error) {
      // tracked in hook state — useLogin exposes error
    }
  }

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
            'radial-gradient(circle at 20% 0%, var(--color-primary-light) 0%, transparent 45%), radial-gradient(circle at 100% 100%, var(--color-accent-light) 0%, transparent 50%), var(--color-bg)',
        }}
        aria-hidden="true"
      />
      <div
        className={cm.cn('absolute -top-32 -left-32 rounded-full bg-primary/15 blur-3xl -z-10')}
        style={{ width: 360, height: 360 }}
        aria-hidden="true"
      />
      <div
        className={cm.cn('absolute -bottom-24 -right-24 rounded-full bg-accent/15 blur-3xl -z-10')}
        style={{ width: 320, height: 320 }}
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
              <BrandWordmark />
            </Link>
            <h1
              className={cm.cn(
                cm.textSize('3xl'),
                cm.fontWeight('bold'),
                'text-on-surface tracking-tight',
              )}
            >
              {t('login.title', {}, { defaultValue: 'Welcome back, creator.' })}
            </h1>
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
              {t(
                'login.subtitle',
                {},
                { defaultValue: 'Sign in to your storefront and manage payouts.' },
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
              <div className={cm.stack(2)}>
                <label
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'block uppercase tracking-widest text-on-surface-variant',
                  )}
                  htmlFor="email"
                >
                  {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                </label>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center' }),
                    cm.sp('px', 4),
                    'rounded-xl bg-bg-secondary border border-border focus-within:border-primary',
                  )}
                >
                  <span
                    className="material-symbols-outlined text-on-surface-variant"
                    style={{ fontSize: 20 }}
                  >
                    mail
                  </span>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder={t('login.emailPlaceholder', {}, { defaultValue: 'you@studio.co' })}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={cm.cn(
                      cm.w('full'),
                      cm.sp('px', 3),
                      cm.sp('py', 3),
                      cm.fontWeight('medium'),
                      'bg-transparent border-none focus:outline-none text-on-surface placeholder:text-on-surface-variant',
                    )}
                  />
                </div>
              </div>

              <div className={cm.stack(2)}>
                <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                  <label
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'uppercase tracking-widest text-on-surface-variant',
                    )}
                    htmlFor="password"
                  >
                    {t('auth.login.password', {}, { defaultValue: 'Password' })}
                  </label>
                  <Link
                    to="/forgot-password"
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'text-primary-dark hover:text-primary-hover',
                    )}
                  >
                    {t('auth.login.forgotPassword', {}, { defaultValue: 'Forgot password?' })}
                  </Link>
                </div>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center' }),
                    cm.sp('px', 4),
                    'rounded-xl bg-bg-secondary border border-border focus-within:border-primary',
                  )}
                >
                  <span
                    className="material-symbols-outlined text-on-surface-variant"
                    style={{ fontSize: 20 }}
                  >
                    lock
                  </span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={cm.cn(
                      cm.w('full'),
                      cm.sp('px', 3),
                      cm.sp('py', 3),
                      cm.fontWeight('medium'),
                      'bg-transparent border-none focus:outline-none text-on-surface placeholder:text-on-surface-variant',
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword
                        ? t('login.hidePassword', {}, { defaultValue: 'Hide password' })
                        : t('login.showPassword', {}, { defaultValue: 'Show password' })
                    }
                    className={cm.cn(
                      'text-on-surface-variant hover:text-primary transition-colors',
                    )}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.textSize('sm'),
                    'rounded-xl bg-error-light text-error',
                  )}
                >
                  {error.message}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoggingIn}
                className={cm.cn(
                  cm.sp('py', 4),
                  cm.fontWeight('bold'),
                  'rounded-xl text-white shadow-lg shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 transition-all',
                )}
                style={{
                  background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
                }}
              >
                {isLoggingIn
                  ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
                  : t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </button>
            </form>

            <div className={cm.cn(cm.sp('mt', 6))}>
              <OAuthButtons />
            </div>
          </div>

          <p
            className={cm.cn(
              cm.textCenter,
              cm.textSize('sm'),
              cm.sp('mt', 8),
              'text-on-surface-variant',
            )}
          >
            {t('login.noAccount', { appName: APP_NAME }, { defaultValue: 'New to {{appName}}?' })}{' '}
            <Link
              to="/signup"
              className={cm.cn(cm.fontWeight('bold'), 'text-primary-dark hover:text-primary-hover')}
            >
              {t('login.signUpCta', {}, { defaultValue: 'Create your store →' })}
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}

export default Login
