import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { OAuthButtons } from '../components/OAuthButtons.js'
import { RushesAuthShell } from '../components/RushesAuthShell.js'

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

  const isSubmitting = status === 'pending'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) {
      setMismatch(true)
      return
    }
    setMismatch(false)
    try {
      const name = `${firstName} ${lastName}`.trim()
      await signup({ email, password, name })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // error is tracked in hook state via signup's own error handling
    }
  }

  const fieldClass = cm.cn(
    cm.w('full'),
    cm.sp('px', 4),
    cm.sp('py', 3),
    cm.textSize('sm'),
    'rounded-lg bg-[var(--video-input-bg)] text-[var(--video-text-primary)] border border-[var(--video-border-subtle)] focus:border-[var(--video-cta-from)] focus:ring-1 focus:ring-[var(--video-cta-from)]/40 focus:outline-none transition-colors placeholder:text-[var(--video-text-dim)]',
  )
  const labelClass = cm.cn(
    cm.textSize('xs'),
    'block font-mono uppercase tracking-widest text-[var(--video-text-muted-alt)] mb-1.5',
  )

  return (
    <RushesAuthShell
      heading={t('signup.heading', {}, { defaultValue: 'Create your studio' })}
      subheading={t(
        'signup.subheading',
        {},
        { defaultValue: 'Spin up your first cut in under a minute.' },
      )}
      footer={
        <>
          {t('auth.login.alreadyHaveAccount', {}, { defaultValue: 'Already have an account?' })}{' '}
          <Link
            to="/login"
            className={
              'text-[var(--video-link)] hover:text-[var(--video-link-hover)] font-medium transition-colors'
            }
          >
            {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className={cm.stack(5)} data-mol-id="signup-form">
        <div className={cm.cn('grid grid-cols-2 gap-3')}>
          <div>
            <label htmlFor="first-name" className={labelClass}>
              {t('form.firstName', {}, { defaultValue: 'First name' })}
            </label>
            <input
              id="first-name"
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              placeholder="Mira"
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="last-name" className={labelClass}>
              {t('form.lastName', {}, { defaultValue: 'Last name' })}
            </label>
            <input
              id="last-name"
              type="text"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
              placeholder="Calder"
              className={fieldClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className={labelClass}>
            {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="editor@rushes.studio"
            className={fieldClass}
          />
        </div>

        <div>
          <label htmlFor="password" className={labelClass}>
            {t('auth.login.password', {}, { defaultValue: 'Password' })}
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            placeholder={t(
              'signup.passwordPlaceholder',
              {},
              { defaultValue: 'At least 8 characters' },
            )}
            className={fieldClass}
          />
        </div>

        <div>
          <label htmlFor="confirm-password" className={labelClass}>
            {t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
          </label>
          <input
            id="confirm-password"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            placeholder={t('signup.confirmPlaceholder', {}, { defaultValue: 'Repeat password' })}
            className={fieldClass}
          />
        </div>

        {mismatch && (
          <p
            role="alert"
            className={cm.cn(cm.textSize('xs'), 'text-[var(--video-error-text)] font-mono')}
          >
            {t(
              'auth.signup.passwordsDoNotMatchPeriod',
              {},
              { defaultValue: 'Passwords do not match.' },
            )}
          </p>
        )}
        {error && (
          <p
            role="alert"
            className={cm.cn(cm.textSize('xs'), 'text-[var(--video-error-text)] font-mono')}
          >
            {error.message}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          data-mol-id="signup-submit"
          className={cm.cn(
            cm.w('full'),
            cm.sp('py', 3),
            cm.sp('px', 4),
            cm.fontWeight('semibold'),
            cm.flex({ align: 'center', justify: 'center', gap: 2 }),
            'rounded-lg text-white bg-gradient-to-r from-[var(--video-cta-from)] to-[var(--video-cta-to)] hover:from-[var(--video-cta-from-hover)] hover:to-[var(--video-cta-to-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          <span>
            {isSubmitting
              ? t('signup.submitting', {}, { defaultValue: 'Creating studio…' })
              : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
          </span>
          <span className={cm.cn('material-symbols-outlined text-[18px]')}>arrow_forward</span>
        </button>

        <OAuthButtons />
      </form>
    </RushesAuthShell>
  )
}

export default Signup
