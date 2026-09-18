import { useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'

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

  const isSubmitting = requestStatus === 'pending'
  const isSent = submitted

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await requestReset({ email })
      setSubmitted(true)
    } catch (_error) {
      // error tracked in hook state via requestError
    }
  }
  const error = requestError

  return (
    <div
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
              'bg-surface-container-lowest rounded-2xl shadow-xl shadow-primary/5',
            )}
          >
            <AuthBrandHeader />

            <header className={cm.textCenter}>
              <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
                {t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
                {t(
                  'forgotPassword.subheading',
                  {},
                  { defaultValue: 'Enter your email and we\u2019ll send you a reset link.' },
                )}
              </p>
            </header>

            {isSent ? (
              <div
                role="status"
                className={cm.cn(
                  cm.sp('p', 5),
                  cm.textCenter,
                  'rounded-xl bg-success-light text-success',
                )}
              >
                <span
                  className={'material-symbols-outlined block mx-auto mb-2'}
                  style={{ fontSize: '32px' }}
                  aria-hidden="true"
                >
                  mark_email_read
                </span>
                <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                  {t(
                    'forgotPassword.sent',
                    { email },
                    { defaultValue: 'Check {{email}} for the reset link.' },
                  )}
                </p>
              </div>
            ) : (
              <form
                className={cm.cn(cm.flex({ direction: 'col' }), 'gap-6')}
                onSubmit={handleSubmit}
              >
                <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
                  <label
                    htmlFor="email"
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                      cm.sp('ml', 1),
                      'uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('forgotPassword.emailLabel', {}, { defaultValue: 'Email Address' })}
                  </label>
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center' }),
                      cm.sp('px', 4),
                      'bg-surface-container-low rounded-xl py-3.5 focus-within:ring-2 focus-within:ring-primary/30',
                    )}
                  >
                    <span
                      className={cm.cn(
                        cm.sp('mr', 3),
                        cm.textSize('xl'),
                        'material-symbols-outlined text-on-surface-variant',
                      )}
                      aria-hidden="true"
                    >
                      mail
                    </span>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      placeholder={t(
                        'auth.passwordPlaceholderNameExample',
                        {},
                        { defaultValue: 'name@example.com' },
                      )}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={cm.cn(
                        cm.w('full'),
                        cm.sp('p', 0),
                        cm.fontWeight('medium'),
                        'bg-transparent border-none focus:outline-none text-on-surface placeholder:text-on-surface-variant/60',
                      )}
                    />
                  </div>
                </div>

                {error && (
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
                    {error.message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={cm.cn(
                    cm.sp('py', 4),
                    cm.roundedFull,
                    cm.textSize('lg'),
                    cm.fontWeight('bold'),
                    'text-on-primary hover:shadow-lg hover:shadow-primary/30 active:scale-95 transition-all disabled:opacity-60',
                  )}
                  style={{
                    background:
                      'linear-gradient(135deg, var(--mol-color-primary), var(--mol-color-primary-light))',
                  }}
                >
                  {isSubmitting
                    ? t('forgotPassword.submitting', {}, { defaultValue: 'Sending\u2026' })
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
            <Link
              to="/login"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-primary hover:underline',
              )}
            >
              {t('forgotPassword.backToLogin', {}, { defaultValue: '\u2190 Back to sign in' })}
            </Link>
          </footer>
        </div>
      </main>
      <Footer />
    </div>
  )
}
