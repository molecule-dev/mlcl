import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BRAND_COLOR } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'

const submitGradient = `linear-gradient(135deg, ${BRAND_COLOR}, var(--color-inverse-primary))`

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
      // Error tracked in hook state via requestError
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
              'bg-surface-container-lowest rounded-xl tonal-sculpting',
            )}
          >
            <AuthBrandHeader />

            {submitted ? (
              <div
                className={cm.cn(
                  cm.flex({ direction: 'col', align: 'center', gap: 'lg' }),
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
                    className="material-symbols-outlined text-white text-3xl"
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
                      cm.sp('mb', 2),
                      'font-headline',
                    )}
                    style={{ color: BRAND_COLOR }}
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
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className={'font-bold text-sm hover:underline'}
                  style={{ color: BRAND_COLOR }}
                >
                  {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
                </button>
              </div>
            ) : (
              <>
                <div className={cm.textCenter}>
                  <h2
                    className={cm.cn(
                      cm.textSize('xl'),
                      cm.fontWeight('bold'),
                      cm.sp('mb', 2),
                      'font-headline text-on-surface',
                    )}
                  >
                    {t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
                  </h2>
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                    {t(
                      'auth.forgotPassword.enterEmailDescription',
                      {},
                      { defaultValue: 'Enter your email and we will send you a reset link.' },
                    )}
                  </p>
                </div>
                <form
                  className={cm.cn(cm.flex({ direction: 'col' }), 'gap-6')}
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
                          'bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-outline/60',
                        )}
                        id="email"
                        type="email"
                        autoComplete="email"
                        required
                        placeholder={t(
                          'forgotPassword.emailPlaceholder',
                          {},
                          { defaultValue: 'dispatch@parcel.ops' },
                        )}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  {requestError && (
                    <div
                      data-mol-id="forgot-error"
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
                      'rounded-xl',
                      cm.textSize('lg'),
                      cm.sp('mt', 2),
                      cm.fontWeight('bold'),
                      'text-white font-headline hover:shadow-lg active:scale-95 transition-all disabled:opacity-60',
                    )}
                    style={{ background: submitGradient }}
                  >
                    {isSubmitting
                      ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
                      : t('forgotPassword.submit', {}, { defaultValue: 'Send Reset Link' })}
                  </button>
                </form>
              </>
            )}
          </div>

          {!submitted && (
            <footer className={cm.cn(cm.sp('mt', 8), cm.textCenter)}>
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'text-on-surface-variant',
                )}
              >
                {t(
                  'auth.login.rememberedYourPassword',
                  {},
                  { defaultValue: 'Remembered your password?' },
                )}{' '}
                <Link
                  to="/login"
                  className={'font-bold hover:underline decoration-2 underline-offset-4 ml-1'}
                  style={{ color: BRAND_COLOR }}
                >
                  {t('forgotPassword.signIn', {}, { defaultValue: 'Sign In' })}
                </Link>
              </p>
            </footer>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
