import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ACCENT_COLOR, BRAND_COLOR } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'

const SUBMIT_GRADIENT = `linear-gradient(135deg, ${BRAND_COLOR}, ${ACCENT_COLOR})`

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
      // Error tracked in hook state — hook surfaces it to the UI
    }
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'relative bg-surface-container-low font-body text-on-surface overflow-hidden',
      )}
    >
      <div
        className={cm.cn(
          'fixed top-0 right-0 -z-10 w-1/3 h-1/3 rounded-full blur-[120px] translate-x-1/3 -translate-y-1/3 pointer-events-none',
        )}
        style={{ background: `${BRAND_COLOR}1f` }}
        aria-hidden="true"
      />
      <div
        className={cm.cn(
          'fixed bottom-0 left-0 -z-10 w-1/4 h-1/4 rounded-full blur-[100px] -translate-x-1/3 translate-y-1/3 pointer-events-none',
        )}
        style={{ background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)' }}
        aria-hidden="true"
      />

      <main
        className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.flex1, cm.sp('p', 6))}
      >
        <div className={cm.cn(cm.w('full'), cm.maxW('md'))}>
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'xl' }),
              cm.sp('p', 10),
              'bg-surface-container-lowest rounded-xl shadow-md',
            )}
          >
            <AuthBrandHeader />

            <div className={cm.cn('text-center space-y-2')}>
              <h2 className={cm.cn('text-2xl font-extrabold tracking-tight')}>
                {t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
              </h2>
              <p className={cm.cn('text-sm text-on-surface-variant')}>
                {t(
                  'forgotPassword.subheading',
                  {},
                  { defaultValue: 'Enter your email and we\u2019ll send you a reset link.' },
                )}
              </p>
            </div>

            {!submitted ? (
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
                      'bg-surface-container-low rounded-t-lg py-3.5 border-b-2 border-outline focus-within:border-primary transition-colors',
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
                        'bg-transparent border-none focus:ring-0 outline-none text-on-surface placeholder:text-outline/60',
                      )}
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      placeholder={t(
                        'forgotPassword.emailPlaceholder',
                        {},
                        { defaultValue: 'listener@reverb.fm' },
                      )}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
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
                    'text-white hover:shadow-lg active:scale-95 transition-all disabled:opacity-60',
                  )}
                  style={{ background: SUBMIT_GRADIENT }}
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
              <div className={cm.cn('space-y-4 text-center')}>
                <div
                  className={cm.cn(
                    'inline-flex w-14 h-14 rounded-full items-center justify-center bg-primary/15',
                  )}
                >
                  <span
                    className="material-symbols-outlined text-3xl text-primary"
                    aria-hidden="true"
                  >
                    mark_email_read
                  </span>
                </div>
                <p className={cm.cn('text-base text-on-surface')}>
                  {t(
                    'forgotPassword.successHeading',
                    { email },
                    { defaultValue: 'Check your inbox at {{email}}.' },
                  )}
                </p>
                <p className={cm.cn('text-sm text-on-surface-variant')}>
                  {t(
                    'forgotPassword.successBody',
                    {},
                    {
                      defaultValue:
                        'If an account exists for that address, the reset link will arrive within a minute.',
                    },
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/reset-password')}
                  className={cm.cn('px-6 py-3 rounded-full text-sm font-bold text-white')}
                  style={{ background: SUBMIT_GRADIENT }}
                >
                  {t('forgotPassword.continue', {}, { defaultValue: 'I have a token →' })}
                </button>
              </div>
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
                className={cm.cn('font-bold hover:underline decoration-2 underline-offset-4 ml-1')}
                style={{ color: BRAND_COLOR }}
              >
                {t('forgotPassword.backToSignIn', {}, { defaultValue: 'Back to Sign In' })}
              </Link>
            </p>
          </footer>
        </div>
      </main>
      <Footer />
    </div>
  )
}
