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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await requestReset({ email })
      setSubmitted(true)
    } catch (_error) {
      // error is tracked in hook state via requestReset
    }
  }

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
              'bg-surface-container-lowest rounded-2xl shadow-lg shadow-primary/10',
            )}
          >
            <AuthBrandHeader />
            <div className={cm.cn('text-center -mt-2')}>
              <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
                {t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
                {t(
                  'forgot.subtitle',
                  {},
                  { defaultValue: 'Enter your email to receive a reset link.' },
                )}
              </p>
            </div>

            {submitted ? (
              <div
                className={cm.cn(
                  cm.flex({ direction: 'col', gap: 'md', align: 'center' }),
                  cm.textCenter,
                )}
              >
                <span
                  aria-hidden="true"
                  className={cm.cn(
                    'inline-flex items-center justify-center w-14 h-14 rounded-full bg-win-light text-win',
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-3xl')}>
                    mark_email_read
                  </span>
                </span>
                <p className={cm.cn(cm.textSize('sm'))}>
                  {t(
                    'forgot.success',
                    { email },
                    { defaultValue: 'Reset link sent to {{email}}. Check your inbox.' },
                  )}
                </p>
                <Link
                  to="/login"
                  className={cm.cn(
                    cm.sp('px', 6),
                    cm.sp('py', 3),
                    cm.textSize('sm'),
                    cm.fontWeight('bold'),
                    'rounded-full text-primary hover:bg-primary/10 transition-colors',
                  )}
                >
                  {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
                </Link>
              </div>
            ) : (
              <form
                className={cm.cn(cm.flex({ direction: 'col' }), 'gap-6')}
                onSubmit={handleSubmit}
              >
                <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
                  <label
                    className={cm.cn(
                      'text-xs font-bold uppercase tracking-widest text-on-surface-variant px-1',
                    )}
                    htmlFor="email"
                  >
                    {t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
                  </label>
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center' }),
                      cm.sp('px', 4),
                      'bg-surface-container-low rounded-t-lg py-3.5 ring-1 ring-transparent focus-within:ring-primary transition-shadow',
                    )}
                  >
                    <span
                      className={cm.cn(
                        cm.sp('mr', 3),
                        cm.textSize('xl'),
                        'material-symbols-outlined text-outline',
                      )}
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
                        'bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-outline/60',
                      )}
                    />
                  </div>
                </div>

                {requestError ? (
                  <div
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.textSize('sm'),
                      cm.textCenter,
                      'bg-error-container text-on-error-container rounded-xl',
                    )}
                    role="alert"
                  >
                    {requestError.message}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={cm.cn(
                    cm.sp('py', 4),
                    cm.roundedFull,
                    cm.textSize('lg'),
                    cm.sp('mt', 2),
                    cm.fontWeight('bold'),
                    'text-white hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] transition-all disabled:opacity-60',
                  )}
                  style={{
                    background:
                      'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                  }}
                >
                  {isSubmitting
                    ? t('forgot.submitting', {}, { defaultValue: 'Sending reset link…' })
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
                'text-sm font-bold text-primary hover:underline decoration-2 underline-offset-4',
              )}
            >
              {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
            </Link>
          </footer>
        </div>
      </main>
      <Footer />
    </div>
  )
}
