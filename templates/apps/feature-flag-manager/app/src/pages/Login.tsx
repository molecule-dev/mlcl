import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_TAGLINE } from '../branding.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { PennantBrandMark } from '../components/PennantBrandMark.js'

const SURFACE_DARK = 'var(--color-background)'
const PANEL = 'var(--color-surface)'
const INPUT_BG = 'var(--color-input-background, var(--color-surface-container-low))'
const BORDER = 'var(--color-border)'

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
      // Error tracked in hook state.
    }
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'relative font-body overflow-hidden',
      )}
      style={{ backgroundColor: SURFACE_DARK, color: 'var(--color-text-code)' }}
      data-mol-id="page-login"
    >
      {/* Subtle grid backdrop — dev-tools texture */}
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
        style={{ background: 'var(--color-primary)', filter: 'blur(140px)', opacity: 0.1 }}
        aria-hidden="true"
      />

      <main
        className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.flex1, cm.sp('p', 6))}
      >
        <div className={cm.cn(cm.w('full'), cm.maxW('md'))}>
          {/* Brand header — §13.7 wordmark variant with pulse pill */}
          <header className={cm.cn('text-center mb-6')}>
            <div className={cm.cn('mb-4')}>
              <div
                className={cm.cn('inline-flex items-center gap-2 px-3 py-1 rounded-full')}
                style={{
                  backgroundColor: 'var(--color-success-banner-bg)',
                  border: '1px solid var(--color-success-banner-border)',
                }}
              >
                <span
                  className={cm.cn('h-1.5 w-1.5 rounded-full animate-pulse')}
                  style={{ backgroundColor: 'var(--color-primary)' }}
                  aria-hidden="true"
                />
                <span
                  className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest')}
                  style={{ color: 'var(--color-text-link)' }}
                >
                  {t('login.statusPill', {}, { defaultValue: 'production · live' })}
                </span>
              </div>
            </div>
            <PennantBrandMark size="lg" />
            <p className={cm.cn('mt-2 font-mono text-xs text-on-surface-variant')}>
              <span className={cm.cn('opacity-60')}>v4.2.0 · </span>
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
            <h2 className={cm.cn('text-lg font-bold text-on-surface')}>
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </h2>

            <form className={cm.cn(cm.flex({ direction: 'col' }), 'gap-5')} onSubmit={handleSubmit}>
              <div>
                <label
                  className={cm.cn(
                    'block text-[10px] font-black uppercase tracking-widest mb-2 font-mono',
                  )}
                  style={{ color: 'var(--color-text-secondary)' }}
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
                    color: 'var(--color-text-code)',
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
                    style={{ color: 'var(--color-text-secondary)' }}
                    htmlFor="password"
                  >
                    {t('auth.login.password', {}, { defaultValue: 'Password' })}
                  </label>
                  <Link
                    to="/forgot-password"
                    className={cm.cn(
                      'inline-flex min-h-[28px] items-center text-xs font-bold transition-opacity hover:opacity-80',
                    )}
                    style={{ color: 'var(--color-text-link)' }}
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
                      backgroundColor: INPUT_BG,
                      border: `1px solid ${BORDER}`,
                      color: 'var(--color-text-code)',
                    }}
                    data-mol-id="login-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className={cm.cn(
                      'absolute right-2 top-1/2 inline-flex min-h-[28px] min-w-[28px] -translate-y-1/2 items-center justify-center transition-colors hover:opacity-80',
                    )}
                    style={{ color: 'var(--color-text-secondary)' }}
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
                    backgroundColor: 'var(--color-error-banner-bg)',
                    border: '1px solid var(--color-error-banner-border)',
                    color: 'var(--color-error-chip-text)',
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
                  backgroundColor: 'var(--color-primary)',
                  color: 'var(--color-on-primary-cta)',
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
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <p>
              {t('auth.login.dontHaveAccount', {}, { defaultValue: "Don't have an account?" })}{' '}
              <Link
                to="/signup"
                className={cm.cn(
                  'inline-flex min-h-[28px] items-center font-bold hover:underline ml-1',
                )}
                style={{ color: 'var(--color-text-link)' }}
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
