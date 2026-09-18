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
      // Error tracked in hook state — hook's requestError drives the UI
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
        style={{ background: `${BRAND_COLOR}26` }}
        aria-hidden="true"
      />
      <div
        className={cm.cn(
          'fixed bottom-0 left-0 -z-10 w-1/4 h-1/4 rounded-full blur-[100px] -translate-x-1/3 translate-y-1/3 pointer-events-none',
        )}
        style={{ background: `${ACCENT_COLOR}26` }}
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

            <div className={cm.textCenter}>
              <h2 className={cm.cn(cm.textSize('2xl'), 'font-extrabold tracking-tight')}>
                {t('forgotPassword.heading', {}, { defaultValue: 'Forgot your password?' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mt-1')}>
                {t(
                  'forgotPassword.subheading',
                  {},
                  { defaultValue: 'Enter your email and we\u2019ll send a reset link.' },
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
                      placeholder="you@vivid.studio"
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
              <div
                className={cm.cn(
                  cm.textCenter,
                  cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
                )}
              >
                <div
                  className={cm.cn(
                    'w-16 h-16 rounded-full flex items-center justify-center shadow-md',
                  )}
                  style={{ background: SUBMIT_GRADIENT }}
                  aria-hidden="true"
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-3xl text-white')}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    mark_email_read
                  </span>
                </div>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    'forgotPassword.success',
                    { email },
                    {
                      defaultValue:
                        "If {{email}} matches an account, you'll get a reset link shortly.",
                    },
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className={cm.cn(
                    cm.sp('px', 6),
                    'py-2.5 rounded-full text-sm font-bold border border-outline-variant hover:bg-surface-container-low transition-colors',
                  )}
                >
                  {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
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
              <Link
                to="/login"
                className={cm.cn('font-bold hover:underline decoration-2 underline-offset-4')}
                style={{ color: BRAND_COLOR }}
              >
                ← {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
              </Link>
            </p>
          </footer>
        </div>
      </main>
      <Footer />
    </div>
  )
}
