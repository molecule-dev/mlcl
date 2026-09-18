import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

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

  const isLoggingIn = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login({ email, password })
      clearAuthForm()
      navigate(from, { replace: true })
    } catch (_error) {
      // error is surfaced via the auth hook's own state — no local handling needed
    }
  }

  return (
    <AuthShell
      heading={t('login.heading', {}, { defaultValue: 'Welcome back to your decks' })}
      subtitle={t(
        'login.subtitle',
        {},
        { defaultValue: 'Pick up where you left off — your streak is waiting.' },
      )}
      footer={
        <p className={cm.textCenter}>
          {t('login.signupPrompt', {}, { defaultValue: 'New here?' })}{' '}
          <Link to="/signup" className={cm.cn('font-bold text-primary hover:underline')}>
            {t('login.signupLink', {}, { defaultValue: 'Start studying free' })}
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
        <AuthField
          id="login-email"
          type="email"
          label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          icon="mail"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          required
        />
        <AuthField
          id="login-password"
          type="password"
          label={t('auth.login.password', {}, { defaultValue: 'Password' })}
          icon="lock"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          required
        />

        <div className={cm.flex({ align: 'center', justify: 'between' })}>
          <Link
            to="/forgot-password"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'text-primary hover:underline',
            )}
            data-mol-id="login-forgot"
          >
            {t('auth.login.forgotPassword', {}, { defaultValue: 'Forgot password?' })}
          </Link>
        </div>

        {error && (
          <p
            className={cm.cn(
              cm.sp('p', 3),
              cm.textSize('sm'),
              'rounded-xl bg-error-container/50 text-on-error-container border border-error/30',
            )}
            role="alert"
          >
            {error.message}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoggingIn}
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 4),
            cm.fontWeight('bold'),
            'rounded-2xl bg-primary text-on-primary text-sm shadow-md hover:scale-[1.01] transition-transform disabled:opacity-50 disabled:hover:scale-100',
          )}
          data-mol-id="login-submit"
        >
          {isLoggingIn
            ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
            : t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
        </button>
      </form>

      <AuthDivider label={t('login.orDivider', {}, { defaultValue: 'or continue with' })} />
      <OAuthButtons />
    </AuthShell>
  )
}

interface AuthFieldProps {
  id: string
  type: 'email' | 'password' | 'text'
  label: string
  icon: string
  value: string
  onChange: (v: string) => void
  autoComplete?: string
  required?: boolean
}

function AuthField({
  id,
  type,
  label,
  icon,
  value,
  onChange,
  autoComplete,
  required,
}: AuthFieldProps) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
      <label
        htmlFor={id}
        className="text-[10px] font-black uppercase tracking-[0.25em] text-on-surface-variant"
      >
        {label}
      </label>
      <div className="relative">
        <span
          aria-hidden="true"
          className={cm.cn(
            'material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg pointer-events-none',
          )}
        >
          {icon}
        </span>
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required={required}
          className={cm.cn(
            cm.sp('py', 3),
            'w-full rounded-xl border border-outline-variant bg-surface-container-lowest pl-12 pr-4 text-base text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all',
          )}
        />
      </div>
    </div>
  )
}

function AuthDivider({ label }: { label: string }) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('my', 6))}>
      <span className={cm.cn('h-px flex-1 bg-outline-variant/40')} />
      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant">
        {label}
      </span>
      <span className={cm.cn('h-px flex-1 bg-outline-variant/40')} />
    </div>
  )
}

export { AuthDivider, AuthField }
