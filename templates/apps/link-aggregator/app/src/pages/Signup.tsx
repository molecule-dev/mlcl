import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLegalModals } from '@molecule/app-legal-pages-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { loadContent } from '../config.js'
import { AuthShell, BrandHeader, Divider, Field } from './Login.js'

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
  // In-place Privacy/Terms modals (the standalone /privacy and /terms routes
  // still exist for deep links) — shared @molecule legal-modal hook.
  const {
    openPrivacy,
    openTerms,
    modals: legalModals,
  } = useLegalModals({
    appName: APP_NAME,
    loadContent,
  })
  const legalLinkClass = cm.cn(
    cm.fontWeight('bold'),
    'text-primary hover:underline decoration-2 underline-offset-2',
  )

  const submitting = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) return
    try {
      await signup({
        email,
        password,
        name: `${firstName} ${lastName}`.trim() || undefined,
      })
      clearAuthForm()
      navigate('/feed', { replace: true })
    } catch (_error) {
      // error is rendered via the error state from useSignup
    }
  }

  return (
    <AuthShell>
      <BrandHeader />
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), cm.textCenter)}>
        <h2
          className={cm.cn(
            cm.textSize('2xl'),
            cm.fontWeight('bold'),
            'tracking-tight text-on-surface',
          )}
        >
          {t(
            'signup.heading',
            { appName: APP_NAME },
            { defaultValue: 'Create your {{appName}} account.' },
          )}
        </h2>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('signup.subtitle', {}, { defaultValue: 'Join a small, slow link-sharing community.' })}
        </p>
      </div>

      <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
        <div className={cm.cn(cm.grid({ cols: 2, gap: 'md' }))}>
          <Field label={t('form.firstName', {}, { defaultValue: 'First name' })} icon="badge">
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              className={cm.cn(
                cm.sp('py', 3),
                cm.textSize('base'),
                'flex-1 bg-transparent outline-none text-on-surface',
              )}
            />
          </Field>
          <Field label={t('form.lastName', {}, { defaultValue: 'Last name' })} icon="badge">
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
              className={cm.cn(
                cm.sp('py', 3),
                cm.textSize('base'),
                'flex-1 bg-transparent outline-none text-on-surface',
              )}
            />
          </Field>
        </div>
        <Field
          label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          icon="alternate_email"
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            className={cm.cn(
              cm.sp('py', 3),
              cm.textSize('base'),
              'flex-1 bg-transparent outline-none text-on-surface',
            )}
          />
        </Field>
        <Field label={t('auth.login.password', {}, { defaultValue: 'Password' })} icon="lock">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
            className={cm.cn(
              cm.sp('py', 3),
              cm.textSize('base'),
              'flex-1 bg-transparent outline-none text-on-surface',
            )}
          />
        </Field>
        <Field
          label={t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
          icon="lock"
        >
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
            className={cm.cn(
              cm.sp('py', 3),
              cm.textSize('base'),
              'flex-1 bg-transparent outline-none text-on-surface',
            )}
          />
        </Field>

        {confirmPassword && password !== confirmPassword && (
          <p
            role="alert"
            className={cm.cn(cm.sp('p', 3), cm.textSize('sm'), 'rounded-lg bg-error/10 text-error')}
          >
            {t('signup.mismatch', {}, { defaultValue: 'Passwords don\u2019t match.' })}
          </p>
        )}

        {error && (
          <p
            role="alert"
            className={cm.cn(cm.sp('p', 3), cm.textSize('sm'), 'rounded-lg bg-error/10 text-error')}
          >
            {error.message}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || password !== confirmPassword}
          className={cm.cn(
            cm.sp('py', 3),
            cm.roundedFull,
            cm.textSize('base'),
            cm.fontWeight('bold'),
            'bg-primary text-on-primary hover:bg-primary-hover disabled:opacity-60 transition-colors shadow-md',
          )}
        >
          {submitting
            ? t('signup.submitting', {}, { defaultValue: 'Creating account\u2026' })
            : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
        </button>
      </form>

      <Divider label={t('signup.orContinue', {}, { defaultValue: 'or continue with' })} />
      <OAuthButtons />

      <footer className={cm.cn(cm.textCenter, cm.textSize('sm'))}>
        <span className="text-on-surface-variant">
          {t(
            'auth.login.alreadyHaveAccount',
            {},
            { defaultValue: 'Already have an account?' },
          )}{' '}
        </span>
        <Link
          to="/login"
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-primary hover:underline decoration-2 underline-offset-2',
          )}
        >
          {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
        </Link>
      </footer>

      <p
        className={cm.cn(
          cm.textCenter,
          cm.textSize('xs'),
          'leading-relaxed text-on-surface-variant',
        )}
      >
        {t(
          'auth.legalConsent.prefix',
          { appName: APP_NAME },
          { defaultValue: 'By continuing, you agree to {{appName}}’s' },
        )}{' '}
        <button type="button" onClick={openPrivacy} className={legalLinkClass}>
          {t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
        </button>{' '}
        {t('common.and', {}, { defaultValue: 'and' })}{' '}
        <button type="button" onClick={openTerms} className={legalLinkClass}>
          {t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
        </button>
        {'.'}
      </p>
      {legalModals}
    </AuthShell>
  )
}

export default Signup
