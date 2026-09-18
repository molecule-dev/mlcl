import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthShell } from '../components/AuthShell.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { AuthDivider, AuthField } from './Login.js'

export function Signup() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { status, error, signup } = useSignup()
  // Cross-view auth form persistence via the shared @molecule hook: the
  // non-secret identity fields (email, name) are shared across the auth
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
  const name = authFormFields.name ?? ''
  const setName = (value: string): void => setAuthFormField('name', value)
  const [password, setPassword] = useState('')

  const isSigningUp = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await signup({ email, password, name: name || undefined })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // error is surfaced via the auth hook's own state — no local handling needed
    }
  }

  return (
    <AuthShell
      heading={t('signup.heading', {}, { defaultValue: 'Start studying free' })}
      subtitle={t(
        'signup.subtitle',
        {},
        { defaultValue: 'Five minutes a day. A future-self that remembers.' },
      )}
      footer={
        <p className={cm.textCenter}>
          {t('auth.login.alreadyHaveAccount', {}, { defaultValue: 'Already have an account?' })}{' '}
          <Link to="/login" className={cm.cn('font-bold text-primary hover:underline')}>
            {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
        <AuthField
          id="signup-name"
          type="text"
          label={t('signup.nameLabel', {}, { defaultValue: 'Your name (optional)' })}
          icon="person"
          value={name}
          onChange={setName}
          autoComplete="name"
        />
        <AuthField
          id="signup-email"
          type="email"
          label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          icon="mail"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          required
        />
        <AuthField
          id="signup-password"
          type="password"
          label={t('auth.login.password', {}, { defaultValue: 'Password' })}
          icon="lock"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          required
        />

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
          disabled={isSigningUp}
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 4),
            cm.fontWeight('bold'),
            'rounded-2xl bg-primary text-on-primary text-sm shadow-md hover:scale-[1.01] transition-transform disabled:opacity-50 disabled:hover:scale-100',
          )}
          data-mol-id="signup-submit"
        >
          {isSigningUp
            ? t('common.creatingAccountEllipsis', {}, { defaultValue: 'Creating account…' })
            : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
        </button>
        <p className="text-[11px] text-on-surface-variant text-center">
          {t(
            'signup.legal',
            {},
            { defaultValue: 'By creating an account you agree to our Terms and Privacy Policy.' },
          )}
        </p>
      </form>

      <AuthDivider label={t('signup.orDivider', {}, { defaultValue: 'or sign up with' })} />
      <OAuthButtons />
    </AuthShell>
  )
}
