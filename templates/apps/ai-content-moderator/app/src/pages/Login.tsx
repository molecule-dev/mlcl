import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthShell } from '../components/AuthShell.js'
import { OAuthButtons } from '../components/OAuthButtons.js'

export function Login() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { login, isAuthenticated } = useAuth()
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
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true })
  }, [isAuthenticated, navigate])

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login({ email, password })
      clearAuthForm()
      navigate('/dashboard')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('login.failed', {}, { defaultValue: 'Sign in failed. Check your credentials.' }),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      heading={t('auth.login.signInTitle', {}, { defaultValue: 'Welcome back' })}
      subheading={t('login.subheading', {}, { defaultValue: 'Sign in to the moderation console' })}
      footer={
        <p className={cm.cn('text-sm text-on-surface-variant')}>
          {t('login.noAccount', {}, { defaultValue: 'Need access?' })}{' '}
          <Link className={cm.cn('text-primary font-semibold hover:underline')} to="/signup">
            {t('auth.signup.createAnAccount', {}, { defaultValue: 'Create an account' })}
          </Link>
        </p>
      }
    >
      <OAuthButtons />
      <form
        onSubmit={handleSubmit}
        data-mol-id="login-form"
        className={cm.cn(cm.stack(5))}
        noValidate
      >
        <AuthField
          id="login-email"
          label={t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
          type="email"
          autoComplete="email"
          placeholder={t('login.emailHint', {}, { defaultValue: 'you@yourdomain.com' })}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <div>
          <div className={cm.cn(cm.flex({ justify: 'between', align: 'center' }), cm.sp('mb', 2))}>
            <FieldLabel htmlFor="login-password">
              {t('auth.login.password', {}, { defaultValue: 'Password' })}
            </FieldLabel>
            <Link
              to="/forgot-password"
              className={cm.cn('text-xs font-semibold text-primary hover:underline')}
            >
              {t('auth.login.forgotPassword', {}, { defaultValue: 'Forgot password?' })}
            </Link>
          </div>
          <AuthInput
            id="login-password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>
        {error && <FormErrorMessage>{error}</FormErrorMessage>}
        <SubmitButton submitting={submitting}>
          {submitting
            ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
            : t('login.submit', {}, { defaultValue: 'Sign In' })}
        </SubmitButton>
      </form>
    </AuthShell>
  )
}

interface AuthFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  id: string
}

function AuthField({ label, id, ...inputProps }: AuthFieldProps) {
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <AuthInput id={id} {...inputProps} />
    </div>
  )
}

function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor: string }) {
  const cm = getClassMap()
  return (
    <label
      htmlFor={htmlFor}
      className={cm.cn(
        'block text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-2',
      )}
    >
      {children}
    </label>
  )
}

function AuthInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const cm = getClassMap()
  return (
    <input
      {...props}
      className={cm.cn(
        'w-full bg-surface-container-low border-0 border-b-2 border-transparent focus:border-primary focus:outline-none text-on-surface text-base px-4 py-3 rounded-lg transition-colors auth-input-hint',
      )}
    />
  )
}

function FormErrorMessage({ children }: { children: React.ReactNode }) {
  const cm = getClassMap()
  return (
    <div
      role="alert"
      className={cm.cn(
        'rounded-lg bg-error-container/40 border border-error/40 text-on-error-container px-4 py-3 text-sm',
      )}
    >
      {children}
    </div>
  )
}

function SubmitButton({
  submitting,
  children,
}: {
  submitting: boolean
  children: React.ReactNode
}) {
  const cm = getClassMap()
  return (
    <button
      type="submit"
      disabled={submitting}
      className={cm.cn(
        'w-full bg-gradient-to-br from-primary to-primary-container text-white font-bold text-sm uppercase tracking-wide px-6 py-4 rounded-lg hover:shadow-[0_8px_16px_rgba(249,115,22,0.2)] transition-all mt-2 disabled:opacity-60 disabled:cursor-not-allowed',
      )}
    >
      {children}
    </button>
  )
}

export { AuthField, AuthInput, FieldLabel, FormErrorMessage, SubmitButton }
export default Login
