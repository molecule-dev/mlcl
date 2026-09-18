import { useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { loadContent } from '../config.js'

export function ForgotPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { requestStatus, requestError, requestReset } = usePasswordReset()
  // Cross-view auth form persistence — the email typed here carries to
  // Reset Password (and back to Login/Signup). NOT cleared on submit so it
  // survives the navigation to the reset view.
  const { fields: authFormFields, setField: setAuthFormField } = useAuthFormState()
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const [submitted, setSubmitted] = useState(false)
  const legalLinkClass = cm.cn(
    cm.textSize('xs'),
    cm.fontWeight('semibold'),
    'text-on-surface-variant hover:text-primary transition-colors',
  )

  const isSubmitting = requestStatus === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await requestReset({ email })
      setSubmitted(true)
    } catch (_error) {
      // hook exposes the error via its own state; no action needed here
    }
  }

  return (
    <div
      data-mol-id="page-forgot-password"
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-surface-container-low font-body text-on-surface',
      )}
    >
      <main
        className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.flex1, cm.sp('p', 6))}
      >
        <div className={cm.cn(cm.w('full'), cm.maxW('md'))}>
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'xl' }),
              cm.sp('p', 10),
              'bg-surface-container-lowest rounded-2xl shadow-xl shadow-primary/10',
            )}
          >
            <AuthBrandHeader />

            <div>
              <h2
                className={cm.cn(cm.textSize('xl'), cm.textCenter, 'font-extrabold tracking-tight')}
              >
                {t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
              </h2>
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.textCenter,
                  cm.sp('mt', 1),
                  'text-on-surface-variant',
                )}
              >
                {t(
                  'forgotPassword.subheading',
                  {},
                  { defaultValue: 'Enter your school email and we’ll send a reset link.' },
                )}
              </p>
            </div>

            {submitted ? (
              <div
                className={cm.cn(
                  cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
                  cm.sp('p', 6),
                  'rounded-2xl bg-success-light text-success text-center',
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-4xl text-success')}
                  aria-hidden="true"
                >
                  mark_email_read
                </span>
                <p className={cm.cn('font-bold')}>
                  {t('common.checkYourInbox', {}, { defaultValue: 'Check your inbox' })}
                </p>
                <p className={cm.cn(cm.textSize('sm'), 'max-w-sm')}>
                  {t(
                    'forgotPassword.successBody',
                    { email, appName: APP_NAME },
                    {
                      defaultValue:
                        'If {{email}} matches a {{appName}} account, a password reset link is on its way. Links expire in 30 minutes.',
                    },
                  )}
                </p>
              </div>
            ) : (
              <form
                className={cm.cn(cm.flex({ direction: 'col' }), 'gap-4')}
                onSubmit={handleSubmit}
              >
                <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
                  <label
                    htmlFor="forgot-email"
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                      cm.sp('ml', 1),
                      'uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                  </label>
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center' }),
                      cm.sp('px', 4),
                      'relative bg-surface-container-low rounded-t-lg py-3.5 border-b-2 border-outline-variant focus-within:border-primary',
                    )}
                  >
                    <span
                      className={cm.cn(
                        cm.sp('mr', 3),
                        cm.textSize('xl'),
                        'material-symbols-outlined text-primary',
                      )}
                    >
                      mail
                    </span>
                    <input
                      id="forgot-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@school.edu"
                      className={cm.cn(
                        cm.w('full'),
                        cm.sp('p', 0),
                        cm.fontWeight('medium'),
                        'bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-on-surface-variant focus:outline-none',
                      )}
                    />
                  </div>
                </div>

                {requestError && (
                  <div
                    role="alert"
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.textSize('sm'),
                      cm.textCenter,
                      'bg-error-container text-on-error-container rounded-xl',
                    )}
                  >
                    {requestError.message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={cm.cn(
                    cm.sp('py', 4),
                    cm.roundedFull,
                    cm.textSize('lg'),
                    cm.sp('mt', 2),
                    cm.fontWeight('bold'),
                    'bg-gradient-to-r from-primary to-primary/80 text-on-primary hover:shadow-lg hover:shadow-primary/30 active:scale-95 transition-all disabled:opacity-60',
                  )}
                >
                  {isSubmitting
                    ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
                    : t(
                        'auth.forgotPassword.sendResetLink',
                        {},
                        { defaultValue: 'Send reset link' },
                      )}
                </button>
              </form>
            )}
          </div>

          <footer className={cm.cn(cm.sp('mt', 8), cm.textCenter)}>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant',
              )}
            >
              <Link
                to="/login"
                className={cm.cn(
                  'font-bold text-primary hover:underline decoration-2 underline-offset-4',
                )}
              >
                {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
              </Link>
            </p>
            {/* Privacy/Terms open IN-PLACE modals instead of navigating away — the
                standalone /privacy and /terms routes still exist for deep links. */}
            <nav
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 'md' }),
                cm.sp('mt', 3),
              )}
            >
              <LegalModalLinks
                linkClassName={legalLinkClass}
                appName={APP_NAME}
                loadContent={loadContent}
                privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
                termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
              />
            </nav>
          </footer>
        </div>
      </main>
    </div>
  )
}
