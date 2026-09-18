import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { VersalAuthShell } from '../components/VersalAuthShell.js'
import { VersalInput } from '../components/VersalInput.js'

export function Login() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/library'
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

  const isLoggingIn = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login({ email, password })
      clearAuthForm()
      navigate(from, { replace: true })
    } catch (_error) {
      // Error tracked in hook state — useLogin surfaces it via error prop
    }
  }

  return (
    <VersalAuthShell
      eyebrow={t(
        'login.eyebrow',
        { appName: APP_NAME },
        { defaultValue: 'Welcome back to {{appName}}' },
      )}
      headline={t('login.headline', {}, { defaultValue: 'Pick up the line you set down.' })}
      subline={t(
        'login.subline',
        {},
        {
          defaultValue:
            'Your manuscripts, daily pages, and last cursor position are right where you left them.',
        },
      )}
      formTitle={t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
      formSubtitle={t(
        'login.formSubtitle',
        {},
        { defaultValue: 'Use your email or any connected provider.' },
      )}
      footer={
        <p className="text-center text-on-surface-variant">
          {t('auth.login.dontHaveAccount', {}, { defaultValue: "Don't have an account?" })}{' '}
          <Link
            to="/signup"
            className={cm.cn('font-bold text-primary hover:opacity-80 transition-opacity')}
          >
            {t('login.signupLink', {}, { defaultValue: 'Create one' })}
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(5))}>
        <VersalInput
          label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
        <VersalInput
          label={t('auth.login.password', {}, { defaultValue: 'Password' })}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          placeholder="••••••••"
        />
        <div className={cm.flex({ align: 'center', justify: 'end' })}>
          <Link
            to="/forgot-password"
            className={cm.cn('text-xs font-bold text-primary hover:opacity-80 transition-opacity')}
          >
            {t('auth.login.forgotPassword', {}, { defaultValue: 'Forgot password?' })}
          </Link>
        </div>
        <button
          type="submit"
          disabled={isLoggingIn}
          className={cm.cn(
            cm.sp('py', 3),
            'rounded-xl font-bold text-white shadow-md',
            'bg-gradient-to-br from-primary to-primary-container hover:opacity-95 transition-opacity disabled:opacity-60',
          )}
        >
          {isLoggingIn
            ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
            : t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
        </button>
        {error ? (
          <p className={cm.cn('text-sm text-error font-semibold')}>{error.message}</p>
        ) : null}
      </form>
      <OAuthButtons />
    </VersalAuthShell>
  )
}

export default Login
