// Phase 1 baseline — verbatim JSX of design-team-chat-login.html
// Do not hand-edit; Phase 2 will extract sections one at a time.
import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { useAuth } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import SSOButton from '../components/SSOButton.js'
import { loadContent } from '../config.js'
function Login() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { login } = useAuth()
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await login({ email, password })
      clearAuthForm()
      navigate('/')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('login.failed', {}, { defaultValue: 'Sign in failed' }),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.minH('screen'),
        cm.w('full'),
        cm.sp('p', 6),
      )}
    >
      <div className={cm.cn('login-card', cm.mxAuto)}>
        {/* Logo Section */}
        <div className={cm.cn('logo')}>
          {t('app.name', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
        </div>
        {/* Header Section */}
        <h1 className={cm.cn('header-title')}>
          {t('auth.login.signInTitle', {}, { defaultValue: 'Welcome back' })}
        </h1>
        <p className={cm.cn('subtitle')}>
          {t('login.subtitle', {}, { defaultValue: 'Sign in to your workspace' })}
        </p>
        {/* Form Section */}
        <form className={cm.cn('form-container')} onSubmit={handleSubmit}>
          {error && (
            <div
              data-mol-id="login-error"
              role="alert"
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.sp('mb', 4),
                cm.textCenter,
                cm.textSize('sm'),
                'rounded-lg bg-error-light text-error',
              )}
            >
              {error}
            </div>
          )}
          <div className={cm.cn('input-group')}>
            <input
              className={cm.cn('input-field')}
              aria-label={t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
              placeholder={t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
              required={true}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className={cm.cn('input-group')}>
            <input
              className={cm.cn('input-field')}
              aria-label={t('auth.login.password', {}, { defaultValue: 'Password' })}
              placeholder={t('auth.login.password', {}, { defaultValue: 'Password' })}
              required={true}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Link className={cm.cn('forgot-link')} to="/forgot-password">
            {t('auth.login.forgotPassword', {}, { defaultValue: 'Forgot password?' })}
          </Link>
          <button className={cm.cn('cta-button')} type="submit" disabled={loading}>
            {t('common.signIn', {}, { defaultValue: 'Sign In' })}
          </button>
        </form>
        {/* Divider */}
        <div className={cm.cn('divider')}>
          <span>{t('common.or', {}, { defaultValue: 'or' })}</span>
        </div>
        <SSOButton />
        {/* Footer Section */}
        <div className={cm.cn(cm.sp('mt', 8))}>
          <p className={cm.cn('footer-text')}>
            {t('auth.login.dontHaveAccount', {}, { defaultValue: "Don't have an account?" })}
            <Link to="/signup">{t('auth.login.signUp', {}, { defaultValue: 'Sign up' })}</Link>
          </p>
        </div>
      </div>

      {/* Mandatory Footer from Shared Components */}
      <footer
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', gap: 4 }),
          cm.w('full'),
          cm.sp('pb', 8),
          cm.sp('px', 6),
          'fixed bottom-0 left-0',
        )}
      >
        <p className={cm.cn('font-inter text-[11px] uppercase tracking-widest text-fuchsia-700')}>
          {t(
            'login.copyright',
            { year: new Date().getFullYear(), appName: APP_NAME },
            { defaultValue: '© {{year}} {{appName}}. All rights reserved.' },
          )}
        </p>
        <div className={cm.cn(cm.flex({ gap: 6 }))}>
          <LegalModalLinks
            linkClassName={cm.cn(
              'font-inter text-[11px] uppercase tracking-widest text-fuchsia-700 hover:text-cyan-400 transition-colors',
            )}
            appName={APP_NAME}
            loadContent={loadContent}
            privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
            termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
          />
          <Link
            className={cm.cn(
              'font-inter text-[11px] uppercase tracking-widest text-fuchsia-700 hover:text-cyan-400 transition-colors',
            )}
            to="/pricing"
          >
            {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
          </Link>
        </div>
      </footer>
    </div>
  )
}

export default Login
export { Login, Login as LoginPage }
