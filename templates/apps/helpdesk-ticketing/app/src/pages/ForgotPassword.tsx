// Phase 1 — derived copy from Login (same stitch: design-helpdesk-ticketing-login.html).
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
  const legalLinkClass = cm.cn(
    'text-[10px] font-bold text-foreground-tertiary uppercase tracking-widest hover:text-sky-500 transition-colors',
  )
  const http = useHttpClient()
  // Cross-view auth form persistence — the email typed here carries to
  // Reset Password (and back to Login/Signup). NOT cleared on submit so it
  // survives the navigation to the reset view.
  const { fields: authFormFields, setField: setAuthFormField } = useAuthFormState()
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

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

  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'center' }),
        cm.sp('p', 6),
        cm.minH('screen'),
        'bg-background selection:bg-primary-fixed selection:text-on-primary-fixed',
      )}
    >
      <main
        className={cm.cn(
          cm.w('full'),
          cm.stack(10),
          'max-w-[440px] animate-in fade-in duration-700',
        )}
      >
        {/* Logo Area */}
        <div className={cm.cn(cm.flex({ direction: 'col', align: 'center' }))}>
          <div
            className={cm.cn(
              cm.w(12),
              cm.h(12),
              cm.flex({ align: 'center', justify: 'center' }),
              cm.sp('mb', 4),
              'rounded-xl bg-login-gradient login-card-shadow',
            )}
          >
            <span
              className={cm.cn(cm.textSize('3xl'), 'material-symbols-outlined text-white')}
              data-icon="cloud_done"
            >
              cloud_done
            </span>
          </div>
          <h1
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('bold'),
              'tracking-tight text-on-surface',
            )}
          >
            {t('app.name', { appName: APP_NAME }, { defaultValue: '{{appName}} Support' })}
          </h1>
        </div>
        {/* Login Card */}
        <div
          className={cm.cn(
            'bg-surface-container-lowest login-card-shadow rounded-xl overflow-hidden',
          )}
        >
          <div className={cm.cn(cm.sp('p', 8), 'md:p-10', cm.stack(10))}>
            <header className={cm.stack(2)}>
              <h2
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[2.25rem] leading-tight tracking-[-0.02em] text-on-surface',
                )}
              >
                {t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
              </h2>
              <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant')}>
                {t(
                  'forgotPassword.subheading',
                  {},
                  {
                    defaultValue:
                      'Enter your email and we will send you a link to reset your password.',
                  },
                )}
              </p>
            </header>
            <form className={cm.stack(6)} onSubmit={handleSubmit}>
              {/* Email Field */}
              <div className={cm.stack(2)}>
                <label
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'block text-on-surface-variant tracking-wide uppercase',
                  )}
                  htmlFor="email"
                >
                  {t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
                </label>
                <input
                  data-mol-id="input-email"
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('px', 4),
                    'py-3.5 bg-surface-container-low border-none rounded-lg text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary-container transition-all',
                  )}
                  id="email"
                  name="email"
                  placeholder={t(
                    'auth.passwordPlaceholderNameCompany',
                    {},
                    { defaultValue: 'name@company.com' },
                  )}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              {/* Success */}
              {sent && (
                <div
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.textSize('sm'),
                    cm.textCenter,
                    'bg-primary-container text-on-primary-container rounded-lg',
                  )}
                  role="status"
                >
                  {t(
                    'forgotPassword.successMessage',
                    {},
                    { defaultValue: 'Check your email for the reset link.' },
                  )}
                </div>
              )}
              {/* Submit Button */}
              {error && (
                <div
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.textSize('sm'),
                    cm.textCenter,
                    'bg-error-container text-on-error-container rounded-lg',
                  )}
                  role="alert"
                >
                  {error}
                </div>
              )}
              <button
                data-mol-id="btn-send-reset"
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 6),
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'py-4 rounded-lg bg-login-gradient text-white tracking-wide transition-all hover:opacity-95 active:scale-[0.98] login-card-shadow disabled:opacity-60',
                )}
                type="submit"
                disabled={loading || sent}
              >
                {loading
                  ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
                  : t('auth.forgotPassword.sendResetLink', {}, { defaultValue: 'Send reset link' })}
              </button>
            </form>
          </div>
          {/* Card Footer */}
          <div className={cm.cn(cm.sp('px', 8), cm.textCenter, 'bg-surface-container-low py-5')}>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'forgotPassword.rememberPassword',
                {},
                { defaultValue: 'Remember your password?' },
              )}

              <Link
                className={cm.cn(
                  'font-bold text-primary hover:text-primary-container transition-colors ml-1',
                )}
                to="/login"
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
            </p>
          </div>
        </div>
        {/* Global Footer (Shared Component Guidance) */}
        <footer
          className={cm.cn(
            cm.sp('mt', 12),
            cm.flex({ direction: 'col', align: 'center' }),
            cm.stack(4),
          )}
        >
          <div className={cm.cn(cm.flex({ wrap: 'wrap', justify: 'center' }), 'gap-x-8 gap-y-2')}>
            <LegalModalLinks
              linkClassName={legalLinkClass}
              appName={APP_NAME}
              loadContent={loadContent}
              privacyLabel={t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
              termsLabel={t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
            />
          </div>
          <p className={cm.cn('text-[10px] text-foreground-secondary uppercase tracking-wider')}>
            {t(
              'footer.copyright',
              { year: new Date().getFullYear(), appName: APP_NAME },
              { defaultValue: '© {{year}} {{appName}} Support' },
            )}
          </p>
        </footer>
      </main>
      {/* Decoration element */}
      <div
        className={cm.cn(
          cm.roundedFull,
          'fixed top-0 right-0 -z-10 w-1/3 h-1/3 bg-primary/5 blur-[120px] translate-x-1/2 -translate-y-1/2',
        )}
      ></div>
      <div
        className={cm.cn(
          cm.roundedFull,
          'fixed bottom-0 left-0 -z-10 w-1/4 h-1/4 bg-secondary/5 blur-[100px] -translate-x-1/3 translate-y-1/3',
        )}
      ></div>
    </div>
  )
}

export default ForgotPassword
export { ForgotPassword, ForgotPassword as ForgotPasswordPage }
