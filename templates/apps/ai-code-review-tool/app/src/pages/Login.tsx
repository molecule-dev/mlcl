// Refract login — dev-tools cluster auth-page pattern (POLISHED-PATTERN-CATALOG §13)
// Pattern source: api-documentation Login (Prism dark monospace aesthetic),
// recoloured to the Refract violet → cyan palette.
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ACCENT_COLOR, BRAND_COLOR } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { OAuthButtons } from '../components/OAuthButtons.js'

const submitGradient = `linear-gradient(135deg, ${BRAND_COLOR}, ${ACCENT_COLOR})`

const gridBackground = {
  backgroundImage:
    'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
  backgroundSize: '32px 32px',
}

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
      // Error tracked in hook state; the useLogin hook surfaces it via `error`
    }
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'relative font-body overflow-hidden',
      )}
      style={{ backgroundColor: 'var(--color-auth-dark)', color: 'var(--color-auth-text)' }}
    >
      <div className="absolute inset-0 -z-10 pointer-events-none" style={gridBackground} />
      <div
        className={cm.cn(
          'absolute top-1/3 left-1/2 -translate-x-1/2 -z-10 w-[60rem] h-[60rem] rounded-full pointer-events-none',
        )}
        style={{ background: BRAND_COLOR, filter: 'blur(140px)', opacity: 0.16 }}
      />
      <div
        className={cm.cn(
          'absolute bottom-0 right-0 -z-10 w-[40rem] h-[40rem] rounded-full pointer-events-none',
        )}
        style={{ background: ACCENT_COLOR, filter: 'blur(140px)', opacity: 0.1 }}
      />

      <main
        className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.flex1, cm.sp('p', 6))}
      >
        <div className={cm.cn(cm.w('full'), cm.maxW('md'))}>
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'xl' }),
              cm.sp('p', 10),
              'rounded-xl',
            )}
            style={{
              backgroundColor: 'var(--color-auth-panel)',
              border: '1px solid var(--color-auth-border)',
              boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.6)',
            }}
          >
            <AuthBrandHeader
              subtitle={t(
                'login.subtitle',
                {},
                { defaultValue: 'Sign in to your review workspace' },
              )}
            />

            <form className={cm.cn(cm.flex({ direction: 'col' }), 'gap-5')} onSubmit={handleSubmit}>
              <div>
                <label
                  className={cm.cn(
                    cm.fontWeight('semibold'),
                    cm.sp('mb', 2),
                    'block text-[0.6875rem] tracking-[0.05em] font-mono uppercase',
                  )}
                  style={{ color: 'var(--color-auth-muted)' }}
                  htmlFor="email"
                >
                  {t('login.emailLabel', {}, { defaultValue: 'EMAIL' })}
                </label>
                <input
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('py', 4),
                    cm.sp('px', 5),
                    cm.textSize('sm'),
                    'rounded-lg transition-all font-mono',
                  )}
                  style={{
                    backgroundColor: 'var(--color-auth-input)',
                    border: '1px solid var(--color-auth-border)',
                    color: 'var(--color-auth-text)',
                  }}
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder={t(
                    'login.emailPlaceholder',
                    {},
                    { defaultValue: 'developer@example.com' },
                  )}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                      cm.fontWeight('semibold'),
                      'block text-[0.6875rem] tracking-[0.05em] font-mono uppercase',
                    )}
                    style={{ color: 'var(--color-auth-muted)' }}
                    htmlFor="password"
                  >
                    {t('login.passwordLabel', {}, { defaultValue: 'PASSWORD' })}
                  </label>
                  <Link
                    to="/forgot-password"
                    className={cm.cn('text-xs font-bold hover:opacity-80 transition-opacity')}
                    style={{ color: 'var(--color-auth-link)' }}
                  >
                    {t('auth.login.forgotPassword', {}, { defaultValue: 'Forgot password?' })}
                  </Link>
                </div>
                <div className="relative">
                  <input
                    className={cm.cn(
                      cm.w('full'),
                      cm.sp('py', 4),
                      cm.sp('px', 5),
                      cm.textSize('sm'),
                      'rounded-lg transition-all pr-12 font-mono',
                    )}
                    style={{
                      backgroundColor: 'var(--color-auth-input)',
                      border: '1px solid var(--color-auth-border)',
                      color: 'var(--color-auth-text)',
                    }}
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword
                        ? t('login.hidePassword', {}, { defaultValue: 'Hide password' })
                        : t('login.showPassword', {}, { defaultValue: 'Show password' })
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: 'var(--color-auth-muted)' }}
                  >
                    <span className="material-symbols-outlined">
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
                    cm.textCenter,
                    'rounded-lg',
                  )}
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--color-error) 15%, transparent)',
                    color: 'var(--color-on-error-container)',
                    border: '1px solid color-mix(in srgb, var(--color-error) 40%, transparent)',
                  }}
                >
                  {error.message}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoggingIn}
                data-mol-id="login-submit"
                className={cm.cn(
                  cm.sp('py', 4),
                  cm.sp('mt', 2),
                  cm.textSize('base'),
                  cm.fontWeight('bold'),
                  'rounded-lg text-white hover:shadow-lg active:scale-95 transition-all disabled:opacity-60',
                )}
                style={{ background: submitGradient }}
              >
                {isLoggingIn
                  ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
                  : t('login.submit', {}, { defaultValue: 'Sign In' })}
              </button>
            </form>

            <OAuthButtons />
          </div>

          <footer className={cm.cn(cm.sp('mt', 8), cm.textCenter)}>
            <p
              className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}
              style={{ color: 'var(--color-auth-muted)' }}
            >
              {t('auth.login.dontHaveAccount', {}, { defaultValue: "Don't have an account?" })}{' '}
              <Link
                to="/signup"
                className={cm.cn('font-bold hover:underline decoration-2 underline-offset-4 ml-1')}
                style={{ color: 'var(--color-auth-link)' }}
              >
                {t('login.signUp', {}, { defaultValue: 'Sign Up' })}
              </Link>
            </p>
          </footer>
        </div>
      </main>
    </div>
  )
}

export default Login
export { Login as LoginPage }
