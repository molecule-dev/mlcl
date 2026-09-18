import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLegalModals } from '@molecule/app-legal-pages-react'
import { useLogin, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthShell } from '../components/AuthShell.js'
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
    'text-on-surface hover:text-primary underline transition-colors',
  )

  const isLoggingIn = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login({ email, password })
      clearAuthForm()
      navigate(from, { replace: true })
    } catch (_error) {
      // error is tracked in hook state (error) and surfaced by the form
    }
  }

  return (
    <AuthShell
      eyebrow={t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })!}
      heading={t('login.heading', {}, { defaultValue: 'Welcome back to your canvas' })!}
      subheading={t(
        'login.subheading',
        {},
        {
          defaultValue:
            'Pick up where the team left off — frames, libraries, and cursor presence all sync in real time.',
        },
      )!}
      showOAuth
      oauth={<OAuthButtons />}
      bottomLink={{
        to: '/signup',
        prompt: t(
          'login.signupPrompt',
          { appName: APP_NAME },
          { defaultValue: 'New to {{appName}}?' },
        )!,
        cta: t('login.signupCta', {}, { defaultValue: 'Create a free workspace' })!,
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
      <form onSubmit={handleSubmit} data-mol-id="login-form" className={cm.cn(cm.stack(5))}>
        <label className={cm.cn(cm.stack(2))}>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          </span>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            placeholder={t('login.emailPlaceholder', {}, { defaultValue: 'mara@studio.com' })!}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.fontWeight('medium'),
              cm.textSize('sm'),
              'bg-surface-container-low border border-outline-variant/40 rounded-xl focus:bg-surface focus:ring-2 focus:ring-primary/30 transition-all outline-none',
            )}
          />
        </label>
        <label className={cm.cn(cm.stack(2))}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('auth.login.password', {}, { defaultValue: 'Password' })}
            <Link
              to="/forgot-password"
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-primary hover:underline normal-case tracking-normal',
              )}
            >
              {t('auth.login.forgotShort', {}, { defaultValue: 'Forgot?' })}
            </Link>
          </span>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            placeholder={t('login.passwordPlaceholder', {}, { defaultValue: '••••••••••' })!}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.fontWeight('medium'),
              cm.textSize('sm'),
              'bg-surface-container-low border border-outline-variant/40 rounded-xl focus:bg-surface focus:ring-2 focus:ring-primary/30 transition-all outline-none',
            )}
          />
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
          disabled={isLoggingIn}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
            'bg-gradient-to-br from-primary to-secondary text-white rounded-xl shadow-lg shadow-primary/30 hover:scale-[1.01] active:scale-[0.99] transition-transform disabled:opacity-60',
          )}
        >
          {isLoggingIn
            ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
            : t('login.signIn', { appName: APP_NAME }, { defaultValue: 'Sign in to {{appName}}' })}
          <span className={cm.cn('material-symbols-outlined text-[18px]')}>arrow_forward</span>
        </button>
      </form>
    </AuthShell>
  )
}

export default Login
