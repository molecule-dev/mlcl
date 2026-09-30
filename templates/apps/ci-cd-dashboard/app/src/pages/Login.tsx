import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_TAGLINE, BRAND_COLOR } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'
import { OAuthButtons } from '../components/OAuthButtons.js'

const SURFACE_DARK = 'var(--color-background)'
const PANEL = 'var(--color-surface)'
const INPUT_BG = 'var(--color-surface-container)'
const BORDER = 'var(--color-border)'

export function Login() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/pipelines'
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
      // Error tracked in hook state; no additional handling needed.
    }
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'relative font-body overflow-hidden',
      )}
      style={{ backgroundColor: SURFACE_DARK, color: 'var(--color-on-surface)' }}
    >
      {/* Subtle grid backdrop — dev-tools texture */}
      <div
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
        aria-hidden="true"
      />
      {/* Emerald spotlight */}
      <div
        className={
          'absolute top-1/4 left-1/2 -translate-x-1/2 -z-10 w-[60rem] h-[60rem] rounded-full pointer-events-none'
        }
        style={{ background: BRAND_COLOR, filter: 'blur(140px)', opacity: 0.1 }}
        aria-hidden="true"
      />

      <main
        className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.flex1, cm.sp('p', 6))}
      >
        <div className={cm.cn(cm.w('full'), cm.maxW('md'))}>
          {/* Brand header — §13.7 wordmark variant with terminal pill */}
          <header className={'text-center mb-6'}>
            <div className={'mb-4'}>
              <div
                className={'inline-flex items-center gap-2 px-3 py-1 rounded-full'}
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.10)',
                  border: '1px solid rgba(16, 185, 129, 0.30)',
                }}
              >
                <span
                  className={'h-1.5 w-1.5 rounded-full animate-pulse'}
                  style={{ backgroundColor: BRAND_COLOR }}
                  aria-hidden="true"
                />
                <span
                  className="font-mono text-[10px] font-black uppercase tracking-widest"
                  style={{ color: BRAND_COLOR }}
                >
                  {t('login.runnerStatus', {}, { defaultValue: 'runners online' })}
                </span>
              </div>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white">
              <BrandWordmark as="span" size="hero" layout="stacked" invert />
            </h1>
            <p className={'mt-1 font-mono text-xs text-on-surface-variant'}>
              <span>v4.2.0 · </span>
              {APP_TAGLINE}
            </p>
          </header>

          <div
            className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }), cm.sp('p', 8), 'rounded-xl')}
            style={{
              backgroundColor: PANEL,
              border: `1px solid ${BORDER}`,
              boxShadow: '0 30px 80px -30px rgba(0, 0, 0, 0.7)',
            }}
          >
            <h2 className={'text-lg font-bold text-white'}>
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </h2>

            <form className={cm.cn(cm.flex({ direction: 'col' }), 'gap-5')} onSubmit={handleSubmit}>
              <div>
                <label
                  className={
                    'block text-[10px] font-black uppercase tracking-widest mb-2 font-mono'
                  }
                  style={{ color: 'var(--color-log-info)' }}
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
                    'auth.passwordPlaceholderEmail',
                    {},
                    { defaultValue: 'you@example.com' },
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
                    backgroundColor: INPUT_BG,
                    border: `1px solid ${BORDER}`,
                    color: 'var(--color-on-surface)',
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
                    className="block text-[10px] font-black uppercase tracking-widest font-mono"
                    style={{ color: 'var(--color-log-info)' }}
                    htmlFor="password"
                  >
                    {t('auth.login.password', {}, { defaultValue: 'Password' })}
                  </label>
                  <Link
                    to="/forgot-password"
                    className={'text-xs font-bold transition-opacity hover:opacity-80'}
                    style={{ color: BRAND_COLOR }}
                  >
                    {t('auth.login.forgotShort', {}, { defaultValue: 'Forgot?' })}
                  </Link>
                </div>
                <div className="relative">
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
                      backgroundColor: INPUT_BG,
                      border: `1px solid ${BORDER}`,
                      color: 'var(--color-on-surface)',
                    }}
                    data-mol-id="login-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className={
                      'absolute right-3 top-1/2 -translate-y-1/2 transition-colors hover:opacity-80'
                    }
                    style={{ color: 'var(--color-log-info)' }}
                    aria-label={
                      showPassword
                        ? t('login.hidePassword', {}, { defaultValue: 'Hide password' })
                        : t('login.showPassword', {}, { defaultValue: 'Show password' })
                    }
                  >
                    <span className={'material-symbols-outlined text-base'}>
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
                    color: 'var(--color-error)',
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
                  color: 'var(--color-on-primary)',
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

          <footer className={'mt-6 text-center text-sm'} style={{ color: 'var(--color-log-info)' }}>
            <p>
              {t('auth.login.dontHaveAccount', {}, { defaultValue: "Don't have an account?" })}{' '}
              <Link
                to="/signup"
                className={'font-bold hover:underline ml-1'}
                style={{ color: BRAND_COLOR }}
              >
                {t('login.signUp', {}, { defaultValue: 'Sign up free' })}
              </Link>
            </p>
          </footer>
        </div>
      </main>
    </div>
  )
}
