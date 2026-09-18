// Phase 1 — derived copy from Login (same stitch: design-team-chat-login.html).
// Phase 4 wires it to this screen's own auth flow.
// Do not hand-edit; Phase 2 will extract sections one at a time.
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'
function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [params] = useSearchParams()
  const token = params.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError(
        t(
          'auth.signup.passwordsDoNotMatchNoPeriod',
          {},
          { defaultValue: 'Passwords do not match' },
        ),
      )
      return
    }
    setLoading(true)
    setError(null)
    try {
      await http.post('/api/users/reset-password', { token, password })
      setSuccess(true)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('resetPassword.error', {}, { defaultValue: 'Unable to reset password' }),
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

        {success ? (
          <>
            <h1 className={cm.cn('header-title')}>
              {t('resetPassword.successTitle', {}, { defaultValue: 'Password reset successfully' })}
            </h1>
            <p className={cm.cn('subtitle')}>
              {t(
                'resetPassword.successSubtitle',
                {},
                { defaultValue: 'You can now sign in with your new password.' },
              )}
            </p>
            <Link
              className={cm.cn('cta-button')}
              to="/login"
              style={{
                display: 'block',
                width: '100%',
                background:
                  'linear-gradient(135deg, var(--mol-color-primary) 0%, var(--color-primary-container) 100%)',
                color: 'var(--color-on-primary)',
                border: 'none',
                borderRadius: '0.75rem',
                padding: '1rem',
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.9375rem',
                fontWeight: 600,
                textDecoration: 'none',
                textAlign: 'center',
                boxSizing: 'border-box',
                marginTop: '1.5rem',
              }}
            >
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </Link>
          </>
        ) : (
          <>
            {/* Header Section */}
            <h1 className={cm.cn('header-title')}>
              {t(
                'auth.resetPassword.setNewPasswordShort',
                {},
                { defaultValue: 'Set new password' },
              )}
            </h1>
            <p className={cm.cn('subtitle')}>
              {t('resetPassword.subtitle', {}, { defaultValue: 'Enter your new password below' })}
            </p>

            {/* Error */}
            {error && (
              <div
                data-mol-id="reset-password-error"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  backgroundColor: 'var(--color-error-container)',
                  color: 'var(--color-on-error-container)',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
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
                  placeholder={t('resetPassword.newPassword', {}, { defaultValue: 'New password' })}
                  required={true}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className={cm.cn('input-group')}>
                <input
                  className={cm.cn('input-field')}
                  placeholder={t(
                    'auth.signup.confirmPassword',
                    {},
                    { defaultValue: 'Confirm password' },
                  )}
                  required={true}
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <button
                className={cm.cn('cta-button')}
                type="submit"
                disabled={loading}
                style={{ cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1 }}
              >
                {loading
                  ? t('resetPassword.resetting', {}, { defaultValue: 'Resetting...' })
                  : t('resetPassword.reset', {}, { defaultValue: 'Reset Password' })}
              </button>
            </form>
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
            'resetPassword.backgroundAlt',
            {},
            { defaultValue: 'Design Aesthetic Background' },
          )}
          data-alt="abstract flowing background with deep purple and violet gradients creating a sense of professional depth and corporate sophistication"
          src="https://picsum.photos/seed/ResetPassword-1/1200/800"
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
        <div className={cm.flex({ gap: 6 })}>
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

export default ResetPassword
export { ResetPassword, ResetPassword as ResetPasswordPage }
