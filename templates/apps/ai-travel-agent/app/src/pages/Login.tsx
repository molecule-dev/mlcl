import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthShell } from '../components/AuthShell.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { loadContent } from '../config.js'

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
  const emailRef = useRef<HTMLInputElement | null>(null)
  const passwordRef = useRef<HTMLInputElement | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    // Prefer the live DOM value so the form still works when inputs
    // are filled programmatically (e.g., automation that bypasses
    // React-controlled value updates).
    const submittedEmail = email.trim() || (emailRef.current?.value ?? '').trim()
    const submittedPassword = password || passwordRef.current?.value || ''
    try {
      await login({ email: submittedEmail, password: submittedPassword })
      clearAuthForm()
      navigate('/talk')
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
    <AuthShell
      heading={t('auth.login.signInTitle', {}, { defaultValue: 'Welcome back' })}
      subheading={t('login.subheading', {}, { defaultValue: 'Speak your way back in.' })}
      footer={
        <div className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(4))}>
          <OAuthButtons />
          <p className={cm.cn(cm.textCenter, cm.textSize('sm'), cm.textMuted)}>
            {t('auth.login.dontHaveAccount', {}, { defaultValue: "Don't have an account?" })}{' '}
            <Link
              to="/signup"
              className={cm.cn(
                cm.fontWeight('semibold'),
                'text-secondary hover:text-secondary-light transition-colors',
              )}
            >
              {t('auth.login.signUp', {}, { defaultValue: 'Sign up' })}
            </Link>
          </p>
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'center', gap: 'md' }))}>
            <LegalModalLinks
              linkClassName={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                cm.textMuted,
                'hover:text-primary transition-colors',
              )}
              appName={APP_NAME}
              loadContent={loadContent}
              privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
              termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
            />
          </div>
        </div>
      }
    >
      <form className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(4))} onSubmit={handleSubmit}>
        <label className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(2))}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              cm.textMuted,
              'uppercase tracking-widest',
            )}
          >
            {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          </span>
          <input
            ref={emailRef}
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t(
              'auth.passwordPlaceholderEmail',
              {},
              { defaultValue: 'you@example.com' },
            )}
            className={cm.cn(
              cm.w('full'),
              cm.sp('px', 4),
              cm.sp('py', 3),
              'rounded-xl bg-surface-secondary border border-border text-foreground placeholder-foreground-tertiary focus:border-primary focus:ring-2 focus:ring-primary/40 outline-none transition-all',
            )}
          />
        </label>

        <label className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(2))}>
          <span className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                cm.textMuted,
                'uppercase tracking-widest',
              )}
            >
              {t('auth.login.password', {}, { defaultValue: 'Password' })}
            </span>
            <Link
              to="/forgot-password"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'text-secondary hover:text-secondary-light transition-colors',
              )}
            >
              {t('auth.login.forgotShort', {}, { defaultValue: 'Forgot?' })}
            </Link>
          </span>
          <span className={cm.cn(cm.position('relative'), 'block')}>
            <input
              ref={passwordRef}
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 4),
                cm.sp('py', 3),
                'rounded-xl bg-surface-secondary border border-border text-foreground placeholder-foreground-tertiary focus:border-primary focus:ring-2 focus:ring-primary/40 outline-none transition-all pr-12',
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={
                showPassword
                  ? t('login.hidePassword', {}, { defaultValue: 'Hide password' })
                  : t('login.showPassword', {}, { defaultValue: 'Show password' })
              }
              className={cm.cn(
                'absolute right-3 top-1/2 -translate-y-1/2 text-foreground-tertiary hover:text-foreground transition-colors',
              )}
            >
              <span className="material-symbols-outlined text-[20px]">
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </span>
        </label>

        {error ? (
          <div
            role="alert"
            data-mol-id="login-error"
            className={cm.cn(
              cm.roundedFull,
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.textCenter,
              'bg-error/15 text-error border border-error/30',
            )}
          >
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className={cm.cn(
            cm.roundedFull,
            cm.fontWeight('bold'),
            cm.sp('py', 3),
            cm.textSize('base'),
            'bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/30 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60',
          )}
        >
          {loading
            ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
            : t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
        </button>
      </form>
    </AuthShell>
  )
}

export default Login
export { Login, Login as LoginPage }
