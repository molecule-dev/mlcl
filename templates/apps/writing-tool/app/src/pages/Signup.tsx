import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { VersalAuthShell } from '../components/VersalAuthShell.js'
import { VersalInput } from '../components/VersalInput.js'

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
      navigate('/library', { replace: true })
    } catch (_error) {
      // Error tracked in hook state — useSignup surfaces it via error prop
    }
  }

  return (
    <VersalAuthShell
      eyebrow={t(
        'signup.eyebrow',
        { appName: APP_NAME },
        { defaultValue: '{{appName}} · A new manuscript' },
      )}
      headline={t(
        'signup.headline',
        { appName: APP_NAME },
        { defaultValue: 'Start writing with {{appName}}.' },
      )}
      subline={t(
        'signup.subline',
        {},
        {
          defaultValue:
            "Free for personal use. Pro for serious drafts. We'll seed your library with a daily-page template so the page is never empty in the morning.",
        },
      )}
      formTitle={t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
      formSubtitle={t(
        'signup.formSubtitle',
        {},
        { defaultValue: "Sixty seconds and you're writing." },
      )}
      footer={
        <p className="text-center text-on-surface-variant">
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
        <VersalInput
          label={t('form.displayName', {}, { defaultValue: 'Display name' })}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          placeholder="Sara Chen"
        />
        <VersalInput
          label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
        <VersalInput
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
            ? t('signup.creating', {}, { defaultValue: 'Creating manuscript…' })
            : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
        </button>
        {error ? (
          <p className={cm.cn('text-sm text-error font-semibold')}>{error.message}</p>
        ) : null}
      </form>
      <OAuthButtons />
    </VersalAuthShell>
  )
}

export default Signup
