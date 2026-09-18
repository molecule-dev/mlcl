import { type FormEvent, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLegalModals } from '@molecule/app-legal-pages-react'
import { useLogin, useTranslation } from '@molecule/app-react'
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

export function Login() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard'
  const { status, error, login } = useLogin()
  // Cross-view auth form persistence (email shared across Login/Signup/
  // Forgot/Reset, cleared on success) via the shared @molecule hook.
  const {
    fields: authFormFields,
    setField: setAuthFormField,
    clear: clearAuthForm,
  } = useAuthFormState()
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  // In-place Privacy/Terms modals (no navigation) — same bonded legal HTML as
  // the standalone /privacy and /terms routes, pre-loaded via loadContent.
  const { openPrivacy, openTerms, modals } = useLegalModals({ appName: APP_NAME, loadContent })

  const isLoggingIn = status === 'pending'

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await login({ email, password })
      clearAuthForm()
      navigate(from, { replace: true })
    } catch (_error) {
      // error is tracked in login hook state; no local handling needed
    }
  }

  return (
    <SiftAuthShell
      heading={t('login.heading', {}, { defaultValue: 'Welcome back, smart shopper' })}
      subheading={t(
        'login.subheading',
        {},
        { defaultValue: 'Sign in to keep hunting for the best price.' },
      )}
      footer={
        <>
          <p>
            {t('login.noAccount', { appName: APP_NAME }, { defaultValue: 'New to {{appName}}?' })}{' '}
            <Link
              to="/signup"
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-primary hover:underline underline-offset-4',
              )}
            >
              {t('login.signupCta', {}, { defaultValue: 'Create an account and start saving' })}
            </Link>
          </p>
          <p className={cm.cn(cm.sp('mt', 4), cm.textSize('xs'), 'text-on-surface-variant')}>
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
          {modals}
        </>
      }
    >
      <form
        data-mol-id="login-form"
        onSubmit={handleSubmit}
        className={cm.cn(cm.flex({ direction: 'col' }), 'gap-5')}
      >
        {error && <AuthAlert tone="error">{error.message}</AuthAlert>}

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
        />

        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('pt', 1))}>
          <label
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.textSize('sm'),
              'cursor-pointer text-on-surface-variant',
            )}
          >
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className={cm.cn(
                'h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary/30',
              )}
            />
            {t('auth.login.rememberMe', {}, { defaultValue: 'Remember me' })}
          </label>
          <Link
            to="/forgot-password"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'text-primary hover:underline',
            )}
          >
            {t('auth.login.forgotPassword', {}, { defaultValue: 'Forgot password?' })}
          </Link>
        </div>

        <AuthSubmitButton
          loading={isLoggingIn}
          loadingLabel={t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })}
          label={t(
            'login.submit',
            { appName: APP_NAME },
            { defaultValue: 'Sign in to {{appName}}' },
          )}
        />
      </form>

      <OAuthButtons />
    </SiftAuthShell>
  )
}
