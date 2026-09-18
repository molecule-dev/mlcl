import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLegalModals } from '@molecule/app-legal-pages-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import {
  AuthAlert,
  AuthPasswordField,
  AuthSubmitButton,
  AuthTextField,
} from '../components/AuthFormAtoms.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { SiftAuthShell } from '../components/SiftAuthShell.js'
import { loadContent } from '../config.js'

export function Signup() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { status, error, signup } = useSignup()
  // Cross-view auth form persistence via the shared @molecule hook: the
  // non-secret identity fields (email, name) are shared across the auth
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
  const name = authFormFields.name ?? ''
  const setName = (value: string): void => setAuthFormField('name', value)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [mismatch, setMismatch] = useState<string | null>(null)
  // In-place Privacy/Terms modals (no navigation) — same bonded legal HTML as
  // the standalone /privacy and /terms routes, pre-loaded via loadContent.
  const { openPrivacy, openTerms, modals } = useLegalModals({ appName: APP_NAME, loadContent })

  const isSigningUp = status === 'pending'

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setMismatch(
        t('auth.signup.passwordsDoNotMatchPeriod', {}, { defaultValue: 'Passwords do not match.' }),
      )
      return
    }
    setMismatch(null)
    try {
      await signup({ email, password, name: name || undefined })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // error is tracked in signup hook state; no local handling needed
    }
  }

  return (
    <SiftAuthShell
      heading={t('signup.heading', {}, { defaultValue: 'Stop overpaying. Start saving.' })}
      subheading={t(
        'signup.subheading',
        {},
        { defaultValue: 'Free forever. Watch unlimited products on the Team plan.' },
      )}
      footer={
        <>
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
          <p className={cm.cn(cm.sp('mt', 4), cm.textSize('xs'), 'text-on-surface-variant')}>
            {t(
              'signup.legalPrefix',
              { appName: APP_NAME },
              { defaultValue: 'By creating an account you agree to the {{appName}}' },
            )}{' '}
            <button
              type="button"
              onClick={openTerms}
              className={cm.cn(cm.fontWeight('semibold'), 'text-primary hover:underline')}
            >
              {t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
            </button>{' '}
            {t('common.and', {}, { defaultValue: 'and' })}{' '}
            <button
              type="button"
              onClick={openPrivacy}
              className={cm.cn(cm.fontWeight('semibold'), 'text-primary hover:underline')}
            >
              {t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
            </button>
            .
          </p>
          {modals}
        </>
      }
    >
      <form
        data-mol-id="signup-form"
        onSubmit={handleSubmit}
        className={cm.cn(cm.flex({ direction: 'col' }), 'gap-5')}
      >
        {(mismatch || error) && <AuthAlert tone="error">{mismatch ?? error?.message}</AuthAlert>}

        <AuthTextField
          id="name"
          label={t('form.displayName', {}, { defaultValue: 'Display name' })}
          value={name}
          onChange={setName}
          icon="person"
          autoComplete="name"
          required={false}
          placeholder={t('signup.namePlaceholder', {}, { defaultValue: 'Smart shopper' })}
        />
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
          loading={isSigningUp}
          loadingLabel={t(
            'common.creatingAccountEllipsis',
            {},
            { defaultValue: 'Creating account…' },
          )}
          label={t(
            'signup.submit',
            { appName: APP_NAME },
            { defaultValue: 'Create my {{appName}} account' },
          )}
        />
      </form>

      <OAuthButtons />
    </SiftAuthShell>
  )
}
