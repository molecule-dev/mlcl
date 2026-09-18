import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthShell } from '../components/AuthShell.js'
import { OAuthButtons } from '../components/OAuthButtons.js'

export function Signup() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { status, error, signup } = useSignup()
  // Cross-view auth form persistence via the shared @molecule hook: the
  // non-secret identity fields (email, firstName, lastName) are shared across the auth
  // views (Login/Signup/Forgot/Reset) and cleared on success. Secrets
  // (password) are deliberately kept in LOCAL state, never shared — see
  // useAuthFormState's docs for the rationale.
  const {
    fields: authFormFields,
    setField: setAuthFormField,
    clear: clearAuthForm,
  } = useAuthFormState()
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const firstName = authFormFields.firstName ?? ''
  const setFirstName = (value: string): void => setAuthFormField('firstName', value)
  const lastName = authFormFields.lastName ?? ''
  const setLastName = (value: string): void => setAuthFormField('lastName', value)
  const [password, setPassword] = useState('')

  const isSigningUp = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const name = `${firstName} ${lastName}`.trim() || undefined
      await signup({ email, password, name })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // Error tracked in hook state via signup's own status
    }
  }

  return (
    <AuthShell
      eyebrow={t('signup.eyebrow', {}, { defaultValue: 'Get paid, faster' })}
      title={t(
        'signup.title',
        { appName: APP_NAME },
        { defaultValue: 'Create your {{appName}} account' },
      )}
      subtitle={t(
        'signup.subtitle',
        {},
        { defaultValue: 'Send your first invoice in under two minutes — no credit card.' },
      )}
      footnote={
        <p
          style={{
            fontSize: '13px',
            color: 'var(--mol-color-text-secondary)',
            textAlign: 'center',
          }}
        >
          {t('auth.login.alreadyHaveAccount', {}, { defaultValue: 'Already have an account?' })}{' '}
          <Link
            to="/login"
            style={{ color: 'var(--color-sidebar-hover)', fontWeight: 600, textDecoration: 'none' }}
          >
            {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <AuthField label={t('form.firstName', {}, { defaultValue: 'First name' })}>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              placeholder="Sara"
              aria-label={t('form.firstName', {}, { defaultValue: 'First name' })}
              style={inputStyle}
            />
          </AuthField>
          <AuthField label={t('form.lastName', {}, { defaultValue: 'Last name' })}>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
              placeholder="Lin"
              aria-label={t('form.lastName', {}, { defaultValue: 'Last name' })}
              style={inputStyle}
            />
          </AuthField>
        </div>
        <AuthField label={t('auth.workEmail', {}, { defaultValue: 'Work email' })}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            placeholder="you@yourstudio.com"
            aria-label={t('auth.workEmail', {}, { defaultValue: 'Work email' })}
            style={inputStyle}
          />
        </AuthField>
        <AuthField label={t('auth.login.password', {}, { defaultValue: 'Password' })}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            placeholder="••••••••"
            aria-label={t('auth.login.password', {}, { defaultValue: 'Password' })}
            style={inputStyle}
          />
        </AuthField>
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
          disabled={isSigningUp}
          className={cm.cn(cm.fontWeight('bold'))}
          style={{
            padding: '12px 18px',
            borderRadius: '12px',
            backgroundColor: 'var(--color-accent)',
            color: 'var(--color-sidebar-text-active)',
            fontSize: '14px',
            border: 'none',
            cursor: isSigningUp ? 'not-allowed' : 'pointer',
            opacity: isSigningUp ? 0.7 : 1,
            boxShadow: '0 8px 22px var(--color-accent-shadow)',
          }}
        >
          {isSigningUp
            ? t('common.creatingAccountEllipsis', {}, { defaultValue: 'Creating account…' })
            : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
        </button>
      </form>
      <div style={{ marginTop: '16px' }}>
        <OAuthButtons />
      </div>
    </AuthShell>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: '12px',
  border: '1px solid var(--mol-color-border)',
  backgroundColor: 'var(--mol-color-surface-secondary)',
  fontSize: '14px',
  color: 'var(--mol-color-text)',
  outline: 'none',
}

function AuthField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <span
        style={{
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--mol-color-text-secondary)',
          fontWeight: 700,
        }}
      >
        {label}
      </span>
      {children}
    </label>
  )
}

export default Signup
