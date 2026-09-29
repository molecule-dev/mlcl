import { useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_TAGLINE } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'

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
      // intentional noop: error is tracked in hook state and displayed via requestError
    }
  }

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        cm.flex({ align: 'center', justify: 'center' }),
        cm.sp('p', 6),
        'bg-surface-container-low text-on-surface relative overflow-hidden',
      )}
    >
      <div
        className={cm.cn(
          'absolute -left-32 -top-32 w-96 h-96 rounded-full bg-primary/15 blur-3xl pointer-events-none',
        )}
      />
      <div
        className={cm.cn(
          'absolute -right-24 -bottom-24 w-80 h-80 rounded-full bg-success/20 blur-3xl pointer-events-none',
        )}
      />

      <main className={cm.cn(cm.w('full'), cm.maxW('md'), 'relative z-10')}>
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'lg' }),
            cm.sp('p', 10),
            'bg-surface-container-lowest rounded-[2rem] shadow-xl border border-outline-variant/30',
          )}
        >
          <header
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
              cm.textCenter,
            )}
          >
            <h1>
              <BrandWordmark as="span" size="lg" />
            </h1>
            <p className={cm.cn('text-sm font-medium text-on-surface-variant')}>{APP_TAGLINE}</p>
          </header>

          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), cm.textCenter)}>
            <h2 className={cm.cn('text-xl font-extrabold tracking-tight text-on-surface')}>
              {t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
            </h2>
            <p className={cm.cn('text-sm text-on-surface-variant')}>
              {t(
                'forgotPassword.subtitle',
                {},
                { defaultValue: "Tell us your email and we'll send a reset link." },
              )}
            </p>
          </div>

          {!submitted ? (
            <form
              onSubmit={handleSubmit}
              className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}
            >
              {requestError && (
                <div
                  role="alert"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.fontWeight('medium'),
                    'rounded-xl bg-error/10 text-error text-sm text-center',
                  )}
                >
                  {requestError.message}
                </div>
              )}
              <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                <span
                  className={cm.cn(
                    'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1',
                  )}
                >
                  {t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
                </span>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center' }),
                    cm.sp('px', 4),
                    'rounded-xl border border-outline-variant/40 bg-surface-container-low/50 focus-within:border-primary transition-colors',
                  )}
                >
                  <span
                    className={cm.cn(
                      'material-symbols-outlined text-base text-on-surface-variant mr-2',
                    )}
                  >
                    mail
                  </span>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={cm.cn(
                      'flex-1 py-3 bg-transparent border-none outline-none text-sm font-medium text-on-surface placeholder:text-on-surface-variant',
                    )}
                  />
                </div>
              </label>
              <button
                type="submit"
                disabled={isSubmitting}
                className={cm.cn(
                  cm.sp('py', 3),
                  cm.fontWeight('bold'),
                  cm.roundedFull,
                  cm.sp('mt', 2),
                  'text-base text-on-primary bg-gradient-to-r from-primary to-primary-hover hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-60',
                )}
              >
                {isSubmitting
                  ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
                  : t('auth.forgotPassword.sendResetLink', {}, { defaultValue: 'Send reset link' })}
              </button>
            </form>
          ) : (
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'sm', align: 'center' }),
                cm.textCenter,
                cm.sp('p', 6),
                'rounded-2xl bg-success-light text-success',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-3xl text-success')}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                mark_email_read
              </span>
              <p className={cm.cn('text-base font-bold tracking-tight')}>
                {t('forgotPassword.success.title', {}, { defaultValue: 'Check your inbox.' })}
              </p>
              <p className={cm.cn('text-sm')}>
                {t(
                  'forgotPassword.success.body',
                  { email },
                  {
                    defaultValue:
                      "If {{email}} is registered, you'll receive a reset link within a few minutes.",
                  },
                )}
              </p>
            </div>
          )}
        </div>
        <footer className={cm.cn(cm.sp('mt', 6), cm.textCenter)}>
          <Link
            to="/login"
            className={cm.cn(
              'text-sm font-bold text-primary hover:underline decoration-2 underline-offset-4',
            )}
          >
            ← {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
          </Link>
        </footer>
      </main>
    </div>
  )
}

export default ForgotPassword
