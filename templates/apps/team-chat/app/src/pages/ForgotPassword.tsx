// Phase 1 — derived copy from Login (same stitch: design-team-chat-login.html).
// Phase 4 wires it to this screen's own auth flow.
// Do not hand-edit; Phase 2 will extract sections one at a time.
import { useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'
function ForgotPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  // Cross-view auth form persistence — the email typed here carries to
  // Reset Password (and back to Login/Signup). NOT cleared on submit so it
  // survives the navigation to the reset view.
  const { fields: authFormFields, setField: setAuthFormField } = useAuthFormState()
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await http.post('/api/users/forgot-password', { email })
      setSent(true)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('forgotPassword.error', {}, { defaultValue: 'Could not send reset email' }),
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
        {sent ? (
          <>
            {/* Success Section */}
            <div style={{ marginBottom: '1.5rem', color: 'var(--color-secondary)' }}>
              <span className={cm.cn('material-symbols-outlined')} style={{ fontSize: '48px' }}>
                check_circle
              </span>
            </div>
            <h1 className={cm.cn('header-title')}>
              {t('forgotPassword.checkEmail', {}, { defaultValue: 'Check your email' })}
            </h1>
            <p className={cm.cn('subtitle')}>
              {t(
                'common.weSentAPasswordResetLink',
                { email },
                { defaultValue: 'We sent a password reset link to {{email}}.' },
              )}
            </p>
            <div style={{ marginTop: '1.5rem' }}>
              <Link
                className={cm.cn('footer-text')}
                style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}
                to="/login"
              >
                {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
              </Link>
            </div>
          </>
        ) : (
          <>
            {/* Header Section */}
            <h1 className={cm.cn('header-title')}>
              {t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
            </h1>
            <p className={cm.cn('subtitle')}>
              {t(
                'forgotPassword.subtitle',
                {},
                { defaultValue: "Enter your email and we'll send you a reset link" },
              )}
            </p>
            {/* Error Section */}
            {error && (
              <div
                data-mol-id="forgot-password-error"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  backgroundColor: 'var(--color-error-container)',
                  color: 'var(--color-error)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  marginBottom: '1.25rem',
                  textAlign: 'center',
                }}
              >
                {error}
              </div>
            )}
            {/* Form Section */}
            <form className={cm.cn('form-container')} onSubmit={handleSubmit}>
              <div className={cm.cn('input-group')}>
                <input
                  className={cm.cn('input-field')}
                  placeholder={t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
                  required={true}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <button className={cm.cn('cta-button')} type="submit" disabled={loading}>
                {loading
                  ? t('forgotPassword.sending', {}, { defaultValue: 'Sending...' })
                  : t('forgotPassword.submit', {}, { defaultValue: 'Send Reset Link' })}
              </button>
            </form>
            {/* Footer Section */}
            <div style={{ marginTop: '2.5rem' }}>
              <p className={cm.cn('footer-text')}>
                <Link
                  to="/login"
                  style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}
                >
                  {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
                </Link>
              </p>
            </div>
          </>
        )}
      </div>
      {/* Minimalistic Decorative Elements for "Chromatic Architect" Feel */}
      <div
        style={{
          position: 'fixed',
          top: '10%',
          right: '5%',
          width: '300px',
          height: '300px',
          background:
            'radial-gradient(circle, color-mix(in srgb, var(--color-secondary) 5%, transparent) 0%, transparent 70%)',
          zIndex: '-1',
        }}
      ></div>
      <div
        style={{
          position: 'fixed',
          bottom: '10%',
          left: '5%',
          width: '400px',
          height: '400px',
          background:
            'radial-gradient(circle, color-mix(in srgb, var(--color-primary) 3%, transparent) 0%, transparent 70%)',
          zIndex: '-1',
        }}
      ></div>
      {/* Background Image Mock for Context */}
      <div
        style={{
          position: 'fixed',
          top: '0',
          left: '0',
          width: '100%',
          height: '100%',
          zIndex: '-2',
          opacity: '0.4',
          pointerEvents: 'none',
        }}
      >
        <img
          alt={t(
            'forgotPassword.backgroundAlt',
            {},
            { defaultValue: 'Design Aesthetic Background' },
          )}
          data-alt="abstract flowing background with deep purple and violet gradients creating a sense of professional depth and corporate sophistication"
          src="https://picsum.photos/seed/ForgotPassword-1/1200/800"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
      {/* Mandatory Footer from Shared Components */}
      <footer
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', gap: 4 }),
          cm.sp('pb', 8),
          cm.sp('px', 6),
          'fixed bottom-0 left-0 w-full',
        )}
      >
        <p className={cm.cn('font-inter text-[11px] uppercase tracking-widest text-fuchsia-700')}>
          {t(
            'common.copyright',
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

export default ForgotPassword
export { ForgotPassword, ForgotPassword as ForgotPasswordPage }
