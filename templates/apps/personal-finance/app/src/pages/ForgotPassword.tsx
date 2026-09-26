// Phase 1 — derived copy from Login (same stitch: design-personal-finance-login.html).
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
  const securityUnavailableLabel = t(
    'forgotPassword.securityUnavailable',
    {},
    { defaultValue: 'Security center is not available in this build yet.' },
  )

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
          : t(
              'forgotPassword.error',
              {},
              { defaultValue: 'Could not send reset email. Please try again.' },
            ),
      )
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
          cm.sp('p', 6),
          cm.minH('screen'),
          'bg-surface-container-low font-body text-on-surface',
        )}
      >
        <main className={cm.cn(cm.w('full'), cm.maxW('md'))}>
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', gap: 'xl' }),
              cm.sp('p', 10),
              cm.textCenter,
              'bg-surface-container-lowest rounded-xl tonal-sculpting',
            )}
          >
            <div
              className={cm.cn(
                cm.w(12),
                cm.h(12),
                cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
                cm.sp('mb', 2),
                cm.roundedFull,
                'primary-gradient',
              )}
            >
              <span
                className={cm.cn(cm.textSize('3xl'), 'material-symbols-outlined text-white')}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
            </div>
            <div>
              <h2
                className={cm.cn(
                  cm.textSize('2xl'),
                  cm.fontWeight('bold'),
                  cm.textPrimary,
                  cm.sp('mb', 2),
                  'font-headline',
                )}
              >
                {t('common.checkYourEmail', {}, { defaultValue: 'Check your email.' })}
              </h2>
              <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant')}>
                {t(
                  'common.weSentAPasswordResetLink',
                  { email },
                  { defaultValue: 'We sent a password reset link to {{email}}.' },
                )}
              </p>
            </div>
            <Link
              data-mol-id="link-back-to-login"
              className={cm.cn('text-primary font-bold text-sm hover:underline')}
              to="/login"
            >
              {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.sp('p', 6),
        cm.minH('screen'),
        'bg-surface-container-low font-body text-on-surface',
      )}
    >
      <main className={cm.cn(cm.w('full'), cm.maxW('md'))}>
        {/* Login Card */}
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'xl' }),
            cm.sp('p', 10),
            'bg-surface-container-lowest rounded-xl tonal-sculpting',
          )}
        >
          {/* Branding Header */}
          <header className={cm.flex({ direction: 'col', align: 'center', gap: 'sm' })}>
            <div
              className={cm.cn(
                cm.w(12),
                cm.h(12),
                cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
                cm.sp('mb', 2),
                cm.roundedFull,
                'primary-gradient',
              )}
            >
              <span
                className={cm.cn(cm.textSize('3xl'), 'material-symbols-outlined text-white')}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                account_balance
              </span>
            </div>
            <h1
              className={cm.cn(
                cm.textSize('4xl'),
                cm.textPrimary,
                'font-headline font-extrabold tracking-tighter',
              )}
            >
              {t('common.appName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
            </h1>
            <p
              className={cm.cn(
                cm.fontWeight('medium'),
                cm.textSize('sm'),
                'text-on-surface-variant',
              )}
            >
              {t('forgotPassword.tagline', {}, { defaultValue: 'The Financial Curator' })}
            </p>
          </header>
          {/* Form */}
          <form className={cm.flex({ direction: 'col', gap: 'lg' })} onSubmit={handleSubmit}>
            {/* Email Field */}
            <div className={cm.flex({ direction: 'col', gap: 'sm' })}>
              <label
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  cm.sp('ml', 1),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
                htmlFor="email"
              >
                {t('forgotPassword.emailLabel', {}, { defaultValue: 'Email Address' })}
              </label>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center' }),
                  cm.sp('px', 4),
                  'relative bg-surface-container-low rounded-t-lg py-3.5 input-focus-border',
                )}
              >
                <span
                  className={cm.cn(
                    cm.textSize('xl'),
                    cm.sp('mr', 3),
                    'material-symbols-outlined text-outline',
                  )}
                >
                  mail
                </span>
                <input
                  className={cm.cn(
                    cm.w('full'),
                    cm.fontWeight('medium'),
                    cm.sp('p', 0),
                    'bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-outline/60',
                  )}
                  id="email"
                  placeholder={t(
                    'forgotPassword.emailPlaceholder',
                    {},
                    { defaultValue: 'curator@ledger.com' },
                  )}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            {error && (
              <div
                role="alert"
                aria-live="assertive"
                data-mol-id="forgot-password-error"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  cm.textCenter,
                  'bg-error-container text-on-error-container rounded-lg',
                )}
              >
                {error}
              </div>
            )}
            {/* Primary Action */}
            <button
              className={cm.cn(
                cm.sp('py', 4),
                cm.fontWeight('bold'),
                cm.textSize('lg'),
                cm.sp('mt', 4),
                'primary-gradient rounded-xl text-white font-headline hover:shadow-lg hover:shadow-primary/10 active:scale-95 transition-all',
              )}
              type="submit"
              disabled={loading}
            >
              {loading
                ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
                : t('forgotPassword.submit', {}, { defaultValue: 'Send Reset Link' })}
            </button>
          </form>
        </div>
        {/* Footer Link */}
        <footer className={cm.cn(cm.sp('mt', 8), cm.textCenter)}>
          <p
            className={cm.cn(cm.fontWeight('medium'), cm.textSize('sm'), 'text-on-surface-variant')}
          >
            {t('forgotPassword.rememberPassword', {}, { defaultValue: 'Remember your password?' })}{' '}
            <Link
              className={cm.cn(
                'text-primary font-bold hover:underline decoration-2 underline-offset-4 ml-1',
              )}
              to="/login"
            >
              {t('common.signIn', {}, { defaultValue: 'Sign In' })}
            </Link>
          </p>
        </footer>
      </main>
      {/* Global Footer from Shared Components (Condensed for Login View) */}
      <div
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', justify: 'between' }),
          cm.w('full'),
          cm.sp('px', 12),
          cm.sp('py', 8),
          'md:flex-row gap-6',
        )}
      >
        <span
          className={cm.cn(
            cm.textSize('lg'),
            'font-black text-primary font-headline tracking-tighter',
          )}
        >
          {t('common.appName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
        </span>
        <p
          className={cm.cn(
            cm.fontWeight('semibold'),
            'font-inter text-[10px] uppercase tracking-[0.2em] text-foreground-secondary',
          )}
        >
          {t(
            'common.copyright',
            { year: new Date().getFullYear(), appName: APP_NAME },
            { defaultValue: '© {{year}} {{appName}} Financial Services. All rights reserved.' },
          )}
        </p>
        <nav className={cm.flex({ gap: 'lg' })}>
          <LegalModalLinks
            show="both"
            linkClassName={cm.cn(
              'font-inter text-[10px] font-semibold uppercase tracking-[0.2em] text-foreground-secondary hover:text-success transition-colors',
            )}
            appName={APP_NAME}
            loadContent={loadContent}
            privacyLabel={t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
            termsLabel={t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
          />
          <button
            type="button"
            disabled
            title={securityUnavailableLabel}
            className={cm.cn(
              cm.fontWeight('semibold'),
              'font-inter text-[10px] uppercase tracking-[0.2em] text-foreground-tertiary transition-colors opacity-60 cursor-not-allowed bg-transparent border-0 p-0',
            )}
          >
            {t('nav.security', {}, { defaultValue: 'Security' })}
          </button>
        </nav>
      </div>
    </div>
  )
}

export default ForgotPassword
export { ForgotPassword, ForgotPassword as ForgotPasswordPage }
