import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login({ email, password })
      clearAuthForm()
      navigate(from, { replace: true })
    } catch (_error) {
      // Error tracked in hook state via login's own status
    }
  }

  const isLoggingIn = status === 'pending'

  return (
    <AuthShell
      eyebrow={t('auth.login.signInTitle', {}, { defaultValue: 'Welcome back' })}
      title={t('login.title', { appName: APP_NAME }, { defaultValue: 'Sign in to {{appName}}' })}
      subtitle={t('login.subtitle', {}, { defaultValue: 'Pick up where the cash left off.' })}
      footnote={
        <p
          style={{
            fontSize: '13px',
            color: 'var(--mol-color-text-secondary)',
            textAlign: 'center',
          }}
        >
          {t('auth.login.dontHaveAccount', {}, { defaultValue: "Don't have an account?" })}{' '}
          <Link
            to="/signup"
            style={{ color: 'var(--color-sidebar-hover)', fontWeight: 600, textDecoration: 'none' }}
          >
            {t('login.signupLink', {}, { defaultValue: 'Create one' })}
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
        <FieldLabel label={t('auth.workEmail', {}, { defaultValue: 'Work email' })}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            placeholder="you@yourstudio.com"
            aria-label={t('auth.workEmail', {}, { defaultValue: 'Work email' })}
            style={authInputStyle}
          />
        </FieldLabel>
        <FieldLabel
          label={t('auth.login.password', {}, { defaultValue: 'Password' })}
          right={
            <Link
              to="/forgot-password"
              style={{
                fontSize: '12px',
                color: 'var(--color-sidebar-hover)',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              {t('auth.login.forgotShort', {}, { defaultValue: 'Forgot?' })}
            </Link>
          }
        >
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            placeholder="••••••••"
            aria-label={t('auth.login.password', {}, { defaultValue: 'Password' })}
            style={authInputStyle}
          />
        </FieldLabel>
        {error ? (
          <div
            style={{
              padding: '10px 12px',
              backgroundColor: 'var(--color-overdue-light)',
              color: 'var(--color-overdue)',
              fontSize: '13px',
              borderRadius: '10px',
              border: '1px solid var(--color-overdue-light)',
            }}
          >
            {error.message}
          </div>
        ) : null}
        <button
          type="submit"
          disabled={isLoggingIn}
          className={cm.cn(cm.fontWeight('bold'))}
          style={{
            padding: '12px 18px',
            borderRadius: '12px',
            backgroundColor: 'var(--color-accent)',
            color: 'var(--color-sidebar-text-active)',
            fontSize: '14px',
            border: 'none',
            cursor: isLoggingIn ? 'not-allowed' : 'pointer',
            opacity: isLoggingIn ? 0.7 : 1,
            boxShadow: '0 8px 22px var(--color-accent-shadow)',
          }}
        >
          {isLoggingIn
            ? t('login.submitting', {}, { defaultValue: 'Signing you in…' })
            : t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
        </button>
      </form>
      <div style={{ marginTop: '16px' }}>
        <OAuthButtons />
      </div>
    </AuthShell>
  )
}

const authInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: '12px',
  border: '1px solid var(--mol-color-border)',
  backgroundColor: 'var(--mol-color-surface-secondary)',
  fontSize: '14px',
  color: 'var(--mol-color-text)',
  outline: 'none',
}

function FieldLabel({
  label,
  right,
  children,
}: {
  label: string
  right?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--mol-color-text-secondary)',
          fontWeight: 700,
        }}
      >
        <span>{label}</span>
        {right}
      </span>
      {children}
    </label>
  )
}

export default Login
