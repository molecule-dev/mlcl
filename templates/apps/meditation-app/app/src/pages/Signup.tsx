import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { FloatingInput } from '../components/FloatingInput.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { StillpointAuthShell } from '../components/StillpointAuthShell.js'
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

  const isSubmitting = status === 'pending'
  const passwordsMatch = password === confirmPassword || confirmPassword.length === 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordsMatch) return
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim() || undefined
    try {
      await signup({ email, password, name: fullName })
      clearAuthForm()
      navigate('/home', { replace: true })
    } catch (_error) {
      // Error tracked in hook state via signupError from useAuth
    }
  }

  return (
    <StillpointAuthShell
      heading={t('auth.signup.createYourAccount', {}, { defaultValue: 'Create your account' })}
      subheading={t(
        'stillpoint.signup.subheading',
        {},
        { defaultValue: '7-day free trial — no credit card.' },
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
        <div className={cm.cn('grid grid-cols-1 sm:grid-cols-2 gap-3')}>
          <FloatingInput
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoComplete="given-name"
            required
            placeholder={t('form.firstName', {}, { defaultValue: 'First name' })}
          />
          <FloatingInput
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            autoComplete="family-name"
            placeholder={t('form.lastName', {}, { defaultValue: 'Last name' })}
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

        {!passwordsMatch ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-error font-medium')}>
            {t(
              'auth.signup.passwordsDontMatchPeriod',
              {},
              { defaultValue: "Passwords don't match." },
            )}
          </p>
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
          disabled={isSubmitting || !passwordsMatch}
          className={cm.cn(
            cm.fontWeight('bold'),
            'w-full h-[48px] bg-accent hover:bg-accent/90 text-on-accent rounded-xl shadow-sm shadow-accent/20 active:scale-[0.98] transition-all focus:ring-2 focus:ring-offset-2 focus:ring-accent focus:outline-none mt-2 disabled:opacity-60 disabled:cursor-not-allowed',
          )}
        >
          {isSubmitting
            ? t('common.creatingAccountEllipsis', {}, { defaultValue: 'Creating account…' })
            : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
        </button>

        <OAuthButtons />
      </form>

      <div
        className={cm.cn(
          cm.flex({ wrap: 'wrap', align: 'center', justify: 'center', gap: 'md' }),
          'mt-2',
        )}
      >
        <LegalModalLinks
          linkClassName={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            'text-on-surface-variant hover:text-on-surface transition-colors',
          )}
          appName={APP_NAME}
          loadContent={loadContent}
          privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
          termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
        />
      </div>
    </StillpointAuthShell>
  )
}
