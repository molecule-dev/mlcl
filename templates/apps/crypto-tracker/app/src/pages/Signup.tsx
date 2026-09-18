import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { FloatingInput } from '../components/FloatingInput.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { SigilAuthShell } from '../components/SigilAuthShell.js'

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
  const [confirmPassword, setConfirmPassword] = useState('')

  const isSigningUp = status === 'pending'
  const passwordsMismatch = !!confirmPassword && password !== confirmPassword

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordsMismatch) return
    try {
      const fullName = [firstName, lastName].filter(Boolean).join(' ').trim()
      await signup({ email, password, name: fullName || undefined })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // tracked in hook state
    }
  }

  return (
    <SigilAuthShell
      eyebrow={t('signup.eyebrow', {}, { defaultValue: 'Open a terminal' })}
      heading={t(
        'signup.heading',
        { appName: APP_NAME },
        { defaultValue: 'Create your {{appName}}' },
      )}
      subheading={t(
        'signup.subheading',
        {},
        { defaultValue: 'Track every coin, ward off every miss. Free to start.' },
      )}
      footer={
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('auth.login.alreadyHaveAccount', {}, { defaultValue: 'Already have an account?' })}{' '}
          <Link
            to="/login"
            className={cm.cn(cm.fontWeight('bold'), 'text-primary-dark hover:underline')}
          >
            {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className={cm.cn('space-y-4')}>
        <div className={cm.cn(cm.grid({ cols: 2, gap: 'sm' }))}>
          <FloatingInput
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoComplete="given-name"
            placeholder={t('form.firstName', {}, { defaultValue: 'First name' })}
            required
          />
          <FloatingInput
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            autoComplete="family-name"
            placeholder={t('form.lastName', {}, { defaultValue: 'Last name' })}
            required
          />
        </div>
        <FloatingInput
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          placeholder={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
        />
        <FloatingInput
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
          placeholder={t('auth.login.password', {}, { defaultValue: 'Password' })}
        />
        <FloatingInput
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          required
          placeholder={t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
        />

        {passwordsMismatch ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-error')}>
            {t(
              'auth.signup.passwordsDoNotMatchPeriod',
              {},
              { defaultValue: 'Passwords do not match.' },
            )}
          </p>
        ) : null}

        {error ? (
          <p
            className={cm.cn(cm.sp('p', 3), cm.textSize('sm'), 'rounded-md bg-error/10 text-error')}
          >
            {error.message}
          </p>
        ) : null}

        <Button
          type="submit"
          size="lg"
          color="primary"
          disabled={isSigningUp || passwordsMismatch}
          className={cm.cn(cm.w('full'))}
        >
          {isSigningUp
            ? t('signup.creating', {}, { defaultValue: 'Opening your terminal…' })
            : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
        </Button>
      </form>

      <OAuthButtons />
    </SigilAuthShell>
  )
}
