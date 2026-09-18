import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { FloatingInput } from '../components/FloatingInput.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { SigilAuthShell } from '../components/SigilAuthShell.js'

export function Login() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/'
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // The user resource's log-in handler accepts an optional
      // `twoFactorToken` alongside the credentials — required once the
      // user enables two-factor auth in Settings → Security.
      const credentials: { email: string; password: string; twoFactorToken?: string } = {
        email,
        password,
      }
      const token = twoFactorToken.trim()
      if (token) credentials.twoFactorToken = token
      await login(credentials)
      clearAuthForm()
      navigate(from, { replace: true })
    } catch (_error) {
      // tracked in hook state
    }
  }

  const isLoggingIn = status === 'pending'

  return (
    <SigilAuthShell
      eyebrow={t('login.eyebrow', {}, { defaultValue: 'Step into the terminal' })}
      heading={t('login.heading', {}, { defaultValue: 'Welcome back, signaller.' })}
      subheading={t(
        'login.subheading',
        {},
        { defaultValue: 'Re-enter the desk and pick up where the markets left you.' },
      )}
      footer={
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'login.noAccountQuestion',
            { appName: APP_NAME },
            { defaultValue: 'New to {{appName}}?' },
          )}{' '}
          <Link
            to="/signup"
            className={cm.cn(cm.fontWeight('bold'), 'text-primary-dark hover:underline')}
          >
            {t('login.signupLink', {}, { defaultValue: 'Open an account →' })}
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className={cm.cn('space-y-4')}>
        <FloatingInput
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          placeholder={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
        />
        <FloatingInput
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          placeholder={t('auth.login.password', {}, { defaultValue: 'Password' })}
        />
        <FloatingInput
          type="text"
          inputMode="numeric"
          value={twoFactorToken}
          onChange={(e) => setTwoFactorToken(e.target.value)}
          autoComplete="one-time-code"
          placeholder={t(
            'login.twoFactorPlaceholder',
            {},
            { defaultValue: 'Two-factor code (if enabled)' },
          )}
        />

        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.textSize('sm'))}>
          <Link
            to="/forgot-password"
            className={cm.cn(cm.fontWeight('bold'), 'text-primary-dark hover:underline')}
          >
            {t('auth.login.forgotPassword', {}, { defaultValue: 'Forgot password?' })}
          </Link>
          <span className="text-on-surface-variant">
            {t('login.secureNote', {}, { defaultValue: '🔒 Encrypted in transit' })}
          </span>
        </div>

        <button
          type="submit"
          disabled={isLoggingIn}
          className={cm.cn(
            'w-full',
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            'rounded-xl bg-primary text-on-primary hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          {isLoggingIn
            ? t('login.signingInCta', {}, { defaultValue: 'Reading the tape…' })
            : t('login.submitCta', {}, { defaultValue: 'Enter the terminal →' })}
        </button>

        {error ? (
          <p className={cm.cn(cm.textSize('sm'), cm.textCenter, 'text-error font-semibold')}>
            {error.message}
          </p>
        ) : null}
      </form>

      {/* The shared OAuthButtons renders its own "or continue with"
          divider and renders nothing when no OAuth providers are
          configured — no extra chrome needed here. */}
      <OAuthButtons />
    </SigilAuthShell>
  )
}
