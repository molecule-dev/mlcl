import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BrandWordmark } from '../components/BrandWordmark.js'

import { APP_NAME } from '../branding.js'

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
  const isSuccess = requestStatus === 'resolved'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await requestReset({ email })
    } catch (_error) {
      // tracked in hook state — usePasswordReset exposes requestError
    }
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'relative overflow-hidden bg-bg',
      )}
    >
      <div
        className={cm.cn('absolute inset-0 -z-10')}
        style={{
          background:
            'radial-gradient(circle at 20% 0%, var(--color-primary-light) 0%, transparent 45%), radial-gradient(circle at 100% 100%, var(--color-accent-light) 0%, transparent 50%), var(--color-bg)',
        }}
        aria-hidden="true"
      />
      <main
        className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.flex1, cm.sp('p', 6))}
      >
        <div className={cm.cn(cm.w('full'), cm.maxW('md'))}>
          <header className={cm.cn(cm.textCenter, cm.sp('mb', 8))}>
            <Link
              to="/"
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                cm.sp('mb', 4),
              )}
              aria-label={APP_NAME}
            >
              <BrandWordmark />
            </Link>
            <h1
              className={cm.cn(
                cm.textSize('3xl'),
                cm.fontWeight('bold'),
                'text-on-surface tracking-tight',
              )}
            >
              {t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
            </h1>
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
              {t(
                'forgotPassword.subtitle',
                {},
                { defaultValue: 'Enter your email — we\u2019ll send a one-time reset link.' },
              )}
            </p>
          </header>

          <div
            className={cm.cn(
              cm.sp('p', 8),
              'rounded-3xl bg-surface border border-border shadow-xl shadow-primary/5',
            )}
          >
            {isSuccess ? (
              <div className={cm.cn(cm.textCenter, cm.stack(4))}>
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.roundedFull,
                    'bg-success-light text-success mx-auto',
                  )}
                  style={{ width: 56, height: 56 }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 30 }}>
                    mark_email_read
                  </span>
                </span>
                <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface')}>
                  {t('common.checkYourInbox', {}, { defaultValue: 'Check your inbox' })}
                </h2>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    'forgotPassword.successBody',
                    { email },
                    {
                      defaultValue: 'We sent a reset link to {{email}}. It expires in 30 minutes.',
                    },
                  )}
                </p>
              </div>
            ) : (
              <form className={cm.stack(5)} onSubmit={handleSubmit}>
                <div className={cm.stack(2)}>
                  <label
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'block uppercase tracking-widest text-on-surface-variant',
                    )}
                    htmlFor="forgot-email"
                  >
                    {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                  </label>
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center' }),
                      cm.sp('px', 4),
                      'rounded-xl bg-bg-secondary border border-border focus-within:border-primary',
                    )}
                  >
                    <span
                      className="material-symbols-outlined text-on-surface-variant"
                      style={{ fontSize: 20 }}
                    >
                      mail
                    </span>
                    <input
                      id="forgot-email"
                      type="email"
                      autoComplete="email"
                      required
                      placeholder={t(
                        'forgotPassword.emailPlaceholder',
                        {},
                        { defaultValue: 'you@studio.co' },
                      )}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={cm.cn(
                        cm.w('full'),
                        cm.sp('px', 3),
                        cm.sp('py', 3),
                        cm.fontWeight('medium'),
                        'bg-transparent border-none focus:outline-none text-on-surface placeholder:text-on-surface-variant',
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
                    cm.sp('py', 4),
                    cm.fontWeight('bold'),
                    'rounded-xl text-white shadow-lg shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 transition-all',
                  )}
                  style={{
                    background:
                      'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
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
            )}
          </div>

          <p
            className={cm.cn(
              cm.textCenter,
              cm.textSize('sm'),
              cm.sp('mt', 8),
              'text-on-surface-variant',
            )}
          >
            <Link
              to="/login"
              className={cm.cn(cm.fontWeight('bold'), 'text-primary-dark hover:text-primary-hover')}
            >
              {t('auth.backToSignInArrow', {}, { defaultValue: '← Back to sign in' })}
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}

export default ForgotPassword
