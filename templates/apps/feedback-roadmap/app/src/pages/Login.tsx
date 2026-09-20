import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import type { LoginCredentials } from '@molecule/app-auth'
import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthShell } from '../components/AuthShell.js'
import { OAuthButtons } from '../components/OAuthButtons.js'

export function Login() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/boards'
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
  const [twoFactorToken, setTwoFactorToken] = useState('')
  const [twoFactorRequired, setTwoFactorRequired] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Forward the TOTP code to the user-resource log-in handler, which verifies
    // it via @molecule/api-two-factor when the account has 2FA enabled.
    const code = twoFactorToken.trim()
    const credentials: LoginCredentials & { twoFactorToken?: string } = { email, password }
    if (code) credentials.twoFactorToken = code
    try {
      const result = await login(credentials)
      // The handler returns 206 { twoFactorRequired: true } (no user/token) when
      // the account has 2FA enabled but no valid code was supplied yet — reveal
      // the code field and keep the user here instead of navigating.
      const r = result as { accessToken?: string; user?: unknown }
      if (!r.accessToken && !r.user) {
        setTwoFactorRequired(true)
        return
      }
      clearAuthForm()
      navigate(from, { replace: true })
    } catch (_error) {
      // error state is tracked and surfaced by the login hook
    }
  }

  const isLoggingIn = status === 'pending'

  return (
    <AuthShell
      eyebrow={t('auth.login.signInTitle', {}, { defaultValue: 'Welcome back' })}
      heading={t(
        'login.heading',
        { appName: APP_NAME },
        { defaultValue: 'Sign in to {{appName}}' },
      )}
      description={t(
        'login.description',
        {},
        { defaultValue: 'Pick up where the conversation left off.' },
      )}
      footer={
        <span>
          {t('login.noAccount', {}, { defaultValue: 'New here?' })}{' '}
          <Link to="/signup" className={cm.cn('font-semibold text-primary hover:underline')}>
            {t('auth.signup.createYourAccount', {}, { defaultValue: 'Create your account' })}
          </Link>
        </span>
      }
    >
      <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
        <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <span
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.textSize('xs'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            placeholder={t(
              'auth.passwordPlaceholderEmail',
              {},
              { defaultValue: 'you@example.com' },
            )}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('base'),
              'rounded-lg border border-outline-variant/60 bg-surface text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
            )}
          />
        </label>

        <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.fontWeight('semibold'),
              cm.textSize('xs'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('auth.login.password', {}, { defaultValue: 'Password' })}
            <Link
              to="/forgot-password"
              className={cm.cn('text-primary hover:underline normal-case tracking-normal text-xs')}
            >
              {t('auth.login.forgotPassword', {}, { defaultValue: 'Forgot password?' })}
            </Link>
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            placeholder={t('login.passwordPlaceholder', {}, { defaultValue: 'Your password' })}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('base'),
              'rounded-lg border border-outline-variant/60 bg-surface text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
            )}
          />
        </label>

        <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <span
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.textSize('xs'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {twoFactorRequired
              ? t('login.twoFactorRequiredLabel', {}, { defaultValue: 'Enter your 2FA code' })
              : t('login.twoFactorLabel', {}, { defaultValue: '2FA code (optional)' })}
          </span>
          <input
            type="text"
            inputMode="numeric"
            value={twoFactorToken}
            onChange={(e) => setTwoFactorToken(e.target.value)}
            autoComplete="one-time-code"
            placeholder={t('login.twoFactorPlaceholder', {}, { defaultValue: '6-digit code' })}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('base'),
              'rounded-lg border border-outline-variant/60 bg-surface text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
            )}
          />
          {twoFactorRequired && (
            <span className={cm.cn(cm.textSize('xs'), 'normal-case text-on-surface-variant')}>
              {t(
                'login.twoFactorRequiredHint',
                {},
                {
                  defaultValue:
                    'This account has two-factor authentication enabled. Enter the 6-digit code from your authenticator app to continue.',
                },
              )}
            </span>
          )}
        </label>

        {error && (
          <div
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              cm.sp('p', 3),
              'rounded-lg bg-error-container/40 text-on-error-container border border-error/40',
            )}
            role="alert"
          >
            {error.message}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoggingIn}
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            cm.sp('px', 5),
            cm.sp('py', 3),
            'rounded-full bg-primary text-on-primary disabled:opacity-60 hover:bg-primary-active transition-colors',
          )}
        >
          {isLoggingIn
            ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
            : t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
        </button>
      </form>

      <div className={cm.cn(cm.sp('mt', 2))}>
        <OAuthButtons />
      </div>
    </AuthShell>
  )
}

export default Login
