import { useState } from 'react'
import { useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthShell } from '../components/AuthShell.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { FormField } from './Login.js'

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await signup({ email, password, name: name || undefined })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // signup error state from useSignup surfaces this to the UI
    }
  }

  return (
    <AuthShell
      heading={t(
        'signup.heading',
        { appName: APP_NAME },
        { defaultValue: 'Create your {{appName}} team' },
      )}
      subheading={t(
        'signup.subheading',
        {},
        { defaultValue: 'Pick, pack, and ship from one console — within a day.' },
      )}
      bottomLinkText={t(
        'auth.login.alreadyHaveAccount',
        {},
        { defaultValue: 'Already have an account?' },
      )}
      bottomLinkLabel={t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
      bottomLinkTo="/login"
    >
      <form onSubmit={handleSubmit} className={cm.cn(cm.w('full'), cm.stack(5))}>
        <FormField
          icon="badge"
          label={t('auth.signup.name', {}, { defaultValue: 'Your name' })}
          type="text"
          autoComplete="name"
          value={name}
          onChange={setName}
          placeholder="Alex Carter"
        />
        <FormField
          icon="alternate_email"
          label={t('auth.workEmail', {}, { defaultValue: 'Work email' })}
          type="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
          placeholder="ops@yourwarehouse.com"
          required
        />
        <FormField
          icon="lock"
          label={t('auth.login.password', {}, { defaultValue: 'Password' })}
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          placeholder={t(
            'auth.signup.passwordHint',
            {},
            { defaultValue: 'At least 12 characters' },
          )}
          required
        />

        {error && (
          <div
            role="alert"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'rounded-lg bg-error-container text-on-error-container border border-error/20',
            )}
          >
            {error.message}
          </div>
        )}

        <button
          type="submit"
          disabled={isSigningUp}
          className={cm.cn(
            cm.w('full'),
            cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
            cm.h(12),
            cm.fontWeight('bold'),
            'rounded-xl bg-gradient-to-br from-primary to-primary-dark text-on-primary shadow-lg shadow-primary/30 hover:opacity-95 active:scale-[0.98] disabled:opacity-60 transition-all',
          )}
        >
          {isSigningUp
            ? t('common.creatingAccountEllipsis', {}, { defaultValue: 'Creating account…' })
            : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
          <span
            className={cm.cn('material-symbols-outlined text-[18px]')}
            data-icon="arrow_forward"
          >
            arrow_forward
          </span>
        </button>
      </form>

      <OAuthButtons />
    </AuthShell>
  )
}

export default Signup
