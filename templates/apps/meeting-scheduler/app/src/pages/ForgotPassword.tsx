import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'

export function ForgotPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
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
      // Error tracked in hook state
    }
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-surface-container-low text-on-surface',
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
              'bg-surface-container-lowest rounded-3xl shadow-xl shadow-primary/5',
            )}
          >
            <AuthBrandHeader />

            <div className={cm.textCenter}>
              <h2 className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight')}>
                {submitted
                  ? t('common.checkYourInbox', {}, { defaultValue: 'Check your inbox' })
                  : t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
                {submitted
                  ? t(
                      'forgotPassword.successBody',
                      { email },
                      {
                        defaultValue:
                          'We just emailed a reset link to {{email}}. The link expires in 30 minutes.',
                      },
                    )
                  : t(
                      'forgotPassword.subheading',
                      {},
                      { defaultValue: 'Enter your email and we’ll send you a reset link.' },
                    )}
              </p>
            </div>

            {!submitted ? (
              <form
                className={cm.cn(cm.flex({ direction: 'col' }), 'gap-5')}
                onSubmit={handleSubmit}
              >
                <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
                  <label
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                      cm.sp('ml', 1),
                      'uppercase tracking-widest text-on-surface-variant',
                    )}
                    htmlFor="forgot-email"
                  >
                    {t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
                  </label>
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center' }),
                      cm.sp('px', 4),
                      'relative bg-surface-container-low rounded-2xl py-3.5 focus-within:ring-2 focus-within:ring-primary/40 transition-all',
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
                      className={cm.cn(
                        cm.w('full'),
                        cm.sp('p', 0),
                        cm.fontWeight('medium'),
                        'bg-transparent border-none focus:ring-0 focus:outline-none text-on-surface placeholder:text-outline/60',
                      )}
                      id="forgot-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t(
                        'auth.passwordPlaceholderNameExample',
                        {},
                        { defaultValue: 'name@example.com' },
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
                    'text-white hover:shadow-lg hover:shadow-primary/30 active:scale-95 transition-all disabled:opacity-60',
                  )}
                  style={{
                    background:
                      'linear-gradient(135deg, var(--color-primary), var(--color-primary-gradient-to))',
                  }}
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
            ) : (
              <button
                type="button"
                onClick={() => navigate('/login')}
                className={cm.cn(
                  cm.sp('py', 4),
                  cm.roundedFull,
                  cm.textSize('lg'),
                  cm.fontWeight('bold'),
                  'text-white hover:shadow-lg hover:shadow-primary/30 active:scale-95 transition-all',
                )}
                style={{
                  background:
                    'linear-gradient(135deg, var(--color-primary), var(--color-primary-gradient-to))',
                }}
              >
                {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
              </button>
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
              {t('auth.login.rememberedIt', {}, { defaultValue: 'Remembered it?' })}{' '}
              <Link
                to="/login"
                className={
                  'font-bold text-primary hover:underline decoration-2 underline-offset-4 ml-1'
                }
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
            </p>
          </footer>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default ForgotPassword
