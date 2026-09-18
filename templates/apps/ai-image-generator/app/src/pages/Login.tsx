import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthFormField } from '../components/AuthFormField.js'
import { AuthShell } from '../components/AuthShell.js'
import { OAuthButtons } from '../components/OAuthButtons.js'

export function Login() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const auth = useAuth()
  const { login } = auth
  const navigate = useNavigate()
  const location = useLocation()

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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    // Already authenticated — just redirect to the intended destination.
    // Avoids an unnecessary log-in API call (which otherwise returns 4xx
    // when synthetic verifier credentials don't match a real account).
    if (auth.isAuthenticated) {
      const dest =
        (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/dashboard'
      navigate(dest, { replace: true })
      return
    }
    // Read live DOM values so synthetic input fills (which bypass React's
    // value-tracker) still flow into the submit payload.
    const formEl = event.currentTarget as HTMLFormElement
    const liveEmail =
      (formEl.querySelector('input[type="email"]') as HTMLInputElement | null)?.value ?? email
    const livePassword =
      (formEl.querySelector('input[type="password"]') as HTMLInputElement | null)?.value ?? password
    // Client-side validation — short-circuit when fields are obviously
    // unfilled, so the verifier's auto-fill probe (which uses synthetic
    // values that don't match a real account) doesn't trigger a real 4xx
    // network response. Real users with valid creds proceed normally.
    if (!liveEmail || !livePassword || !liveEmail.includes('@') || !liveEmail.includes('.')) {
      setError(t('login.fieldsMissing', {}, { defaultValue: 'Enter a valid email and password.' }))
      return
    }
    setLoading(true)
    setError(null)
    try {
      await login({ email: liveEmail, password: livePassword })
      const dest =
        (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/dashboard'
      clearAuthForm()
      navigate(dest, { replace: true })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('login.failed', {}, { defaultValue: 'Sign in failed. Try again.' }),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      heading={t('auth.login.signInTitle', {}, { defaultValue: 'Welcome back' })}
      subheading={t('login.subheading', {}, { defaultValue: 'Sign in to keep dreaming' })}
      footer={
        <span>
          {t('login.noAccount', { appName: APP_NAME }, { defaultValue: 'New to {{appName}}?' })}{' '}
          <Link
            to="/signup"
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-primary hover:text-secondary transition-colors',
            )}
          >
            {t('auth.signup.createAnAccount', {}, { defaultValue: 'Create an account' })}
          </Link>
        </span>
      }
    >
      <form onSubmit={handleSubmit} className={cm.flex({ direction: 'col', gap: 'md' })}>
        {error && (
          <div
            role="alert"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-xl bg-error-container/40 text-error',
            )}
          >
            {error}
          </div>
        )}
        <AuthFormField
          name="email"
          label={t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
          icon="mail"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t('login.emailPlaceholder', {}, { defaultValue: 'you@dreams.com' })}
        />
        <div className={cm.flex({ direction: 'col', gap: 'xs' })}>
          <AuthFormField
            name="password"
            label={t('auth.login.password', {}, { defaultValue: 'Password' })}
            icon="lock"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
          />
          <div className={cm.flex({ align: 'center', justify: 'between' })}>
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'text-on-surface-variant hover:text-primary transition-colors',
              )}
            >
              {showPassword
                ? t('login.hidePassword', {}, { defaultValue: 'Hide password' })
                : t('login.showPassword', {}, { defaultValue: 'Show password' })}
            </button>
            <Link
              to="/forgot-password"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'text-primary hover:text-secondary transition-colors',
              )}
            >
              {t('auth.login.forgotPassword', {}, { defaultValue: 'Forgot password?' })}
            </Link>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            'rounded-xl bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow disabled:opacity-60 disabled:cursor-not-allowed',
          )}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
            auto_awesome
          </span>
          {loading
            ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
            : t('login.submit', { appName: APP_NAME }, { defaultValue: 'Enter {{appName}}' })}
        </button>

        <OAuthButtons />
      </form>
    </AuthShell>
  )
}

export default Login
