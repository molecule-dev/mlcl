import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import type { LoginCredentials } from '@molecule/app-auth'
import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLegalModals } from '@molecule/app-legal-pages-react'
import { useLogin, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { DendriteAuthCard } from '../components/DendriteAuthCard.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
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
  const [twoFactorToken, setTwoFactorToken] = useState('')
  const [twoFactorRequired, setTwoFactorRequired] = useState(false)
  // In-place Privacy/Terms modals (no navigation) — same bonded legal HTML
  // as the standalone /privacy and /terms routes, pre-loaded via loadContent.
  const { openPrivacy, openTerms, modals } = useLegalModals({
    appName: APP_NAME,
    loadContent,
  })

  const isLoggingIn = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Forward the TOTP code to the user-resource log-in handler, which verifies
    // it via @molecule/api-two-factor when the account has 2FA enabled.
    const code = twoFactorToken.trim()
    const credentials: LoginCredentials & { twoFactorToken?: string } = { email, password }
    if (code) credentials.twoFactorToken = code
    try {
      const result = await login(credentials)
      // The handler returns 206 { twoFactorRequired: true } (no user/token) when
      // the account has 2FA enabled but no valid code was supplied yet — keep the
      // user here and prompt for their code instead of navigating away.
      const r = result as { accessToken?: string; user?: unknown }
      if (!r.accessToken && !r.user) {
        setTwoFactorRequired(true)
        return
      }
      clearAuthForm()
      navigate(from, { replace: true })
    } catch (_error) {
      // tracked in hook state via error
    }
  }

  return (
    <DendriteAuthCard
      heading={t('auth.login.signInTitle', {}, { defaultValue: 'Welcome back' })}
      subheading={t(
        'login.subheading',
        {},
        { defaultValue: 'Sign in to keep branching where you left off.' },
      )}
      footer={
        <>
          <span>
            {t('login.noAccount', {}, { defaultValue: 'New here?' })}{' '}
            <Link to="/signup" className={cm.cn('font-bold text-primary hover:underline')}>
              {t('auth.signup.createAnAccount', {}, { defaultValue: 'Create an account' })}
            </Link>
          </span>
          <p className={cm.cn(cm.sp('mt', 4), cm.textSize('xs'), 'text-on-surface-variant')}>
            {t('auth.legalConsent', {}, { defaultValue: 'By continuing, you agree to our' })}{' '}
            <button
              type="button"
              onClick={openTerms}
              data-mol-id="login-terms-link"
              className={cm.cn(cm.fontWeight('semibold'), 'text-primary hover:underline')}
            >
              {t('nav.terms', {}, { defaultValue: 'Terms' })}
            </button>{' '}
            {t('common.and', {}, { defaultValue: 'and' })}{' '}
            <button
              type="button"
              onClick={openPrivacy}
              data-mol-id="login-privacy-link"
              className={cm.cn(cm.fontWeight('semibold'), 'text-primary hover:underline')}
            >
              {t('nav.privacy', {}, { defaultValue: 'Privacy' })}
            </button>
          </p>
          {modals}
        </>
      }
    >
      <form className={cm.cn(cm.stack(5))} onSubmit={handleSubmit}>
        {error && (
          <div
            role="alert"
            className={cm.cn(
              cm.sp('p', 3),
              cm.textSize('sm'),
              'rounded-xl bg-error-container/40 text-on-error-container border border-error/30',
            )}
          >
            {error.message}
          </div>
        )}
        <div className={cm.stack(2)}>
          <label
            htmlFor="login-email"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'tracking-wide text-on-surface',
            )}
          >
            {t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            disabled={isLoggingIn}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t(
              'auth.passwordPlaceholderNameCompany',
              {},
              { defaultValue: 'name@company.com' },
            )}
            className={cm.cn(
              cm.w('full'),
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-primary/30 transition-all',
            )}
          />
        </div>
        <div className={cm.stack(2)}>
          <div className={cm.flex({ justify: 'between', align: 'center' })}>
            <label
              htmlFor="login-password"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'tracking-wide text-on-surface',
              )}
            >
              {t('auth.login.password', {}, { defaultValue: 'Password' })}
            </label>
            <Link
              to="/forgot-password"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'text-primary hover:underline',
              )}
            >
              {t('auth.login.forgotPassword', {}, { defaultValue: 'Forgot password?' })}
            </Link>
          </div>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            disabled={isLoggingIn}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
            className={cm.cn(
              cm.w('full'),
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-primary/30 transition-all',
            )}
          />
        </div>
        <div className={cm.stack(2)}>
          <label
            htmlFor="login-2fa"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'tracking-wide text-on-surface',
            )}
          >
            {t('login.twoFactor', {}, { defaultValue: 'Two-factor token (if enabled)' })}
          </label>
          <input
            id="login-2fa"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            disabled={isLoggingIn}
            value={twoFactorToken}
            onChange={(e) => setTwoFactorToken(e.target.value)}
            className={cm.cn(
              cm.w('full'),
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-primary/30 transition-all',
            )}
          />
          {twoFactorRequired && (
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'login.twoFactorRequired',
                {},
                {
                  defaultValue: 'Enter the code from your authenticator app to finish signing in.',
                },
              )}
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={isLoggingIn}
          className={cm.cn(
            cm.w('full'),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
            'rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-md hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-transform',
          )}
        >
          {isLoggingIn
            ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
            : t('login.signIn', { appName: APP_NAME }, { defaultValue: 'Sign in to {{appName}}' })}
          <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
            arrow_forward
          </span>
        </button>
      </form>
      <OAuthButtons />
    </DendriteAuthCard>
  )
}

export default Login
