import { useState } from 'react'
import { useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { PlumeAuthShell } from '../components/PlumeAuthShell.js'
import { loadContent } from '../config.js'

export function Signup() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { signup, status, error: signupError } = useSignup()
  const navigate = useNavigate()
  // Cross-view auth form persistence via the shared @molecule hook: the
  // non-secret identity fields (email, firstName, lastName) are shared
  // across the auth views (Login/Signup/Forgot/Reset) and cleared on
  // success. Secrets (password) are deliberately kept in LOCAL state,
  // never shared — see useAuthFormState's docs for the rationale.
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
  const submitting = status === 'pending'
  const error = localError ?? signupError?.message ?? null

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (password !== confirm) {
      setLocalError(
        t('auth.signup.passwordsDoNotMatchPeriod', {}, { defaultValue: 'Passwords do not match.' }),
      )
      return
    }
    setLocalError(null)
    try {
      await signup({ email, password, name: `${firstName} ${lastName}`.trim() || undefined })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // Error tracked in useSignup hook state (signupError) — no additional handling needed.
    }
  }

  const inputClass = cm.cn(
    cm.w('full'),
    cm.sp('px', 4),
    cm.sp('py', 3),
    'h-12 rounded-lg bg-surface border border-outline-variant text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors',
  )

  return (
    <PlumeAuthShell
      headingKey="signup.heading"
      headingDefault="Create your account"
      subheadingKey="signup.subheading"
      subheadingDefault="Start your writing journey"
      footerPromptKey="signup.footerPrompt"
      footerPromptDefault="Already have an account?"
      footerLinkKey="signup.footerLink"
      footerLinkDefault="Sign in"
      footerLinkTo="/login"
    >
      <form className={cm.stack(4)} onSubmit={handleSubmit}>
        <div className={cm.cn(cm.grid({ gap: 'sm' }), 'grid-cols-2')}>
          <div>
            <label
              htmlFor="signup-first"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                cm.sp('mb', 2),
                'block text-on-surface',
              )}
            >
              {t('form.firstName', {}, { defaultValue: 'First name' })}
            </label>
            <input
              id="signup-first"
              type="text"
              autoComplete="given-name"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label
              htmlFor="signup-last"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                cm.sp('mb', 2),
                'block text-on-surface',
              )}
            >
              {t('form.lastName', {}, { defaultValue: 'Last name' })}
            </label>
            <input
              id="signup-last"
              type="text"
              autoComplete="family-name"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
        <div>
          <label
            htmlFor="signup-email"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              cm.sp('mb', 2),
              'block text-on-surface',
            )}
          >
            {t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
          </label>
          <input
            id="signup-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('signup.emailPlaceholder', {}, { defaultValue: 'author@example.com' })}
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor="signup-password"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              cm.sp('mb', 2),
              'block text-on-surface',
            )}
          >
            {t('auth.login.password', {}, { defaultValue: 'Password' })}
          </label>
          <input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t(
              'common.atLeast8Characters',
              {},
              { defaultValue: 'At least 8 characters' },
            )}
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor="signup-confirm"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              cm.sp('mb', 2),
              'block text-on-surface',
            )}
          >
            {t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
          </label>
          <input
            id="signup-confirm"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={inputClass}
          />
        </div>
        {error ? (
          <div
            role="alert"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.textCenter,
              cm.roundedFull,
              'bg-error-container text-on-error-container',
            )}
          >
            {error}
          </div>
        ) : null}
        <button
          type="submit"
          disabled={submitting}
          className={cm.cn(
            cm.w('full'),
            cm.sp('py', 3),
            cm.fontWeight('semibold'),
            'h-12 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors shadow-sm disabled:opacity-60 mt-2',
          )}
        >
          {submitting
            ? t('common.creatingAccountEllipsis', {}, { defaultValue: 'Creating account…' })
            : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
        </button>
      </form>
      <div className={cm.cn(cm.sp('mt', 6))}>
        <OAuthButtons />
      </div>
      <div
        className={cm.cn(
          cm.flex({ wrap: 'wrap', align: 'center', justify: 'center', gap: 'md' }),
          cm.sp('mt', 6),
        )}
      >
        <LegalModalLinks
          linkClassName={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            cm.textMuted,
            'hover:text-on-surface transition-colors',
          )}
          appName={APP_NAME}
          loadContent={loadContent}
          privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
          termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
        />
      </div>
    </PlumeAuthShell>
  )
}

export default Signup
export { Signup as SignupPage }
