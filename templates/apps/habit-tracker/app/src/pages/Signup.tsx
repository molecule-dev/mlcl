import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLegalModals } from '@molecule/app-legal-pages-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthInput } from '../components/AuthInput.js'
import { AuthShell } from '../components/AuthShell.js'
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
  // In-place Privacy/Terms modals (no navigation) — same bonded legal HTML
  // as the standalone /privacy and /terms routes, pre-loaded via loadContent.
  const { openPrivacy, openTerms, modals } = useLegalModals({
    appName: APP_NAME,
    loadContent,
  })

  const isSigningUp = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) return
    const name = [firstName, lastName].filter(Boolean).join(' ') || undefined
    try {
      await signup({ email, password, name })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // intentionally ignored — failure state is tracked in hook via signup error state
    }
  }

  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword

  return (
    <>
      <AuthShell
        eyebrow={t('signup.eyebrow', {}, { defaultValue: 'Day one starts now' })}
        heading={t('signup.heading', {}, { defaultValue: 'Start your streak' })}
        subheading={t(
          'signup.subheading',
          {},
          { defaultValue: 'Build the chain. Don’t break it.' },
        )}
        footer={
          <>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('auth.login.alreadyHaveAccount', {}, { defaultValue: 'Already have an account?' })}{' '}
              <Link to="/login" className={cm.cn(cm.fontWeight('bold'), cm.textPrimary)}>
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
            </p>
            <p className={cm.cn(cm.sp('mt', 4), cm.textSize('xs'), 'text-on-surface-variant')}>
              {t('auth.legalConsent', {}, { defaultValue: 'By continuing, you agree to our' })}{' '}
              <button
                type="button"
                onClick={openTerms}
                className={cm.cn(cm.fontWeight('semibold'), cm.textPrimary, 'hover:underline')}
              >
                {t('nav.terms', {}, { defaultValue: 'Terms' })}
              </button>{' '}
              {t('common.and', {}, { defaultValue: 'and' })}{' '}
              <button
                type="button"
                onClick={openPrivacy}
                className={cm.cn(cm.fontWeight('semibold'), cm.textPrimary, 'hover:underline')}
              >
                {t('nav.privacy', {}, { defaultValue: 'Privacy' })}
              </button>
            </p>
          </>
        }
      >
        <form onSubmit={handleSubmit} className={cm.cn('space-y-4')}>
          <div className={cm.grid({ cols: 2, gap: 'md' })}>
            <AuthInput
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              required
              placeholder={t('signup.firstNamePlaceholder', {}, { defaultValue: 'Jordan' })}
              label={t('form.firstName', {}, { defaultValue: 'First name' })}
            />
            <AuthInput
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
              required
              placeholder={t('signup.lastNamePlaceholder', {}, { defaultValue: 'Sanchez' })}
              label={t('form.lastName', {}, { defaultValue: 'Last name' })}
            />
          </div>
          <AuthInput
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            icon="mail"
            placeholder={t(
              'auth.passwordPlaceholderEmail',
              {},
              { defaultValue: 'you@example.com' },
            )}
            label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          />
          <AuthInput
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            icon="lock"
            placeholder={t(
              'common.atLeast8Characters',
              {},
              { defaultValue: 'At least 8 characters' },
            )}
            label={t('auth.login.password', {}, { defaultValue: 'Password' })}
          />
          <AuthInput
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
            icon="check"
            placeholder={t(
              'auth.signup.repeatYourPassword',
              {},
              { defaultValue: 'Repeat your password' },
            )}
            label={t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
          />

          {passwordMismatch ? (
            <div
              className={cm.cn(
                cm.sp('p', 3),
                cm.textSize('sm'),
                'rounded-xl bg-error-container text-on-error-container',
              )}
            >
              {t('signup.mismatchError', {}, { defaultValue: 'Passwords don’t match.' })}
            </div>
          ) : null}

          {error ? (
            <div
              className={cm.cn(
                cm.sp('p', 3),
                cm.textSize('sm'),
                'rounded-xl bg-error-container text-on-error-container',
              )}
            >
              {error.message}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSigningUp || passwordMismatch}
            className={cm.cn(
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.textSize('base'),
              'w-full text-on-primary rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed',
            )}
            style={{
              background:
                'linear-gradient(90deg, var(--color-gradient-hero-start), var(--color-gradient-hero-end))',
            }}
          >
            {isSigningUp
              ? t('common.creatingAccountEllipsis', {}, { defaultValue: 'Creating account…' })
              : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
          </button>

          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('my', 4))}>
            <div className={cm.cn('flex-1 h-px bg-outline-variant')} />
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('common.or', {}, { defaultValue: 'or' })}
            </span>
            <div className={cm.cn('flex-1 h-px bg-outline-variant')} />
          </div>

          <OAuthButtons />
        </form>
      </AuthShell>
      {modals}
    </>
  )
}
