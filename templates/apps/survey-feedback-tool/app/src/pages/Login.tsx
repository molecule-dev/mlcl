import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthShell } from '../components/AuthShell.js'
import { OAuthButtons } from '../components/OAuthButtons.js'

export function Login() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/surveys'
  const { login } = useAuth()
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
      navigate(from, { replace: true })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('login.failed', {}, { defaultValue: 'Login failed. Please try again.' }),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      heading={t('auth.login.signInTitle', {}, { defaultValue: 'Welcome back' })}
      subheading={t(
        'login.subheading',
        {},
        { defaultValue: 'Sign in to keep listening to your audience.' },
      )}
      footer={
        <>
          <span>
            {t('login.noAccount', { app: APP_NAME }, { defaultValue: 'New to {{app}}?' })}
          </span>
          <Link
            to="/signup"
            className={cm.cn(cm.fontWeight('semibold'), 'text-primary hover:underline')}
          >
            {t('login.signUpLink', {}, { defaultValue: 'Start a free trial' })}
          </Link>
        </>
      }
    >
      <form className={cm.cn(cm.flex({ direction: 'col', gap: 4 }))} onSubmit={handleSubmit}>
        {error && (
          <div
            role="alert"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'rounded-md bg-error-light text-[color:var(--color-on-error)]',
            )}
          >
            {error}
          </div>
        )}
        <label className={cm.cn(cm.flex({ direction: 'col', gap: 1 }))}>
          <span
            className={cm.cn(
              cm.fontWeight('semibold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
          </span>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 2 }),
              cm.sp('px', 4),
              'h-12 rounded-md border border-[color:var(--color-border)] bg-surface-secondary focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition-shadow',
            )}
          >
            <span
              className="material-symbols-outlined text-on-surface-variant"
              style={{ fontSize: 18 }}
              aria-hidden="true"
            >
              mail
            </span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={cm.cn(
                cm.flex1,
                cm.sp('p', 0),
                cm.fontWeight('medium'),
                cm.textSize('sm'),
                'bg-transparent border-none focus:outline-none focus:ring-0 text-on-surface placeholder:text-on-surface-variant',
              )}
              placeholder={t(
                'auth.passwordPlaceholderCompanyEmail',
                {},
                { defaultValue: 'you@company.com' },
              )}
            />
          </div>
        </label>
        <label className={cm.cn(cm.flex({ direction: 'col', gap: 1 }))}>
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
            <span
              className={cm.cn(
                cm.fontWeight('semibold'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('auth.login.password', {}, { defaultValue: 'Password' })}
            </span>
            <Link
              to="/forgot-password"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'text-primary hover:underline',
              )}
            >
              {t('auth.login.forgotPassword', {}, { defaultValue: 'Forgot password?' })}
            </Link>
          </div>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 2 }),
              cm.sp('px', 4),
              'h-12 rounded-md border border-[color:var(--color-border)] bg-surface-secondary focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition-shadow',
            )}
          >
            <span
              className="material-symbols-outlined text-on-surface-variant"
              style={{ fontSize: 18 }}
              aria-hidden="true"
            >
              lock
            </span>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={cm.cn(
                cm.flex1,
                cm.sp('p', 0),
                cm.fontWeight('medium'),
                cm.textSize('sm'),
                'bg-transparent border-none focus:outline-none focus:ring-0 text-on-surface',
              )}
              placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className={cm.cn('text-on-surface-variant hover:text-primary transition-colors')}
              aria-label={
                showPassword
                  ? t('login.hidePassword', {}, { defaultValue: 'Hide password' })
                  : t('login.showPassword', {}, { defaultValue: 'Show password' })
              }
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 18 }}
                aria-hidden="true"
              >
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </label>
        <button
          type="submit"
          disabled={loading}
          className={cm.cn(
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'rounded-md bg-gradient-to-r from-primary to-secondary text-white shadow-md hover:shadow-lg hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-60',
          )}
        >
          {loading
            ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
            : t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
        </button>
        <OAuthButtons />
      </form>
    </AuthShell>
  )
}

export default Login
