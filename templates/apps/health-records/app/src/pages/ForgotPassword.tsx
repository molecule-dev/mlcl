import { useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BRAND_COLOR } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'

const submitGradient = `linear-gradient(135deg, ${BRAND_COLOR}, #14b8a6)`

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
      // error is captured in requestError from the hook — no further handling needed
    }
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-surface-container-low font-body text-on-surface relative',
      )}
    >
      <div
        className={cm.cn('fixed inset-0 -z-10 overflow-hidden pointer-events-none')}
        aria-hidden="true"
      >
        <div
          className={cm.cn(
            'w-[40%] h-[40%] rounded-full absolute top-[-10%] right-[-10%] bg-primary/10 blur-[120px]',
          )}
        />
        <div
          className={cm.cn(
            'w-[40%] h-[40%] rounded-full absolute bottom-[-10%] left-[-10%] bg-secondary/10 blur-[120px]',
          )}
        />
      </div>

      <main
        className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.flex1, cm.sp('p', 6))}
      >
        <div className={cm.cn(cm.w('full'), cm.maxW('md'))}>
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'xl' }),
              cm.sp('p', 10),
              'bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm',
            )}
          >
            <AuthBrandHeader />

            {submitted ? (
              <div
                className={cm.cn(
                  cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
                  cm.textCenter,
                )}
              >
                <div
                  className={cm.cn(
                    cm.w(12),
                    cm.h(12),
                    cm.roundedFull,
                    cm.flex({ align: 'center', justify: 'center' }),
                  )}
                  style={{ background: submitGradient }}
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-3xl text-white')}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    check_circle
                  </span>
                </div>
                <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
                  {t('forgotPassword.checkEmail', {}, { defaultValue: 'Check your email' })}
                </h2>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    'common.weSentAPasswordResetLink',
                    { email },
                    { defaultValue: 'We sent a password reset link to {{email}}.' },
                  )}
                </p>
                <Link
                  to="/login"
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('bold'),
                    'text-primary hover:underline',
                  )}
                >
                  {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
                </Link>
              </div>
            ) : (
              <>
                <div>
                  <h2
                    className={cm.cn(
                      cm.textSize('2xl'),
                      cm.fontWeight('bold'),
                      cm.textCenter,
                      cm.sp('mb', 1),
                    )}
                  >
                    {t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
                  </h2>
                  <p className={cm.cn(cm.textSize('sm'), cm.textCenter, 'text-on-surface-variant')}>
                    {t(
                      'forgotPassword.subtitle',
                      {},
                      { defaultValue: 'Enter your email to receive a reset link.' },
                    )}
                  </p>
                </div>

                <form
                  className={cm.cn(cm.flex({ direction: 'col' }), 'gap-5')}
                  onSubmit={handleSubmit}
                >
                  <div>
                    <label
                      className={cm.cn(
                        cm.fontWeight('semibold'),
                        cm.sp('mb', 2),
                        'block text-[0.6875rem] text-on-surface-variant tracking-[0.05em]',
                      )}
                      htmlFor="email"
                    >
                      {t('forgotPassword.emailLabel', {}, { defaultValue: 'EMAIL' })}
                    </label>
                    <input
                      className={cm.cn(
                        cm.w('full'),
                        cm.sp('py', 4),
                        cm.sp('px', 5),
                        cm.textSize('sm'),
                        'bg-surface-container-low border-none rounded-xl text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary/20 transition-all',
                      )}
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      placeholder={t(
                        'forgotPassword.emailPlaceholder',
                        {},
                        { defaultValue: 'patient@example.com' },
                      )}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
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
                      cm.sp('mt', 2),
                      cm.textSize('base'),
                      cm.fontWeight('bold'),
                      'rounded-xl text-white hover:shadow-lg active:scale-95 transition-all disabled:opacity-60',
                    )}
                    style={{ background: submitGradient }}
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
              </>
            )}
          </div>

          <footer
            className={cm.cn(
              cm.sp('mt', 12),
              cm.flex({ direction: 'col', align: 'center' }),
              'gap-4',
            )}
          >
            <span
              className={cm.cn(
                'text-[10px] font-bold text-foreground-tertiary uppercase tracking-widest',
              )}
            >
              {t(
                'forgotPasswordFooter.hipaa',
                {},
                { defaultValue: 'HIPAA Compliant · End-to-end encrypted' },
              )}
            </span>
            {!submitted && (
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'text-on-surface-variant',
                )}
              >
                <Link
                  to="/login"
                  className={cm.cn('font-bold hover:underline decoration-2 underline-offset-4')}
                  style={{ color: BRAND_COLOR }}
                >
                  {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
                </Link>
              </p>
            )}
          </footer>
        </div>
      </main>
      <Footer />
    </div>
  )
}
