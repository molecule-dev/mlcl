import { useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'

const submitGradient =
  'linear-gradient(135deg, var(--mol-color-primary), var(--mol-color-secondary))'

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
      // Error tracked in hook state; no action needed here
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
            'w-[40%] h-[40%] rounded-full absolute bottom-[-10%] left-[-10%] bg-secondary/15 blur-[120px]',
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
                  { defaultValue: 'Enter your email and we\u2019ll send a reset link.' },
                )}
              </p>
            </div>

            {!submitted ? (
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
                      { defaultValue: 'you@nuzzle.app' },
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
            ) : (
              <div
                role="status"
                className={cm.cn(
                  cm.sp('p', 5),
                  cm.textCenter,
                  'rounded-xl bg-success-container text-on-success-container',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-3xl mb-2 block')}>
                  mark_email_read
                </span>
                <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('base'), cm.sp('mb', 1))}>
                  {t('common.checkYourInbox', {}, { defaultValue: 'Check your inbox' })}
                </p>
                <p className={cm.cn(cm.textSize('sm'))}>
                  {t(
                    'forgotPassword.successBody',
                    {},
                    {
                      defaultValue:
                        'If an account exists for that email, we\u2019ve sent a reset link.',
                    },
                  )}
                </p>
              </div>
            )}
          </div>

          <footer
            className={cm.cn(
              cm.sp('mt', 12),
              cm.flex({ direction: 'col', align: 'center' }),
              'gap-4',
            )}
          >
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
                  cm.flex({ align: 'center', gap: 'xs' }),
                  'inline-flex font-bold hover:underline decoration-2 underline-offset-4 text-primary-dark dark:text-primary',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-base')}>arrow_back</span>
                {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
              </Link>
            </p>
          </footer>
        </div>
      </main>
      <Footer />
    </div>
  )
}
