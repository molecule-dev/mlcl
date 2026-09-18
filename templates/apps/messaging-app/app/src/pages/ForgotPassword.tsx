import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'

const submitGradient = 'linear-gradient(135deg, var(--color-accent), var(--color-accent-light))'

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
      // Error tracked in hook state — the hook surfaces it to the UI
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
            <AuthBrandHeader
              subtitle={
                submitted
                  ? t(
                      'forgotPassword.subtitleSent',
                      {},
                      { defaultValue: 'Check your email for a reset link.' },
                    )
                  : t(
                      'forgotPassword.subtitle',
                      {},
                      { defaultValue: 'Enter your email to receive a reset link.' },
                    )
              }
            />

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
                <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant')}>
                  {t(
                    'common.weSentAPasswordResetLink',
                    { email },
                    { defaultValue: 'We sent a password reset link to {{email}}.' },
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className={'font-bold text-sm hover:underline'}
                  style={{ color: 'var(--color-accent)' }}
                >
                  {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
                </button>
              </div>
            ) : (
              <form
                className={cm.cn(cm.flex({ direction: 'col' }), 'gap-5')}
                onSubmit={handleSubmit}
              >
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
                      { defaultValue: 'name@hush.app' },
                    )}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
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
                    cm.roundedFull,
                    cm.sp('mt', 2),
                    cm.textSize('base'),
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
                  style={{ color: 'var(--color-accent)' }}
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
