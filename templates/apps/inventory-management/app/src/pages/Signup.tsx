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
import { FormField } from './Login.js'

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
  const [localError, setLocalError] = useState<string | null>(null)
  // In-place Privacy/Terms modals (no navigation) — same bonded legal HTML
  // as the standalone /privacy and /terms routes, pre-loaded via loadContent.
  const { openPrivacy, openTerms, modals } = useLegalModals({
    appName: APP_NAME,
    loadContent,
  })

  const isSubmitting = status === 'pending'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setLocalError(
        t('auth.signup.passwordsDoNotMatchPeriod', {}, { defaultValue: 'Passwords do not match.' }),
      )
      return
    }
    setLocalError(null)
    try {
      await signup({ email, password, name: `${firstName} ${lastName}`.trim() })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // surfaced via `error` — the hook exposes the error to the UI
    }
  }

  const submitError = localError ?? error?.message

  return (
    <>
      <AuthShell
        heading={t(
          'signup.heading',
          { appName: APP_NAME },
          { defaultValue: 'Create your {{appName}} account' },
        )}
        subheading={t(
          'signup.subheading',
          {},
          {
            defaultValue: 'Connect a warehouse, import SKUs, and bring movements live in minutes.',
          },
        )}
        bottomLinkText={t(
          'auth.login.alreadyHaveAccount',
          {},
          { defaultValue: 'Already have an account?' },
        )}
        bottomLinkLabel={t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
        bottomLinkTo="/login"
      >
        <form onSubmit={handleSubmit} className={cm.cn(cm.w('full'), cm.stack(5))}>
          <div className={cm.cn('grid grid-cols-1 sm:grid-cols-2 gap-4')}>
            <FormField
              label={t('form.firstName', {}, { defaultValue: 'First name' })}
              icon="person"
              type="text"
              value={firstName}
              onChange={setFirstName}
              placeholder="Avery"
              autoComplete="given-name"
              required
            />
            <FormField
              label={t('form.lastName', {}, { defaultValue: 'Last name' })}
              icon="badge"
              type="text"
              value={lastName}
              onChange={setLastName}
              placeholder="Chen"
              autoComplete="family-name"
              required
            />
          </div>
          <FormField
            label={t('auth.workEmail', {}, { defaultValue: 'Work email' })}
            icon="alternate_email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="ops@yourwarehouse.com"
            autoComplete="email"
            required
          />
          <FormField
            label={t('auth.login.password', {}, { defaultValue: 'Password' })}
            icon="lock"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder={t(
              'common.atLeast8Characters',
              {},
              { defaultValue: 'At least 8 characters' },
            )}
            autoComplete="new-password"
            required
          />
          <FormField
            label={t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
            icon="check_circle"
            type="password"
            value={confirm}
            onChange={setConfirm}
            placeholder="••••••••"
            autoComplete="new-password"
            required
          />

          {submitError && (
            <div
              role="alert"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                'rounded-lg bg-error-container text-on-error-container border border-error/20',
              )}
            >
              {submitError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className={cm.cn(
              cm.w('full'),
              cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
              cm.h(12),
              cm.fontWeight('bold'),
              'rounded-xl bg-gradient-to-br from-primary to-primary-dark text-white shadow-lg shadow-primary/30 hover:opacity-95 active:scale-[0.98] disabled:opacity-60 transition-all',
            )}
          >
            {isSubmitting
              ? t('common.creatingAccountEllipsis', {}, { defaultValue: 'Creating account…' })
              : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
            <span
              className={cm.cn('material-symbols-outlined text-[18px]')}
              data-icon="arrow_forward"
            >
              arrow_forward
            </span>
          </button>
        </form>

        <OAuthButtons />

        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant text-center')}>
          {t('auth.legalConsent', {}, { defaultValue: 'By continuing, you agree to our' })}{' '}
          <button
            type="button"
            onClick={openTerms}
            className={cm.cn(cm.fontWeight('semibold'), 'text-primary hover:underline')}
          >
            {t('nav.terms', {}, { defaultValue: 'Terms' })}
          </button>{' '}
          {t('common.and', {}, { defaultValue: 'and' })}{' '}
          <button
            type="button"
            onClick={openPrivacy}
            className={cm.cn(cm.fontWeight('semibold'), 'text-primary hover:underline')}
          >
            {t('nav.privacy', {}, { defaultValue: 'Privacy' })}
          </button>
        </p>
      </AuthShell>
      {modals}
    </>
  )
}

export default Signup
