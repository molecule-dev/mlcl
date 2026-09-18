// Phase 1 — derived copy from Login (same stitch: design-lms-login.html).
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
      // The molecule core user resource exposes the password-reset endpoint
      // at `/api/users/forgot-password`, not `/api/auth/forgot-password`. The
      // wrong path silently 404'd and the user never got a reset email.
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
      <div className={cm.cn(cm.surface, 'font-body text-on-surface antialiased')}>
        <main
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.sp('p', 6),
            'min-h-screen bg-surface',
          )}
        >
          <div
            className={cm.cn(
              cm.w('full'),
              cm.maxW('md'),
              cm.sp('p', 12),
              'bg-surface-container-lowest scholar-shadow rounded-xl relative overflow-hidden',
            )}
          >
            <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }), cm.sp('mb', 10))}>
              <div
                className={cm.cn(
                  cm.w(10),
                  cm.h(10),
                  cm.flex({ align: 'center', justify: 'center' }),
                  'scholar-gradient rounded-lg shadow-md',
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-white')}
                  aria-hidden="true"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  school
                </span>
              </div>
              <h1
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'font-headline text-[1.75rem] text-on-surface tracking-tight',
                )}
              >
                {t('common.appName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
              </h1>
            </div>
            <div className={cm.cn(cm.flex({ justify: 'center' }), cm.sp('mb', 6))}>
              <div
                className={cm.cn(
                  cm.w(12),
                  cm.h(12),
                  cm.roundedFull,
                  cm.flex({ align: 'center', justify: 'center' }),
                  'bg-secondary-container',
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-on-secondary-container')}
                  aria-hidden="true"
                >
                  check_circle
                </span>
              </div>
            </div>
            <h2
              className={cm.cn(
                cm.fontWeight('semibold'),
                cm.sp('mb', 2),
                cm.textCenter,
                'font-headline text-[1.75rem] text-on-surface',
              )}
            >
              {t('forgotPassword.checkEmail', {}, { defaultValue: 'Check your email' })}
            </h2>
            <p
              className={cm.cn(
                cm.textCenter,
                cm.sp('mb', 8),
                cm.textSize('sm'),
                'text-on-surface-variant',
              )}
            >
              {t(
                'common.weSentAPasswordResetLink',
                { email },
                { defaultValue: 'We sent a password reset link to {{email}}.' },
              )}
            </p>
            <Link
              className={cm.cn(
                cm.textCenter,
                cm.textSize('sm'),
                'text-primary font-semibold hover:underline decoration-2 underline-offset-4 block',
              )}
              to="/login"
              data-mol-id="link-back-to-login"
            >
              {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className={cm.cn(cm.surface, 'font-body text-on-surface antialiased')}>
      {/* Shell Suppression: This is a focused login page, so TopNavBar/SideNav are excluded as per Shell Visibility & Relevance */}
      <main
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.sp('p', 6),
          'min-h-screen bg-surface',
        )}
      >
        <div
          className={cm.cn(
            cm.w('full'),
            cm.maxW('md'),
            cm.sp('p', 12),
            'bg-surface-container-lowest scholar-shadow rounded-xl relative overflow-hidden',
          )}
        >
          {/* Branding Section */}
          <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }), cm.sp('mb', 10))}>
            <div
              className={cm.cn(
                cm.w(10),
                cm.h(10),
                cm.flex({ align: 'center', justify: 'center' }),
                'scholar-gradient rounded-lg shadow-md',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-white')}
                aria-hidden="true"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                school
              </span>
            </div>
            <h1
              className={cm.cn(
                cm.fontWeight('bold'),
                'font-headline text-[1.75rem] text-on-surface tracking-tight',
              )}
            >
              {t('common.appName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
            </h1>
          </div>
          {/* Welcome Text */}
          <div className={cm.sp('mb', 10)}>
            <h2
              className={cm.cn(
                cm.fontWeight('semibold'),
                cm.sp('mb', 2),
                'font-headline text-[1.75rem] text-on-surface',
              )}
            >
              {t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'forgotPassword.subtitle',
                {},
                {
                  defaultValue:
                    "Enter your email and we'll send you a link to reset your password.",
                },
              )}
            </p>
          </div>
          {/* Form */}
          {error && (
            <div
              data-mol-id="forgot-password-error"
              className={cm.cn(
                cm.sp('mb', 4),
                cm.sp('p', 3),
                cm.textSize('sm'),
                'bg-error-container text-on-error-container rounded-xl',
              )}
              role="alert"
            >
              {error}
            </div>
          )}
          <form className={cm.stack(6)} onSubmit={handleSubmit}>
            {/* Email Field */}
            <div>
              <label
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.sp('mb', 2),
                  'block text-[0.6875rem] text-on-surface-variant tracking-[0.05em] font-label',
                )}
                htmlFor="email"
              >
                {t('forgotPassword.emailLabel', {}, { defaultValue: 'EMAIL' })}
              </label>
              <div className={cm.cn('relative')}>
                <input
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('py', 4),
                    cm.sp('px', 5),
                    cm.textSize('sm'),
                    'bg-surface-container-low border-none rounded-xl text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary/20 transition-all',
                  )}
                  id="email"
                  name="email"
                  placeholder={t(
                    'forgotPassword.emailPlaceholder',
                    {},
                    { defaultValue: 'Enter your email' },
                  )}
                  required={true}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            {/* CTA Button */}
            <button
              className={cm.cn(
                cm.w('full'),
                cm.fontWeight('semibold'),
                cm.sp('py', 4),
                cm.flex({ align: 'center', justify: 'center' }),
                'scholar-gradient text-on-primary rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all gap-2 group',
              )}
              type="submit"
              disabled={loading}
            >
              <span>
                {loading
                  ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
                  : t('forgotPassword.submit', {}, { defaultValue: 'Send Reset Link' })}
              </span>
              {!loading && (
                <span
                  className={cm.cn(
                    'material-symbols-outlined text-[1.2rem] group-hover:translate-x-1 transition-transform',
                  )}
                >
                  arrow_forward
                </span>
              )}
            </button>
          </form>
          {/* Secondary Action */}
          <div className={cm.cn(cm.sp('mt', 10), cm.textCenter)}>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'forgotPassword.rememberPassword',
                {},
                { defaultValue: 'Remember your password?' },
              )}

              <Link
                className={cm.cn(
                  cm.sp('ml', 1),
                  'text-primary font-semibold hover:underline decoration-2 underline-offset-4',
                )}
                to="/login"
              >
                {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
              </Link>
            </p>
          </div>
        </div>
      </main>
      {/* Footer Component as defined in JSON (Content/Styles merged) */}
      <footer
        className={cm.cn(
          cm.w('full'),
          cm.sp('py', 8),
          cm.sp('px', 8),
          cm.flex({ direction: 'col', align: 'center', justify: 'between' }),
          cm.mxAuto,
          'bg-surface-secondary md:flex-row max-w-screen-2xl gap-4',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-6')}>
          <span className={cm.cn(cm.textSize('sm'), "text-foreground-secondary font-['Inter']")}>
            {t(
              'footer.copyright',
              { year: new Date().getFullYear(), appName: APP_NAME },
              { defaultValue: '© {{year}} {{appName}} LMS. The Digital Curator.' },
            )}
          </span>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-8')}>
          <LegalModalLinks
            linkClassName={cm.cn(
              cm.textSize('sm'),
              "text-foreground-secondary font-['Inter'] hover:text-foreground dark:hover:text-white transition-all",
            )}
            appName={APP_NAME}
            loadContent={loadContent}
            privacyLabel={t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
            termsLabel={t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
          />
          <Link
            className={cm.cn(
              cm.textSize('sm'),
              "text-foreground-secondary font-['Inter'] hover:text-foreground dark:hover:text-white transition-all",
            )}
            to="/help"
          >
            {t('footer.contactSupport', {}, { defaultValue: 'Contact Support' })}
          </Link>
        </div>
      </footer>
    </div>
  )
}

export default ForgotPassword
export { ForgotPassword, ForgotPassword as ForgotPasswordPage }
