import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthInputField } from '../components/AuthInputField.js'
import { AuthShell } from '../components/AuthShell.js'
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
      // Error is tracked in hook state via login; no additional handling needed
    }
  }

  return (
    <AuthShell
      subtitle={t('login.tagline', {}, { defaultValue: 'Welcome back. Compose with confidence.' })}
    >
      <form className={cm.cn(cm.flex({ direction: 'col' }), 'gap-6')} onSubmit={handleSubmit}>
        <AuthInputField
          id="email"
          type="email"
          autoComplete="email"
          required
          icon="mail"
          label={t('login.emailLabel', {}, { defaultValue: 'Email Address' })}
          placeholder={t('auth.passwordPlaceholderEmail', {}, { defaultValue: 'you@example.com' })}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div>
          <div className={cm.flex({ align: 'center', justify: 'between' })}>
            <span
              className={cm.cn(
                'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1',
              )}
            >
              {t('auth.login.password', {}, { defaultValue: 'Password' })}
            </span>
            <Link
              to="/forgot-password"
              className={cm.cn(cm.textSize('xs'), 'font-bold text-primary hover:opacity-80')}
            >
              {t('auth.login.forgotPassword', {}, { defaultValue: 'Forgot password?' })}
            </Link>
          </div>
          <div className={cm.sp('mt', 2)}>
            <AuthInputField
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              icon="lock"
              label=""
              placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={
                    showPassword
                      ? t('login.hidePassword', {}, { defaultValue: 'Hide password' })
                      : t('login.showPassword', {}, { defaultValue: 'Show password' })
                  }
                  className={cm.cn('text-on-surface-variant hover:text-primary transition-colors')}
                >
                  <span className={cm.cn('material-symbols-outlined text-xl')} aria-hidden="true">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              }
            />
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
              'bg-error-container text-on-error-container rounded-xl',
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
            cm.roundedFull,
            cm.textSize('base'),
            cm.fontWeight('bold'),
            'text-white hover:shadow-lg active:scale-95 transition-all disabled:opacity-60',
          )}
          style={{
            background:
              'linear-gradient(135deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 70%, #a78bfa))',
            boxShadow: '0 8px 24px color-mix(in srgb, var(--color-primary) 28%, transparent)',
          }}
        >
          {isLoggingIn
            ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
            : t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
        </button>
      </form>

      <OAuthButtons />

      <p
        className={cm.cn(
          cm.textSize('sm'),
          cm.fontWeight('medium'),
          cm.textCenter,
          'text-on-surface-variant',
        )}
      >
        {t('login.noAccount', { app: APP_NAME }, { defaultValue: `New to ${APP_NAME}?` })}{' '}
        <Link
          to="/signup"
          className={cm.cn(
            'font-bold text-primary hover:underline decoration-2 underline-offset-4 ml-1',
          )}
        >
          {t('login.signUp', {}, { defaultValue: 'Start writing' })}
        </Link>
      </p>
    </AuthShell>
  )
}

export default Login
export { Login as LoginPage }
