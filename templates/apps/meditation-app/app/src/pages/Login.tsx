import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useLogin, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { FloatingInput } from '../components/FloatingInput.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { StillpointAuthShell } from '../components/StillpointAuthShell.js'
import { loadContent } from '../config.js'

export function Login() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/home'
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

  const isSubmitting = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login({ email, password })
      clearAuthForm()
      navigate(from, { replace: true })
    } catch (_error) {
      // Error tracked in hook state via error returned from useAuth
    }
  }

  return (
    <StillpointAuthShell
      heading={t('auth.login.signInTitle', {}, { defaultValue: 'Welcome back' })}
      subheading={t(
        'stillpoint.login.subheading',
        {},
        { defaultValue: 'Sign in to continue your practice.' },
      )}
      footer={
        <>
          {t(
            'stillpoint.login.signupPrompt',
            { appName: APP_NAME },
            { defaultValue: 'New to {{appName}}?' },
          )}{' '}
          <Link
            to="/signup"
            className={cm.cn(cm.fontWeight('semibold'), 'text-primary hover:underline ml-1')}
          >
            {t('auth.signup.createAnAccount', {}, { defaultValue: 'Create an account' })}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
        <FloatingInput
          type="email"
          autoComplete="email"
          required
          placeholder={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <FloatingInput
          type="password"
          autoComplete="current-password"
          required
          placeholder={t('auth.login.password', {}, { defaultValue: 'Password' })}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'mt-1')}>
          <label className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'cursor-pointer group')}>
            <input
              type="checkbox"
              className={cm.cn('w-4 h-4 rounded-sm border-outline text-primary focus:ring-primary')}
            />
            <span
              className={cm.cn(
                cm.textSize('sm'),
                'text-on-surface-variant group-hover:text-on-surface transition-colors',
              )}
            >
              {t('stillpoint.login.rememberMe', {}, { defaultValue: 'Keep me signed in' })}
            </span>
          </label>
          <Link
            to="/forgot-password"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'text-primary hover:underline',
            )}
          >
            {t('auth.login.forgotPassword', {}, { defaultValue: 'Forgot password?' })}
          </Link>
        </div>

        {error ? (
          <div
            className={cm.cn(
              cm.sp('p', 3),
              cm.textSize('sm'),
              'rounded-lg bg-error-container text-on-error-container',
            )}
          >
            {error.message}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className={cm.cn(
            cm.fontWeight('bold'),
            'w-full h-[48px] bg-accent hover:bg-accent/90 text-on-accent rounded-xl shadow-sm shadow-accent/20 active:scale-[0.98] transition-all focus:ring-2 focus:ring-offset-2 focus:ring-accent focus:outline-none mt-2 disabled:opacity-60 disabled:cursor-not-allowed',
          )}
        >
          {isSubmitting
            ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
            : t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
        </button>

        <OAuthButtons />
      </form>

      <div
        className={cm.cn(
          cm.flex({ wrap: 'wrap', align: 'center', justify: 'center', gap: 'md' }),
          'mt-2',
        )}
      >
        <LegalModalLinks
          linkClassName={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            'text-on-surface-variant hover:text-on-surface transition-colors',
          )}
          appName={APP_NAME}
          loadContent={loadContent}
          privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
          termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
        />
      </div>
    </StillpointAuthShell>
  )
}
