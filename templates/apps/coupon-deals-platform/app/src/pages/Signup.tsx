import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLegalModals } from '@molecule/app-legal-pages-react'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import {
  AuthAlert,
  AuthPasswordField,
  AuthSubmitButton,
  AuthTextField,
} from '../components/AuthFormAtoms.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { SnagrAuthShell } from '../components/SnagrAuthShell.js'
import { loadContent } from '../config.js'

export function Signup() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { register } = useAuth()
  const navigate = useNavigate()
  // Privacy/Terms open IN-PLACE modals instead of navigating away — the
  // bonded legal HTML is pre-loaded via loadContent before the modal opens.
  const { openPrivacy, openTerms, modals } = useLegalModals({ appName: APP_NAME, loadContent })
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
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError(
        t(
          'signup.passwordMismatch',
          {},
          { defaultValue: 'Passwords do not match — please retype.' },
        ),
      )
      return
    }
    setLoading(true)
    try {
      // Use the auth client's register() so the resulting access token + user
      // are persisted to storage. Posting to /api/users directly would set
      // server cookies but leave the auth client (and AuthGuard) thinking the
      // user is anonymous, bouncing them back to /login on /dashboard.
      await register({
        email,
        password,
        name: `${firstName} ${lastName}`.trim(),
      } as { email: string; password: string; name: string })
      clearAuthForm()
      navigate('/dashboard')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('signup.error', {}, { defaultValue: 'Could not create your account.' }),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <SnagrAuthShell
      heading={t('signup.heading', {}, { defaultValue: 'Join the deal hunters' })}
      subheading={t(
        'signup.subheading',
        {},
        { defaultValue: 'Free forever, 30 seconds to set up.' },
      )}
      footer={
        <p>
          {t('auth.login.alreadyHaveAccount', {}, { defaultValue: 'Already have an account?' })}{' '}
          <Link
            to="/login"
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-primary hover:underline underline-offset-4',
            )}
          >
            {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </Link>
        </p>
      }
    >
      <form
        data-mol-id="signup-form"
        onSubmit={handleSubmit}
        className={cm.cn(cm.flex({ direction: 'col' }), 'gap-5')}
      >
        {error && <AuthAlert tone="error">{error}</AuthAlert>}

        <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-2')}>
          <AuthTextField
            id="firstName"
            label={t('form.firstName', {}, { defaultValue: 'First name' })}
            value={firstName}
            onChange={setFirstName}
            icon="person"
            autoComplete="given-name"
            placeholder={t('signup.firstNamePlaceholder', {}, { defaultValue: 'Sam' })}
          />
          <AuthTextField
            id="lastName"
            label={t('form.lastName', {}, { defaultValue: 'Last name' })}
            value={lastName}
            onChange={setLastName}
            icon="badge"
            autoComplete="family-name"
            placeholder={t('signup.lastNamePlaceholder', {}, { defaultValue: 'Snagger' })}
          />
        </div>

        <AuthTextField
          id="email"
          label={t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
          value={email}
          onChange={setEmail}
          icon="mail"
          type="email"
          autoComplete="email"
          placeholder={t('auth.passwordPlaceholderEmail', {}, { defaultValue: 'you@example.com' })}
        />
        <AuthPasswordField
          id="password"
          label={t('auth.login.password', {}, { defaultValue: 'Password' })}
          value={password}
          onChange={setPassword}
          show={showPassword}
          onToggleShow={() => setShowPassword((v) => !v)}
          autoComplete="new-password"
        />
        <AuthPasswordField
          id="confirm"
          label={t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
          value={confirm}
          onChange={setConfirm}
          show={showPassword}
          onToggleShow={() => setShowPassword((v) => !v)}
          autoComplete="new-password"
        />

        <AuthSubmitButton
          loading={loading}
          loadingLabel={t(
            'common.creatingAccountEllipsis',
            {},
            { defaultValue: 'Creating account…' },
          )}
          label={t('signup.submit', {}, { defaultValue: 'Create account and start saving' })}
        />

        <p className={cm.cn(cm.textCenter, cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'signup.legalPrefix',
            {},
            { defaultValue: 'By creating an account, you agree to our' },
          )}{' '}
          <button
            type="button"
            onClick={openTerms}
            className={cm.cn(cm.fontWeight('semibold'), 'text-primary hover:underline')}
          >
            {t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
          </button>{' '}
          {t('signup.legalAnd', {}, { defaultValue: 'and' })}{' '}
          <button
            type="button"
            onClick={openPrivacy}
            className={cm.cn(cm.fontWeight('semibold'), 'text-primary hover:underline')}
          >
            {t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
          </button>
          .
        </p>
      </form>

      <OAuthButtons />
      {modals}
    </SnagrAuthShell>
  )
}
