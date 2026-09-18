import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLegalModals } from '@molecule/app-legal-pages-react'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthShell } from '../components/AuthShell.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { loadContent } from '../config.js'
import { AuthField, AuthInput, FieldLabel, FormErrorMessage, SubmitButton } from './Login.js'

export function Signup() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { register, isAuthenticated } = useAuth()
  const navigate = useNavigate()
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
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  // Privacy/Terms open IN-PLACE modals instead of navigating away — the
  // bonded legal HTML is pre-loaded via loadContent before each modal opens.
  const { openPrivacy, openTerms, modals } = useLegalModals({ appName: APP_NAME, loadContent })
  const legalLinkClass = cm.cn('text-primary font-semibold hover:underline')

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    if (password !== confirmPassword) {
      setError(
        t('auth.signup.passwordsDoNotMatchPeriod', {}, { defaultValue: 'Passwords do not match.' }),
      )
      return
    }
    setSubmitting(true)
    try {
      await register({ email, password, name: `${firstName} ${lastName}`.trim() })
      clearAuthForm()
      navigate('/dashboard')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('signup.failed', {}, { defaultValue: 'Could not create your account.' }),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      heading={t('signup.heading', {}, { defaultValue: 'Request access' })}
      subheading={t(
        'signup.subheading',
        { appName: APP_NAME },
        { defaultValue: 'Join your team on {{appName}} in under a minute.' },
      )}
      footer={
        <p className={cm.cn('text-sm text-on-surface-variant')}>
          {t('auth.login.alreadyHaveAccount', {}, { defaultValue: 'Already have an account?' })}{' '}
          <Link className={cm.cn('text-primary font-semibold hover:underline')} to="/login">
            {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </Link>
        </p>
      }
    >
      <OAuthButtons />
      <form
        onSubmit={handleSubmit}
        data-mol-id="signup-form"
        className={cm.cn(cm.stack(5))}
        noValidate
      >
        <div className={cm.cn(cm.grid({ cols: 2, gap: 4 }))}>
          <AuthField
            id="signup-first-name"
            label={t('form.firstName', {}, { defaultValue: 'First name' })}
            autoComplete="given-name"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            required
          />
          <AuthField
            id="signup-last-name"
            label={t('form.lastName', {}, { defaultValue: 'Last name' })}
            autoComplete="family-name"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            required
          />
        </div>
        <AuthField
          id="signup-email"
          label={t('auth.workEmail', {}, { defaultValue: 'Work email' })}
          type="email"
          autoComplete="email"
          placeholder={t('signup.emailHint', {}, { defaultValue: 'you@yourdomain.com' })}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <div>
          <FieldLabel htmlFor="signup-password">
            {t('auth.login.password', {}, { defaultValue: 'Password' })}
          </FieldLabel>
          <AuthInput
            id="signup-password"
            type="password"
            autoComplete="new-password"
            placeholder={t('auth.passwordMinHint', {}, { defaultValue: 'At least 12 characters' })}
            minLength={12}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>
        <div>
          <FieldLabel htmlFor="signup-confirm">
            {t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
          </FieldLabel>
          <AuthInput
            id="signup-confirm"
            type="password"
            autoComplete="new-password"
            placeholder={t('auth.reenterPasswordHint', {}, { defaultValue: 'Re-enter password' })}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
          />
        </div>
        {error && <FormErrorMessage>{error}</FormErrorMessage>}
        <SubmitButton submitting={submitting}>
          {submitting
            ? t('common.creatingAccountEllipsis', {}, { defaultValue: 'Creating account…' })
            : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
        </SubmitButton>
        <p className={cm.cn('text-xs text-on-surface-variant text-center')}>
          {t(
            'signup.legalPrefix',
            { appName: APP_NAME },
            { defaultValue: 'By creating an account you agree to the {{appName}}' },
          )}{' '}
          <button type="button" onClick={openTerms} className={legalLinkClass}>
            {t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
          </button>{' '}
          {t('signup.and', {}, { defaultValue: 'and' })}{' '}
          <button type="button" onClick={openPrivacy} className={legalLinkClass}>
            {t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
          </button>
          .
        </p>
      </form>
      {modals}
    </AuthShell>
  )
}

export default Signup
