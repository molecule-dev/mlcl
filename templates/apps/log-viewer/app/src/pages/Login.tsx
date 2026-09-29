import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLegalModals } from '@molecule/app-legal-pages-react'
import { useLogin, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE, BRAND_COLOR } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { loadContent } from '../config.js'

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
  // In-place Privacy/Terms modals (no navigation) — same bonded legal HTML
  // as the standalone /privacy and /terms routes, pre-loaded via loadContent.
  const { openPrivacy, openTerms, modals } = useLegalModals({
    appName: APP_NAME,
    loadContent,
  })

  const isLoggingIn = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login({ email, password })
      clearAuthForm()
      navigate(from, { replace: true })
    } catch (_error) {
      // Error tracked in hook state; no additional logging needed.
    }
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'relative font-body overflow-hidden',
      )}
      style={{
        backgroundColor: 'var(--color-background)',
        color: 'var(--color-severity-debug-light)',
      }}
    >
      {/* Subtle grid backdrop */}
      <div
        className={cm.cn('absolute inset-0 -z-10 pointer-events-none')}
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
        aria-hidden="true"
      />
      {/* Cyan spotlight */}
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
        <div className={cm.cn(cm.w('full'), cm.maxW('md'))}>
          {/* §13.7 brand header — terminal-pill + tracking-tighter wordmark */}
          <header className={cm.cn('text-center mb-6')}>
            <div className={cm.cn('mb-4')}>
              <div
                className={cm.cn('inline-flex items-center gap-2 px-3 py-1 rounded-full')}
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-success) 10%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--color-success) 30%, transparent)',
                }}
              >
                <span
                  className={cm.cn('h-1.5 w-1.5 rounded-full animate-pulse')}
                  style={{ backgroundColor: 'var(--color-live-tail-active)' }}
                  aria-hidden="true"
                />
                <span
                  className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest')}
                  style={{ color: 'var(--color-json-string)' }}
                >
                  {t('login.ingestStatus', {}, { defaultValue: 'ingest healthy' })}
                </span>
              </div>
            </div>
            <h1 className={cm.cn('text-4xl font-extrabold tracking-tighter text-on-surface')}>
              <BrandWordmark as="span" size="lg" />
            </h1>
            <p className={cm.cn('mt-1 font-mono text-xs text-on-surface-variant')}>
              <span className={cm.cn('opacity-60')}>v3.1.0 · </span>
              {APP_TAGLINE}
            </p>
          </header>

          <div
            className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }), cm.sp('p', 8), 'rounded-xl')}
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
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
                    backgroundColor: 'var(--color-input-background)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-severity-debug-light)',
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
                      backgroundColor: 'var(--mol-color-background)',
                      border: '1px solid var(--mol-color-border)',
                      color: 'var(--color-severity-debug-light)',
                    }}
                    data-mol-id="login-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className={cm.cn(
                      'absolute right-3 top-1/2 -translate-y-1/2 transition-colors hover:opacity-80',
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
                    backgroundColor: 'color-mix(in srgb, var(--color-error) 10%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--color-error) 40%, transparent)',
                    color: 'var(--color-error-light)',
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
                  color: 'var(--color-background)',
                  boxShadow:
                    '0 12px 28px -12px color-mix(in srgb, var(--color-primary) 60%, transparent)',
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
                className={cm.cn('font-bold hover:underline ml-1')}
                style={{ color: BRAND_COLOR }}
              >
                {t('login.signUp', {}, { defaultValue: 'Sign up free' })}
              </Link>
            </p>
            <p className={cm.cn(cm.sp('mt', 3), cm.textSize('xs'))}>
              {t('auth.legalConsent', {}, { defaultValue: 'By continuing, you agree to our' })}{' '}
              <button
                type="button"
                onClick={openTerms}
                className={cm.cn('font-bold hover:underline')}
                style={{ color: BRAND_COLOR }}
              >
                {t('nav.terms', {}, { defaultValue: 'Terms' })}
              </button>{' '}
              {t('common.and', {}, { defaultValue: 'and' })}{' '}
              <button
                type="button"
                onClick={openPrivacy}
                className={cm.cn('font-bold hover:underline')}
                style={{ color: BRAND_COLOR }}
              >
                {t('nav.privacy', {}, { defaultValue: 'Privacy' })}
              </button>
            </p>
          </footer>
        </div>
      </main>
      {modals}
    </div>
  )
}
