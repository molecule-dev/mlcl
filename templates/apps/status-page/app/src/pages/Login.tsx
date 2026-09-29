import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE, BRAND_COLOR } from '../branding.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { BrandWordmark } from '../components/BrandWordmark.js'

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
      // login rejection is surfaced via the hook's error state
    }
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'relative font-body overflow-hidden',
      )}
      style={{ backgroundColor: 'var(--color-auth-bg)', color: 'var(--mol-color-text)' }}
      data-mol-id="page-login"
    >
      {/* Scan-line / grid backdrop */}
      <div
        className={cm.cn('absolute inset-0 -z-10 pointer-events-none')}
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
        aria-hidden="true"
      />
      {/* Emerald spotlight */}
      <div
        className={cm.cn(
          'absolute top-1/4 left-1/2 -translate-x-1/2 -z-10 w-[60rem] h-[60rem] rounded-full pointer-events-none',
        )}
        style={{ background: BRAND_COLOR, filter: 'blur(140px)', opacity: 0.1 }}
        aria-hidden="true"
      />

      <main
        className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.flex1, cm.sp('p', 6))}
      >
        <div className={cm.cn(cm.w('full'), 'max-w-[440px]')}>
          {/* Brand header — terminal-pill wordmark */}
          <header className={cm.cn('text-center mb-6')}>
            <div className={cm.cn('mb-4')}>
              <div
                className={cm.cn('inline-flex items-center gap-2 px-3 py-1 rounded-full')}
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.10)',
                  border: '1px solid rgba(16, 185, 129, 0.30)',
                }}
              >
                <span
                  className={cm.cn('h-1.5 w-1.5 rounded-full animate-pulse')}
                  style={{ backgroundColor: BRAND_COLOR }}
                  aria-hidden="true"
                />
                <span
                  className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest')}
                  style={{ color: BRAND_COLOR }}
                >
                  {t('login.systemsOperational', {}, { defaultValue: 'all systems operational' })}
                </span>
              </div>
            </div>
            <h1>
              <BrandWordmark as="span" size="lg" />
            </h1>
            <p className={cm.cn('mt-1 font-mono text-xs text-on-surface-variant')}>
              {/* de-emphasis via the muted token alone — an opacity-60 wrapper dropped
                  this to 3.38:1 on the dark canvas (axe fail) */}
              <span>v4.2.0 · </span>
              {APP_TAGLINE}
            </p>
          </header>

          <div
            className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }), cm.sp('p', 8), 'rounded-xl')}
            style={{
              backgroundColor: 'var(--color-auth-panel)',
              border: '1px solid var(--color-auth-border)',
              boxShadow: '0 30px 80px -30px rgba(0, 0, 0, 0.7)',
            }}
          >
            <h2 className={cm.cn('text-lg font-bold')}>
              {t('login.title', { app: APP_NAME }, { defaultValue: 'Sign in to {{app}}' })}
            </h2>

            <form className={cm.cn(cm.flex({ direction: 'col' }), 'gap-5')} onSubmit={handleSubmit}>
              <div>
                <label
                  className={cm.cn(
                    'block text-[10px] font-black uppercase tracking-widest mb-2 font-mono',
                  )}
                  style={{ color: 'var(--color-text-muted)' }}
                  htmlFor="email"
                >
                  {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder={t(
                    'login.emailPlaceholder',
                    {},
                    { defaultValue: 'you@team.example' },
                  )}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('py', 3),
                    cm.sp('px', 4),
                    cm.textSize('sm'),
                    'rounded-md font-mono transition-colors',
                  )}
                  style={{
                    backgroundColor: 'var(--color-auth-input-bg)',
                    border: '1px solid var(--color-auth-border)',
                    color: 'var(--mol-color-text)',
                  }}
                  data-mol-id="login-email"
                />
              </div>

              <div>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('mb', 2),
                  )}
                >
                  <label
                    className={cm.cn(
                      'block text-[10px] font-black uppercase tracking-widest font-mono',
                    )}
                    style={{ color: 'var(--color-text-muted)' }}
                    htmlFor="password"
                  >
                    {t('auth.login.password', {}, { defaultValue: 'Password' })}
                  </label>
                  <Link
                    to="/forgot-password"
                    className={cm.cn('text-xs font-bold transition-opacity hover:opacity-80')}
                    style={{ color: BRAND_COLOR }}
                  >
                    {t('auth.login.forgotShort', {}, { defaultValue: 'Forgot?' })}
                  </Link>
                </div>
                <div className={cm.cn('relative')}>
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
                      cm.sp('py', 3),
                      cm.sp('px', 4),
                      cm.textSize('sm'),
                      'rounded-md font-mono transition-colors pr-12',
                    )}
                    style={{
                      backgroundColor: 'var(--color-auth-input-bg)',
                      border: '1px solid var(--color-auth-border)',
                      color: 'var(--mol-color-text)',
                    }}
                    data-mol-id="login-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className={cm.cn(
                      'absolute right-3 top-1/2 -translate-y-1/2 transition-colors hover:opacity-80',
                    )}
                    style={{ color: 'var(--color-text-muted)' }}
                    aria-label={
                      showPassword
                        ? t('login.hidePassword', {}, { defaultValue: 'Hide password' })
                        : t('login.showPassword', {}, { defaultValue: 'Show password' })
                    }
                  >
                    <span className={cm.cn('material-symbols-outlined text-base')}>
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
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.textSize('sm'),
                    'rounded-md text-center',
                  )}
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.10)',
                    border: '1px solid rgba(239, 68, 68, 0.40)',
                    color: 'var(--color-auth-error-text)',
                  }}
                >
                  {error.message}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoggingIn}
                className={cm.cn(
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  'rounded-md font-mono font-bold transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-60',
                )}
                style={{
                  backgroundColor: BRAND_COLOR,
                  color: 'var(--color-auth-on-primary)',
                  boxShadow: '0 12px 28px -12px rgba(16, 185, 129, 0.6)',
                }}
                data-mol-id="login-submit"
              >
                {isLoggingIn
                  ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
                  : t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </button>
            </form>

            <OAuthButtons />
          </div>

          <footer
            className={cm.cn('mt-6 text-center text-sm')}
            style={{ color: 'var(--color-text-muted)' }}
          >
            <p>
              {t('auth.login.dontHaveAccount', {}, { defaultValue: "Don't have an account?" })}{' '}
              <Link
                to="/signup"
                className={cm.cn('font-bold hover:underline ml-1')}
                style={{ color: BRAND_COLOR }}
              >
                {t('login.signUp', {}, { defaultValue: 'Request access' })}
              </Link>
            </p>
            {/* no opacity wrapper: it dimmed both the muted text (4.15:1) and the
                brand link (4.18:1) below the 4.5:1 axe bar on the dark canvas */}
            <p className={cm.cn('mt-3 font-mono text-[10px] uppercase tracking-widest')}>
              {t('login.publicLink', {}, { defaultValue: 'Or view the' })}{' '}
              <Link to="/" className={cm.cn('hover:underline')} style={{ color: BRAND_COLOR }}>
                {t('login.publicStatus', {}, { defaultValue: 'public status page →' })}
              </Link>
            </p>
          </footer>
        </div>
      </main>
    </div>
  )
}
