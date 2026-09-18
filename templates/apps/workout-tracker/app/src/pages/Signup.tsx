import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLegalModals } from '@molecule/app-legal-pages-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { ForjaAuthShell } from '../components/ForjaAuthShell.js'
import { ForjaTextField } from '../components/ForjaTextField.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { loadContent } from '../config.js'

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
  const [mismatch, setMismatch] = useState(false)
  // In-place Privacy/Terms modals (no navigation) — same bonded legal HTML
  // as the standalone /privacy and /terms routes, pre-loaded via loadContent.
  const { openPrivacy, openTerms, modals } = useLegalModals({
    appName: APP_NAME,
    loadContent,
  })

  const isSubmitting = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setMismatch(true)
      return
    }
    setMismatch(false)
    try {
      await signup({ name: `${firstName} ${lastName}`.trim(), email, password })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // Error tracked in hook state — hook surfaces it to the UI
    }
  }

  return (
    <ForjaAuthShell
      heading={t('forja.signup.heading', {}, { defaultValue: 'Forge your account.' })}
      subheading={t(
        'forja.signup.subheading',
        {},
        { defaultValue: 'Start logging sets today — free forever for 5 templates.' },
      )}
      footer={
        <>
          {t('forja.signup.signinPrompt', {}, { defaultValue: 'Already lifting with us?' })}{' '}
          <Link
            to="/login"
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-primary-dark hover:underline ml-1 uppercase tracking-wide',
            )}
          >
            {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
        <div className={cm.cn('grid grid-cols-1 sm:grid-cols-2 gap-4')}>
          <ForjaTextField
            label={t('form.firstName', {}, { defaultValue: 'First name' })}
            autoComplete="given-name"
            required
            placeholder={t('forja.signup.firstNamePlaceholder', {}, { defaultValue: 'Alex' })}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <ForjaTextField
            label={t('form.lastName', {}, { defaultValue: 'Last name' })}
            autoComplete="family-name"
            required
            placeholder={t('forja.signup.lastNamePlaceholder', {}, { defaultValue: 'Iron' })}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
        <ForjaTextField
          label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          type="email"
          autoComplete="email"
          required
          placeholder={t('forja.login.emailPlaceholder', {}, { defaultValue: 'lifter@forja.app' })}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <ForjaTextField
          label={t('auth.login.password', {}, { defaultValue: 'Password' })}
          type="password"
          autoComplete="new-password"
          required
          withPasswordToggle
          placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <ForjaTextField
          label={t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
          type="password"
          autoComplete="new-password"
          required
          withPasswordToggle
          placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        {error || mismatch ? (
          <div
            className={cm.cn(
              cm.sp('p', 3),
              cm.textSize('sm'),
              'rounded-lg bg-error-container text-on-error-container',
            )}
          >
            {mismatch
              ? t(
                  'auth.signup.passwordsDontMatchPeriod',
                  {},
                  { defaultValue: "Passwords don't match." },
                )
              : error?.message}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className={cm.cn(
            cm.fontWeight('bold'),
            'w-full h-[48px] bg-primary hover:bg-primary-light text-on-primary rounded-lg shadow-md shadow-primary/30 active:scale-[0.98] transition-all focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:outline-none mt-2 disabled:opacity-60 disabled:cursor-not-allowed uppercase tracking-wide',
          )}
        >
          {isSubmitting
            ? t('forja.signup.creating', {}, { defaultValue: 'Forging…' })
            : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
        </button>

        <OAuthButtons />
      </form>

      <p className={cm.cn(cm.textCenter, cm.textSize('xs'), 'text-on-surface-variant')}>
        {t('auth.legalConsent', {}, { defaultValue: 'By continuing, you agree to our' })}{' '}
        <button
          type="button"
          onClick={openTerms}
          className={cm.cn(cm.fontWeight('semibold'), 'text-primary-dark hover:underline')}
        >
          {t('nav.terms', {}, { defaultValue: 'Terms' })}
        </button>{' '}
        {t('common.and', {}, { defaultValue: 'and' })}{' '}
        <button
          type="button"
          onClick={openPrivacy}
          className={cm.cn(cm.fontWeight('semibold'), 'text-primary-dark hover:underline')}
        >
          {t('nav.privacy', {}, { defaultValue: 'Privacy' })}
        </button>
      </p>
      {modals}
    </ForjaAuthShell>
  )
}
