import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import {
  AuthAlert,
  AuthPasswordField,
  AuthSubmitButton,
  AuthTextField,
} from '../components/AuthFormAtoms.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { SnagrAuthShell } from '../components/SnagrAuthShell.js'

export function Login() {
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
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
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
          : t('login.error', {}, { defaultValue: 'Invalid email or password.' }),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <SnagrAuthShell
      heading={t('login.heading', {}, { defaultValue: 'Welcome back, deal hunter!' })}
      subheading={t('login.subheading', {}, { defaultValue: 'Sign in to snag your next big win.' })}
      footer={
        <p>
          {t('login.noAccount', { app: APP_NAME }, { defaultValue: 'New to {{app}}?' })}{' '}
          <Link
            to="/signup"
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-primary hover:underline underline-offset-4',
            )}
          >
            {t('login.signupCta', {}, { defaultValue: 'Create an account and start saving' })}
          </Link>
        </p>
      }
    >
      <form
        data-mol-id="login-form"
        onSubmit={handleSubmit}
        className={cm.cn(cm.flex({ direction: 'col' }), 'gap-5')}
      >
        {error && <AuthAlert tone="error">{error}</AuthAlert>}

        <AuthTextField
          id="email"
          label={t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
          value={email}
          onChange={setEmail}
          icon="mail"
          type="email"
          autoComplete="email"
          placeholder={t('auth.passwordPlaceholderEmail', {}, { defaultValue: 'you@example.com' })}
        />
        <AuthPasswordField
          id="password"
          label={t('auth.login.password', {}, { defaultValue: 'Password' })}
          value={password}
          onChange={setPassword}
          show={showPassword}
          onToggleShow={() => setShowPassword((v) => !v)}
        />

        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('pt', 1))}>
          <label
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.textSize('sm'),
              'cursor-pointer text-on-surface-variant',
            )}
          >
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className={cm.cn(
                'h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary/30',
              )}
            />
            {t('auth.login.rememberMe', {}, { defaultValue: 'Remember me' })}
          </label>
          <Link
            to="/forgot-password"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'text-primary hover:underline',
            )}
          >
            {t('auth.login.forgotPassword', {}, { defaultValue: 'Forgot password?' })}
          </Link>
        </div>

        <AuthSubmitButton
          loading={loading}
          loadingLabel={t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })}
          label={t('login.submit', {}, { defaultValue: 'Sign in to Snagr' })}
        />
      </form>

      <OAuthButtons />
    </SnagrAuthShell>
  )
}
