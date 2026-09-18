import { useState } from 'react'
import { useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLegalModals } from '@molecule/app-legal-pages-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthShell } from '../components/AuthShell.js'
import { loadContent } from '../config.js'

export function Signup() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { status, signup } = useSignup()
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
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const submitting = status === 'pending'
  // Privacy/Terms open IN-PLACE modals instead of navigating away — the
  // bonded legal HTML is pre-loaded via loadContent before each modal opens.
  const { openPrivacy, openTerms, modals } = useLegalModals({ appName: APP_NAME, loadContent })
  const legalLinkClass = cm.cn(cm.fontWeight('semibold'), 'text-primary hover:underline')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError(
        t('auth.signup.passwordsDoNotMatchPeriod', {}, { defaultValue: 'Passwords do not match.' }),
      )
      return
    }
    try {
      const name = [firstName, lastName].filter(Boolean).join(' ').trim()
      await signup({ email, password, name: name || undefined })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('signup.failed', {}, { defaultValue: 'Could not create account. Please try again.' }),
      )
    }
  }

  return (
    <AuthShell
      heading={t('auth.signup.createYourWorkspace', {}, { defaultValue: 'Create your workspace' })}
      subheading={t(
        'signup.subheading',
        {},
        { defaultValue: 'Start capturing meeting notes in minutes' },
      )}
      altPrompt={t(
        'auth.login.alreadyHaveAccount',
        {},
        { defaultValue: 'Already have an account?' },
      )}
      altLinkText={t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
      altLinkTo="/login"
    >
      <form className={cm.cn(cm.stack(4))} onSubmit={handleSubmit}>
        <div className={cm.cn(cm.grid({ cols: 2, gap: 'sm' }))}>
          <AuthField
            id="signup-first"
            label={t('form.firstName', {}, { defaultValue: 'First name' })}
            placeholder="Sasha"
            value={firstName}
            onChange={setFirstName}
            autoComplete="given-name"
            required
          />
          <AuthField
            id="signup-last"
            label={t('form.lastName', {}, { defaultValue: 'Last name' })}
            placeholder="Kim"
            value={lastName}
            onChange={setLastName}
            autoComplete="family-name"
            required
          />
        </div>

        <AuthField
          id="signup-email"
          type="email"
          label={t('auth.workEmail', {}, { defaultValue: 'Work email' })}
          placeholder={t(
            'auth.passwordPlaceholderNameCompany',
            {},
            { defaultValue: 'name@company.com' },
          )}
          value={email}
          onChange={setEmail}
          autoComplete="email"
          required
        />

        <AuthField
          id="signup-password"
          type="password"
          label={t('auth.login.password', {}, { defaultValue: 'Password' })}
          placeholder="••••••••"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          required
        />

        <AuthField
          id="signup-confirm"
          type="password"
          label={t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
          placeholder="••••••••"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
          required
        />

        {error ? (
          <p
            role="alert"
            className={cm.cn(
              cm.textSize('sm'),
              cm.textCenter,
              cm.sp('px', 4),
              cm.sp('py', 2),
              'rounded-xl bg-error-container text-on-error-container',
            )}
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className={cm.cn(
            cm.w('full'),
            cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
            cm.sp('py', 3),
            cm.fontWeight('semibold'),
            cm.textSize('base'),
            'h-12 rounded-xl text-on-primary bg-gradient-to-r from-primary to-primary-container shadow-lg hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-60',
          )}
        >
          {submitting
            ? t('common.creatingWorkspaceEllipsis', {}, { defaultValue: 'Creating workspace…' })
            : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
          <span
            aria-hidden="true"
            className={cm.cn('material-symbols-outlined')}
            style={{ fontSize: 18 }}
          >
            arrow_forward
          </span>
        </button>

        <p className={cm.cn(cm.textSize('xs'), cm.textCenter, 'text-on-surface-variant')}>
          {t('signup.termsPrefix', {}, { defaultValue: 'By creating an account you agree to our' })}{' '}
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

function AuthField({
  id,
  label,
  placeholder,
  type = 'text',
  value,
  onChange,
  required = false,
  autoComplete,
}: {
  id: string
  label: string
  placeholder?: string
  type?: string
  value: string
  onChange: (next: string) => void
  required?: boolean
  autoComplete?: string
}) {
  const cm = getClassMap()
  return (
    <label className={cm.cn(cm.stack(1))} htmlFor={id}>
      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), cm.sp('ml', 1))}>
        {label}
      </span>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cm.cn(
          cm.w('full'),
          cm.sp('px', 4),
          cm.textSize('base'),
          'h-12 bg-surface-container-high border-0 rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all',
        )}
      />
    </label>
  )
}
