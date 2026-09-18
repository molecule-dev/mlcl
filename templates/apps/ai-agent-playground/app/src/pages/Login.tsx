// Phase 1 baseline — verbatim JSX of design-ai-agent-playground-login.html
// Do not hand-edit; Phase 2 will extract sections one at a time.
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
function Login() {
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
      navigate('/dashboard')
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
        cm.flex({ align: 'center', justify: 'center' }),
        cm.minH('screen'),
        'bg-surface-container-lowest text-on-surface font-body relative overflow-hidden bg-terminal-pattern',
      )}
    >
      {/* Ambient Glow Background */}
      <div
        className={cm.cn(
          cm.roundedFull,
          'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 blur-[120px] pointer-events-none',
        )}
      ></div>
      <div className={cm.cn(cm.w('full'), cm.sp('mx', 4), 'max-w-[420px] relative z-10')}>
        {/* Logo Section */}
        <div className={cm.cn(cm.textCenter, cm.sp('mb', 8))}>
          <h1
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('4xl'),
              cm.sp('mb', 2),
              'font-headline tracking-tighter text-on-surface',
            )}
          >
            {t('common.brandName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
          </h1>
          <p
            className={cm.cn(
              cm.textSize('sm'),
              'font-label text-on-surface-variant/70 uppercase tracking-widest',
            )}
          >
            {t('common.tagline', {}, { defaultValue: 'Agent development platform' })}
          </p>
        </div>
        {/* Login Card */}
        <div
          className={cm.cn(
            cm.sp('p', 8),
            'bg-surface-container-low rounded-lg relative border border-outline-variant/15',
          )}
        >
          {/* Glassmorphism subtle overlay */}
          <div
            className={
              'absolute inset-0 bg-surface-variant/5 backdrop-blur-[24px] rounded-lg -z-10 pointer-events-none'
            }
          ></div>
          <form className={cm.stack(5)} onSubmit={handleSubmit}>
            <div className={cm.stack(4)}>
              {/* Email Input */}
              <div>
                <label
                  className={cm.cn(
                    cm.textSize('xs'),
                    'block font-label text-on-surface-variant mb-1.5',
                  )}
                  htmlFor="email"
                >
                  {t('login.emailLabel', {}, { defaultValue: 'Email / Identifier' })}
                </label>
                <input
                  className={cm.cn(
                    cm.w('full'),
                    cm.textSize('sm'),
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'bg-surface-container-lowest text-on-surface font-label rounded-lg border border-outline-variant/15 focus:border-secondary focus:ring-1 focus:ring-secondary focus:outline-none transition-colors placeholder:text-on-surface-variant/40',
                  )}
                  data-mol-id="login-email"
                  id="email"
                  name="email"
                  onChange={(e) => setEmail(e.target.value)}
                  required={true}
                  type="email"
                  value={email}
                  placeholder={t(
                    'auth.passwordPlaceholderEmail',
                    {},
                    { defaultValue: 'you@example.com' },
                  )}
                />
              </div>
              {/* Password Input */}
              <div>
                <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'mb-1.5')}>
                  <label
                    className={cm.cn(cm.textSize('xs'), 'block font-label text-on-surface-variant')}
                    htmlFor="password"
                  >
                    {t('login.passwordLabel', {}, { defaultValue: 'Authentication Token' })}
                  </label>
                  <Link
                    className={
                      'font-label text-xs text-secondary hover:text-secondary-fixed transition-colors'
                    }
                    to="/forgot-password"
                  >
                    {t('login.recover', {}, { defaultValue: 'Recover?' })}
                  </Link>
                </div>
                <div className="relative">
                  <input
                    className={cm.cn(
                      cm.w('full'),
                      cm.textSize('sm'),
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.sp('pr', 10),
                      'bg-surface-container-lowest text-on-surface font-label rounded-lg border border-outline-variant/15 focus:border-secondary focus:ring-1 focus:ring-secondary focus:outline-none transition-colors placeholder:text-on-surface-variant/40',
                    )}
                    data-mol-id="login-password"
                    id="password"
                    name="password"
                    onChange={(e) => setPassword(e.target.value)}
                    required={true}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                  />
                  <button
                    className={cm.cn(
                      cm.flex({ align: 'center' }),
                      cm.sp('pr', 3),
                      'absolute inset-y-0 right-0 text-on-surface-variant/50 hover:text-on-surface transition-colors',
                    )}
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={t(
                      'login.togglePassword',
                      {},
                      { defaultValue: 'Toggle password visibility' },
                    )}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
            {error && (
              <p
                data-mol-id="login-error"
                role="alert"
                className={cm.cn(cm.textSize('xs'), 'text-error font-label')}
              >
                {error}
              </p>
            )}
            {/* Sign In Button */}
            <button
              className={cm.cn(
                cm.w('full'),
                cm.fontWeight('semibold'),
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.flex({ align: 'center', justify: 'center', gap: 2 }),
                'kinetic-gradient text-on-primary-fixed font-headline tracking-tight rounded-lg transition-all',
              )}
              type="submit"
              disabled={loading}
              data-mol-id="login-submit"
            >
              <span>
                {loading
                  ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
                  : t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </span>
              <span className="material-symbols-outlined text-[18px]">login</span>
            </button>
            {/*
        OAuth buttons render only when a provider bond is wired into the
        scaffold (see template.json). They auto-hide otherwise so the form
        never shows a button that can't actually authenticate.
      */}
            <OAuthButtons />
          </form>
        </div>
        {/* Footer */}
        <div className={cm.cn(cm.sp('mt', 8), cm.textCenter)}>
          <p className={cm.cn(cm.textSize('sm'), 'font-body text-on-surface-variant')}>
            {t('login.noAccount', {}, { defaultValue: 'No active protocol?' })}

            <Link
              className={
                'font-label text-secondary hover:text-secondary-fixed transition-colors ml-1'
              }
              to="/signup"
            >
              {t('login.signup', {}, { defaultValue: 'Start building →' })}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
export { Login, Login as LoginPage }
