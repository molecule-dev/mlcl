import { useState } from 'react'
import { useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLegalModals } from '@molecule/app-legal-pages-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
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
  const [confirm, setConfirm] = useState('')
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

  const isPending = status === 'pending'
  const passwordMismatch = confirm.length > 0 && confirm !== password

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordMismatch) return
    try {
      await signup({
        email,
        password,
        name: `${firstName} ${lastName}`.trim(),
        metadata: { firstName, lastName },
      })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // error is tracked in hook state (error) and surfaced by the form
    }
  }

  const inputClass = cm.cn(
    cm.sp('px', 4),
    cm.sp('py', 3),
    cm.fontWeight('medium'),
    cm.textSize('sm'),
    'bg-surface-container-low border border-outline-variant/40 rounded-xl focus:bg-surface focus:ring-2 focus:ring-primary/30 transition-all outline-none',
  )
  const labelClass = cm.cn(
    cm.fontWeight('bold'),
    cm.textSize('xs'),
    'uppercase tracking-widest text-on-surface-variant',
  )
  const legalLinkClass = cm.cn(
    cm.fontWeight('bold'),
    'text-on-surface hover:text-primary underline transition-colors',
  )

  return (
    <AuthShell
      eyebrow={t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })!}
      heading={t('signup.heading', {}, { defaultValue: 'Make your first canvas in 60 seconds' })!}
      subheading={t(
        'signup.subheading',
        {},
        {
          defaultValue:
            'A free workspace ships with three live boards, the full template library, and unlimited viewers.',
        },
      )!}
      showOAuth
      oauth={<OAuthButtons />}
      bottomLink={{
        to: '/login',
        prompt: t(
          'auth.login.alreadyHaveAccount',
          {},
          { defaultValue: 'Already have an account?' },
        )!,
        cta: t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })!,
      }}
      legal={
        <>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('medium'),
              'text-center leading-relaxed text-on-surface-variant',
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
        </>
      }
    >
      <form onSubmit={handleSubmit} data-mol-id="signup-form" className={cm.cn(cm.stack(5))}>
        <div className={cm.cn(cm.grid({ cols: 2, gap: 'md' }))}>
          <label className={cm.cn(cm.stack(2))}>
            <span className={labelClass}>
              {t('form.firstName', {}, { defaultValue: 'First name' })}
            </span>
            <input
              id="signup-first-name"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              required
              placeholder={t('signup.firstNamePlaceholder', {}, { defaultValue: 'Mara' })!}
              className={inputClass}
            />
          </label>
          <label className={cm.cn(cm.stack(2))}>
            <span className={labelClass}>
              {t('form.lastName', {}, { defaultValue: 'Last name' })}
            </span>
            <input
              id="signup-last-name"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
              required
              placeholder={t('signup.lastNamePlaceholder', {}, { defaultValue: 'Vieira' })!}
              className={inputClass}
            />
          </label>
        </div>
        <label className={cm.cn(cm.stack(2))}>
          <span className={labelClass}>
            {t('auth.workEmail', {}, { defaultValue: 'Work email' })}
          </span>
          <input
            id="signup-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            placeholder={t('signup.emailPlaceholder', {}, { defaultValue: 'mara@studio.com' })!}
            className={inputClass}
          />
        </label>
        <label className={cm.cn(cm.stack(2))}>
          <span className={labelClass}>
            {t('auth.login.password', {}, { defaultValue: 'Password' })}
          </span>
          <input
            id="signup-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
            placeholder={t('signup.passwordPlaceholder', {}, { defaultValue: 'min 8 characters' })!}
            className={inputClass}
          />
        </label>
        <label className={cm.cn(cm.stack(2))}>
          <span className={labelClass}>
            {t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
          </span>
          <input
            id="signup-confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
            className={inputClass}
          />
          {passwordMismatch && (
            <span
              className={cm.cn(
                cm.fontWeight('semibold'),
                cm.textSize('xs'),
                'text-on-error-container',
              )}
            >
              {t(
                'auth.signup.passwordsDoNotMatchPeriod',
                {},
                { defaultValue: 'Passwords do not match.' },
              )}
            </span>
          )}
        </label>
        {error && (
          <div
            role="alert"
            className={cm.cn(
              cm.sp('p', 3),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-xl bg-error-container/40 text-on-error-container',
            )}
          >
            {error.message}
          </div>
        )}
        <button
          type="submit"
          disabled={isPending || passwordMismatch}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
            'bg-gradient-to-br from-primary to-secondary text-white rounded-xl shadow-lg shadow-primary/30 hover:scale-[1.01] active:scale-[0.99] transition-transform disabled:opacity-60',
          )}
        >
          {isPending
            ? t('common.creatingAccountEllipsis', {}, { defaultValue: 'Creating account…' })
            : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
          <span className={cm.cn('material-symbols-outlined text-[18px]')}>arrow_forward</span>
        </button>
      </form>
    </AuthShell>
  )
}

export default Signup
