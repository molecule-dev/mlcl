import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { VersoAuthShell } from '../components/VersoAuthShell.js'
import { VersoInput } from '../components/VersoInput.js'

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
      navigate('/home', { replace: true })
    } catch (_error) {
      // Error tracked in hook state; no additional handling needed here
    }
  }

  return (
    <VersoAuthShell
      eyebrow={t(
        'signup.eyebrow',
        { appName: APP_NAME },
        { defaultValue: '{{appName}} · A new chapter' },
      )}
      headline={t('signup.headline', {}, { defaultValue: 'Open a fresh notebook.' })}
      subline={t(
        'signup.subline',
        {},
        {
          defaultValue:
            "Free for personal use. Pro for teams. We'll spin up your first notebook and a daily-note template automatically.",
        },
      )}
      formTitle={t('auth.signup.createYourAccount', {}, { defaultValue: 'Create your account' })}
      formSubtitle={t(
        'signup.formSubtitle',
        {},
        { defaultValue: "Sixty seconds and you're writing." },
      )}
      footer={
        <p className={cm.cn('text-center text-on-surface-variant')}>
          {t('auth.login.alreadyHaveAccount', {}, { defaultValue: 'Already have an account?' })}{' '}
          <Link
            to="/login"
            className={cm.cn('font-bold text-primary hover:opacity-80 transition-opacity')}
          >
            {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(5))}>
        <VersoInput
          label={t('form.displayName', {}, { defaultValue: 'Display name' })}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          placeholder="Sara Chen"
        />
        <VersoInput
          label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
        <VersoInput
          label={t('auth.login.password', {}, { defaultValue: 'Password' })}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
          placeholder="••••••••"
          hint={t('signup.passwordHint', {}, { defaultValue: 'At least 8 characters.' })}
        />
        <button
          type="submit"
          disabled={isSigningUp}
          className={cm.cn(
            cm.sp('py', 3),
            'rounded-xl font-bold text-white shadow-md',
            'bg-gradient-to-br from-primary to-primary-container hover:opacity-95 transition-opacity disabled:opacity-60',
          )}
        >
          {isSigningUp
            ? t('signup.creating', {}, { defaultValue: 'Creating notebook…' })
            : t('signup.submit', {}, { defaultValue: 'Create my notebook' })}
        </button>
        {error ? (
          <p className={cm.cn('text-sm text-error font-semibold')}>{error.message}</p>
        ) : null}
      </form>
      <OAuthButtons />
    </VersoAuthShell>
  )
}

export default Signup
