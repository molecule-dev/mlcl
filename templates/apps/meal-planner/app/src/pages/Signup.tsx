import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { OAuthButtons } from '../components/OAuthButtons.js'
import { SimmerAuthShell } from '../components/SimmerAuthShell.js'
import { SimmerTextField } from '../components/SimmerTextField.js'

export function Signup() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { status, error, signup } = useSignup()
  const { login } = useLogin()
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
  const [confirmPassword, setConfirmPassword] = useState('')
  const [mismatchError, setMismatchError] = useState<string | null>(null)

  const isSubmitting = status === 'pending'

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    // Read values from the form directly so that programmatic submissions
    // (which may set DOM values without flushing React state) still work.
    const formData = new FormData(e.currentTarget)
    const submittedEmail = (formData.get('email') as string | null) ?? email
    const submittedPassword = (formData.get('password') as string | null) ?? password
    const submittedConfirm = (formData.get('confirmPassword') as string | null) ?? confirmPassword
    const submittedName = (formData.get('name') as string | null) ?? name
    if (submittedPassword !== submittedConfirm) {
      setMismatchError(
        t('auth.signup.passwordsDoNotMatchPeriod', {}, { defaultValue: 'Passwords do not match.' }),
      )
      return
    }
    setMismatchError(null)
    try {
      await signup({
        email: submittedEmail,
        password: submittedPassword,
        name: submittedName,
      } as Parameters<typeof signup>[0])
      clearAuthForm()
      navigate('/onboarding', { replace: true })
      return
    } catch (err) {
      // If signup fails because the email is already taken, try login instead.
      const message = err instanceof Error ? err.message.toLowerCase() : ''
      const isDuplicate =
        message.includes('already') ||
        message.includes('registered') ||
        message.includes('taken') ||
        message.includes('exists')
      if (isDuplicate) {
        try {
          await login({ email: submittedEmail, password: submittedPassword })
          navigate('/plan', { replace: true })
          return
        } catch (_error) {
          // Fall through; the original signup error message will surface.
        }
      }
      // Error tracked in hook state
    }
  }

  return (
    <SimmerAuthShell
      heading={t('auth.signup.createYourAccount', {}, { defaultValue: 'Create your account' })}
      subheading={t(
        'simmer.signup.subheading',
        {},
        { defaultValue: 'Friendly tracking, zero guilt.' },
      )}
      footer={
        <>
          {t('auth.login.alreadyHaveAccount', {}, { defaultValue: 'Already have an account?' })}{' '}
          <Link
            to="/login"
            className={cm.cn(cm.fontWeight('semibold'), 'text-primary hover:underline ml-1')}
          >
            {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
        <SimmerTextField
          label={t('form.fullName', {}, { defaultValue: 'Full name' })}
          type="text"
          name="name"
          autoComplete="name"
          required
          placeholder={t('simmer.signup.namePlaceholder', {}, { defaultValue: 'Your full name' })}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <SimmerTextField
          label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          type="email"
          name="email"
          autoComplete="email"
          required
          placeholder={t('auth.passwordPlaceholderEmail', {}, { defaultValue: 'you@example.com' })}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <SimmerTextField
          label={t('auth.login.password', {}, { defaultValue: 'Password' })}
          type="password"
          name="password"
          autoComplete="new-password"
          required
          placeholder={t(
            'common.atLeast8Characters',
            {},
            { defaultValue: 'At least 8 characters' },
          )}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <SimmerTextField
          label={t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          required
          placeholder={t(
            'simmer.signup.confirmPlaceholder',
            {},
            { defaultValue: 'Re-enter your password' },
          )}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        {mismatchError ? (
          <div
            className={cm.cn(
              cm.sp('p', 3),
              cm.textSize('sm'),
              'rounded-lg bg-warning-container text-on-warning-container',
            )}
          >
            {mismatchError}
          </div>
        ) : null}
        {error ? (
          <div
            className={cm.cn(
              cm.sp('p', 3),
              cm.textSize('sm'),
              'rounded-lg bg-error-container text-on-error-container',
            )}
          >
            {error.message}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className={cm.cn(
            cm.fontWeight('bold'),
            'w-full h-[48px] bg-accent hover:bg-accent/90 text-on-accent rounded-lg shadow-sm shadow-orange-500/20 active:scale-[0.98] transition-all focus:ring-2 focus:ring-offset-2 focus:ring-accent focus:outline-none mt-2 disabled:opacity-60 disabled:cursor-not-allowed',
          )}
        >
          {isSubmitting
            ? t('common.creatingAccountEllipsis', {}, { defaultValue: 'Creating account…' })
            : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
        </button>

        <OAuthButtons />
      </form>
    </SimmerAuthShell>
  )
}
