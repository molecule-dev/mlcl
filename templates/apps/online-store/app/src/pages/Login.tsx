import React, { useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { OAuthProviderLogo } from '@molecule/app-oauth-logos-react'
import { useAuth, useTranslation } from '@molecule/app-react'

import { APP_NAME } from '../branding.js'
import { API_BASE_URL, oauthConfig } from '../config.js'

function startOAuth(provider: string) {
  window.location.href = `${API_BASE_URL}${oauthConfig.oauthEndpoint}/${provider}`
}

export function Login() {
  // Inter is served locally (index.html @font-face) — never load it from Google.
  // Apply it to the body for page-level consistency while this page is mounted.
  React.useEffect(() => {
    const originalFontFamily = document.body.style.fontFamily
    const originalFontSmoothing = document.body.style.getPropertyValue('-webkit-font-smoothing')
    const originalMozFontSmoothing = document.body.style.getPropertyValue('-moz-osx-font-smoothing')
    document.body.style.fontFamily = "'Inter', sans-serif"
    document.body.style.setProperty('-webkit-font-smoothing', 'antialiased')
    document.body.style.setProperty('-moz-osx-font-smoothing', 'grayscale')

    return () => {
      document.body.style.fontFamily = originalFontFamily
      document.body.style.setProperty('-webkit-font-smoothing', originalFontSmoothing)
      document.body.style.setProperty('-moz-osx-font-smoothing', originalMozFontSmoothing)
    }
  }, [])
  const { t } = useTranslation()
  const auth = useAuth()
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
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await auth.login({ email, password })
      clearAuthForm()
      window.location.href = '/'
    } catch (_error) {
      // Auth failure surfaced to the user via setError — no additional logging needed
      setError(t('login.error', {}, { defaultValue: 'Invalid email or password.' }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      data-mol-id="page-login"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'var(--color-surface-hover)',
        fontFamily: "'Inter', sans-serif",
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
      }}
    >
      {/* Auth Card */}
      <main
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: 'var(--color-surface)',
          borderRadius: '8px',
          padding: '44px 48px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)',
        }}
      >
        {/* Header */}
        <header style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 900,
              color: 'var(--mol-color-secondary)',
              marginBottom: '4px',
              lineHeight: 1.25,
              letterSpacing: '-0.025em',
            }}
          >
            {t('app.name', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
          </h1>
          <h2
            style={{
              fontSize: '22px',
              fontWeight: 600,
              color: 'var(--mol-color-secondary)',
              marginBottom: '4px',
            }}
          >
            {t('auth.login.signInTitle', {}, { defaultValue: 'Welcome back' })}
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--color-out-of-stock)', margin: 0 }}>
            {t('login.subtitle', {}, { defaultValue: 'Sign in to your account' })}
          </p>
        </header>

        {/* Form */}
        <form
          data-mol-id="form-login"
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          {/* Email Input */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label
              htmlFor="email"
              style={{
                fontSize: '14px',
                fontWeight: 500,
                color: 'var(--color-label-text)',
                marginBottom: '6px',
              }}
            >
              {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
            </label>
            <input
              data-mol-id="login-email-input"
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={{
                height: '44px',
                backgroundColor: 'var(--color-surface-secondary)',
                border: '1px solid var(--color-star-empty)',
                borderRadius: '8px',
                padding: '0 12px',
                fontSize: '14px',
                color: 'var(--mol-color-secondary)',
                outline: 'none',
                transition: 'all 0.2s',
              }}
            />
          </div>

          {/* Password Input */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px',
              }}
            >
              <label
                htmlFor="password"
                style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'var(--color-label-text)',
                }}
              >
                {t('auth.login.password', {}, { defaultValue: 'Password' })}
              </label>
              <Link
                to="/forgot-password"
                data-mol-id="login-forgot-password-link"
                style={{
                  fontSize: '13px',
                  color: 'var(--color-in-stock)',
                  fontWeight: 500,
                  textDecoration: 'none',
                  transition: 'color 0.2s',
                }}
              >
                {t('auth.login.forgotPassword', {}, { defaultValue: 'Forgot password?' })}
              </Link>
            </div>
            <input
              data-mol-id="login-password-input"
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                height: '44px',
                backgroundColor: 'var(--color-surface-secondary)',
                border: '1px solid var(--color-star-empty)',
                borderRadius: '8px',
                padding: '0 12px',
                fontSize: '14px',
                color: 'var(--mol-color-secondary)',
                outline: 'none',
                transition: 'all 0.2s',
              }}
            />
          </div>

          {error && (
            <div
              data-mol-id="login-error"
              style={{
                padding: '12px 16px',
                backgroundColor: 'var(--color-surface-secondary)',
                color: 'var(--color-error-text)',
                borderRadius: '8px',
                fontSize: '14px',
                textAlign: 'center',
              }}
            >
              {error}
            </div>
          )}

          {/* Submit Button */}
          <div style={{ paddingTop: '8px' }}>
            <button
              data-mol-id="login-submit-button"
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: '44px',
                backgroundColor: 'var(--color-in-stock)',
                color: 'var(--color-surface)',
                fontSize: '15px',
                fontWeight: 600,
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'wait' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {loading
                ? t('login.signingIn', {}, { defaultValue: 'Signing in...' })
                : t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </button>
          </div>
        </form>

        {/* Divider */}
        <div
          data-mol-id="login-divider"
          style={{
            position: 'relative',
            margin: '24px 0',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <div style={{ flexGrow: 1, borderTop: '1px solid var(--color-star-empty)' }} />
          <span
            style={{
              flexShrink: 0,
              margin: '0 16px',
              fontSize: '13px',
              color: 'var(--color-price-original)',
            }}
          >
            {t('oauth.orContinueWith', {}, { defaultValue: 'or continue with' })}
          </span>
          <div style={{ flexGrow: 1, borderTop: '1px solid var(--color-star-empty)' }} />
        </div>

        {/* Social Buttons */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            marginBottom: '28px',
          }}
        >
          <button
            data-mol-id="login-google-button"
            type="button"
            onClick={() => startOAuth('google')}
            aria-label={t(
              'oauth.continueWith',
              { provider: 'Google' },
              { defaultValue: 'Continue with {{provider}}' },
            )}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              height: '42px',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-star-empty)',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              color: 'var(--color-label-text)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <OAuthProviderLogo provider="google" size={20} ariaLabel="Google" />
            <span>Google</span>
          </button>
          <button
            data-mol-id="login-github-button"
            type="button"
            onClick={() => startOAuth('github')}
            aria-label={t(
              'oauth.continueWith',
              { provider: 'GitHub' },
              { defaultValue: 'Continue with {{provider}}' },
            )}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              height: '42px',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-star-empty)',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              color: 'var(--color-label-text)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <OAuthProviderLogo provider="github" size={20} ariaLabel="GitHub" />
            <span>GitHub</span>
          </button>
        </div>

        {/* Footer Link */}
        <footer style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: 'var(--color-out-of-stock)', margin: 0 }}>
            {t('auth.login.dontHaveAccount', {}, { defaultValue: "Don't have an account?" })}{' '}
            <Link
              to="/signup"
              data-mol-id="login-signup-link"
              style={{
                color: 'var(--color-in-stock)',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'color 0.2s',
              }}
            >
              {t('auth.login.signUp', {}, { defaultValue: 'Sign up' })}
            </Link>
          </p>
        </footer>
      </main>
    </div>
  )
}
