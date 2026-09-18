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

  const isPending = requestStatus === 'pending'
  const isSent = requestStatus === 'resolved'
  const error = requestError

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await requestReset({ email })
      // error is surfaced via requestError from the hook — no additional handling needed here
    } catch (_error) {
      /* error tracked in hook state */
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
              'bg-surface-container-lowest rounded-2xl shadow-xl shadow-on-surface/5',
            )}
          >
            <AuthBrandHeader />

            <header className={cm.cn(cm.textCenter, cm.flex({ direction: 'col' }), 'gap-2')}>
              <h2 className={cm.cn(cm.textSize('xl'), 'font-bold tracking-tight')}>
                {t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'forgotPassword.subtitle',
                  {},
                  { defaultValue: "Enter your work email and we'll send a reset link." },
                )}
              </p>
            </header>

            {isSent ? (
              <div
                role="status"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 4),
                  cm.textSize('sm'),
                  cm.textCenter,
                  'bg-success-container/40 text-on-success-container rounded-xl',
                )}
              >
                {t(
                  'forgotPassword.success',
                  { email },
                  {
                    defaultValue: 'If an account exists for {{email}}, a reset link is on its way.',
                  },
                )}
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
                    {t('auth.workEmail', {}, { defaultValue: 'Work email' })}
                  </label>
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center' }),
                      cm.sp('px', 4),
                      'bg-surface-container-low rounded-xl py-3 ring-1 ring-outline-variant/40 focus-within:ring-2 focus-within:ring-primary',
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
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t(
                        'auth.passwordPlaceholderNameCompany',
                        {},
                        { defaultValue: 'name@company.com' },
                      )}
                      className={cm.cn(
                        cm.w('full'),
                        cm.fontWeight('medium'),
                        'bg-transparent border-none focus:ring-0 text-on-surface outline-none',
                      )}
                    />
                  </div>
                </div>

                {error ? (
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
                ) : null}

                <button
                  type="submit"
                  disabled={isPending}
                  className={cm.cn(
                    cm.sp('py', 4),
                    cm.roundedFull,
                    cm.textSize('base'),
                    cm.fontWeight('bold'),
                    'text-white bg-gradient-to-r from-primary to-secondary hover:shadow-lg hover:shadow-primary/30 active:scale-[0.99] transition-all disabled:opacity-60',
                  )}
                >
                  {isPending
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
            <Link
              to="/login"
              className={cm.cn(cm.textSize('sm'), 'font-bold text-primary hover:underline')}
            >
              ← {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
            </Link>
          </footer>
        </div>
      </main>
      <Footer />
    </div>
  )
}
