import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { MeridianBrandHeader } from '../components/MeridianBrandHeader.js'

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
  const isSubmitting = requestStatus === 'pending'
  const isDone = requestStatus === 'resolved'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await requestReset({ email })
    } catch (_error) {
      // tracked in hook state
    }
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-gradient-to-br from-primary/5 via-surface to-secondary/5 text-on-surface',
      )}
    >
      <main
        className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.flex1, cm.sp('p', 6))}
      >
        <div className={cm.cn(cm.w('full'), cm.maxW('md'))}>
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'lg' }),
              cm.sp('p', 10),
              'rounded-3xl bg-surface border border-outline-variant/40 shadow-2xl shadow-primary/10',
            )}
          >
            <MeridianBrandHeader />

            <header className={cm.cn(cm.textCenter, cm.flex({ direction: 'col', gap: 'xs' }))}>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}>
                {t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'meridian.forgot.subtitle',
                  {},
                  {
                    defaultValue:
                      'Enter the email associated with your inbox and we\u2019ll send a reset link.',
                  },
                )}
              </p>
            </header>

            {isDone ? (
              <div
                role="status"
                className={cm.cn(
                  cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
                  cm.sp('p', 6),
                  cm.textCenter,
                  'rounded-2xl bg-success-light text-success border border-success/30',
                )}
              >
                <span
                  className="material-symbols-outlined text-3xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  aria-hidden="true"
                >
                  check_circle
                </span>
                <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                  {t(
                    'meridian.forgot.success',
                    {},
                    {
                      defaultValue:
                        'If an account with that email exists, a reset link is on its way.',
                    },
                  )}
                </p>
              </div>
            ) : (
              <form
                className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}
                onSubmit={handleSubmit}
              >
                <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                  <label
                    htmlFor="email"
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      cm.sp('ml', 1),
                      'uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
                  </label>
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center' }),
                      cm.sp('px', 4),
                      'h-12 rounded-xl bg-surface-container-low border border-transparent focus-within:border-primary focus-within:bg-surface focus-within:ring-2 focus-within:ring-primary/20 transition-all',
                    )}
                  >
                    <span
                      className={cm.cn(
                        cm.sp('mr', 2),
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
                        'auth.passwordPlaceholderNameExample',
                        {},
                        { defaultValue: 'name@example.com' },
                      )}
                      className={cm.cn(
                        cm.flex1,
                        cm.sp('p', 0),
                        cm.fontWeight('medium'),
                        'bg-transparent border-none outline-none focus:ring-0 placeholder:text-on-surface-variant/60 text-on-surface',
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
                      'rounded-xl bg-error-light text-error',
                    )}
                  >
                    {requestError.message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={cm.cn(
                    cm.sp('py', 3),
                    cm.fontWeight('bold'),
                    cm.textSize('base'),
                    cm.sp('mt', 2),
                    'rounded-full bg-gradient-to-br from-primary to-secondary text-white shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.99] transition-all disabled:opacity-60',
                  )}
                >
                  {isSubmitting
                    ? t('common.sendingLinkEllipsis', {}, { defaultValue: 'Sending link…' })
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
                cm.fontWeight('bold'),
                'inline-flex items-center gap-1 text-primary hover:underline decoration-2 underline-offset-4',
              )}
            >
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                arrow_back
              </span>
              {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
            </Link>
          </footer>
        </div>
      </main>
    </div>
  )
}

export default ForgotPassword
