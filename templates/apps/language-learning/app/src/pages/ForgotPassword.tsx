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
      // Error tracked in hook state; no additional logging needed.
    }
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-gradient-to-br from-primary-container/60 via-background to-surface text-on-surface font-body relative overflow-hidden',
      )}
    >
      <div
        className={cm.cn(
          'absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/20 blur-3xl pointer-events-none',
        )}
        aria-hidden="true"
      />
      <div
        className={cm.cn(
          'absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-secondary/20 blur-3xl pointer-events-none',
        )}
        aria-hidden="true"
      />

      <main
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.flex1,
          cm.sp('p', 6),
          'relative z-10',
        )}
      >
        <div className={cm.cn(cm.w('full'), cm.maxW('md'))}>
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'xl' }),
              cm.sp('p', 10),
              'rounded-3xl bg-surface-container-lowest shadow-2xl shadow-primary/10 border border-outline-variant/30',
            )}
          >
            <AuthBrandHeader />

            <div className={cm.cn(cm.textCenter)}>
              <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'tracking-tight')}>
                {t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
                {submitted
                  ? t(
                      'forgotPassword.successBody',
                      {},
                      { defaultValue: 'Check your inbox — we sent a link to reset it.' },
                    )
                  : t(
                      'forgotPassword.subheading',
                      {},
                      { defaultValue: 'Drop your email and we’ll send a reset link.' },
                    )}
              </p>
            </div>

            {!submitted ? (
              <form
                className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}
                onSubmit={handleSubmit}
              >
                <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                  <label
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                      cm.sp('ml', 1),
                      'uppercase tracking-widest text-on-surface-variant',
                    )}
                    htmlFor="email"
                  >
                    {t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
                  </label>
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center' }),
                      cm.sp('px', 4),
                      'bg-surface-container-low rounded-2xl py-3.5 ring-2 ring-transparent focus-within:ring-primary transition-all',
                    )}
                  >
                    <span
                      className={cm.cn(
                        cm.sp('mr', 3),
                        cm.textSize('xl'),
                        'material-symbols-outlined text-primary',
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
                        cm.w('full'),
                        cm.sp('p', 0),
                        cm.fontWeight('medium'),
                        'bg-transparent border-none focus:ring-0 focus:outline-none placeholder:text-on-surface-variant/60',
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
                      'bg-error-container text-on-error-container rounded-2xl',
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
                    'bg-gradient-to-r from-primary to-primary-dark text-on-primary shadow-lg shadow-primary/30 hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-60',
                  )}
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
              <div className={cm.cn(cm.flex({ direction: 'col', align: 'center', gap: 'md' }))}>
                <div
                  className={cm.cn(
                    cm.w(16),
                    cm.h(16),
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.roundedFull,
                    'bg-success-container text-success',
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-3xl')}
                    aria-hidden="true"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    mark_email_read
                  </span>
                </div>
                <p className={cm.cn(cm.textSize('sm'), cm.textCenter, 'text-on-surface-variant')}>
                  {t(
                    'forgotPassword.successHint',
                    { email },
                    {
                      defaultValue:
                        'If {{email}} matches an account, the link will arrive within a minute.',
                    },
                  )}
                </p>
              </div>
            )}
          </div>

          <footer className={cm.cn(cm.sp('mt', 8), cm.textCenter)}>
            <Link
              to="/login"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                cm.textPrimary,
                'hover:underline decoration-2 underline-offset-4',
              )}
            >
              {t('auth.backToSignInArrow', {}, { defaultValue: '← Back to sign in' })}
            </Link>
          </footer>
        </div>
      </main>
      <Footer />
    </div>
  )
}
