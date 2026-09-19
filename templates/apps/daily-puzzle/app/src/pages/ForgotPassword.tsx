import { useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { FloatingInput } from '../components/FloatingInput.js'
import { Footer } from '../components/Footer.js'
import { LexletLogo } from '../components/LexletLogo.js'
import { ThemeToggle } from '../components/ThemeToggle.js'

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
      // Error tracked in hook state (requestError); no additional handling needed
    }
  }

  return (
    <div
      className={cm.cn(cm.minH('screen'), 'bg-surface text-on-surface antialiased flex flex-col')}
    >
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 8),
          cm.sp('py', 5),
        )}
      >
        <Link to="/" aria-label={`${APP_NAME} home`}>
          <LexletLogo size="md" />
        </Link>
        <ThemeToggle />
      </header>

      <main
        className={cm.cn(
          cm.flex1,
          cm.flex({ align: 'center', justify: 'center' }),
          cm.sp('px', 6),
          cm.sp('py', 8),
        )}
      >
        <div
          className={cm.cn(
            'relative overflow-hidden rounded-[2rem] w-full bg-surface-container-lowest border border-outline-variant/20 shadow-2xl shadow-primary/10',
            cm.maxW('md'),
            cm.sp('p', 10),
          )}
        >
          <span
            className={cm.cn(
              'absolute -top-24 -right-24 w-56 h-56 rounded-full bg-primary/15 blur-3xl',
            )}
            aria-hidden="true"
          />
          <span
            className={cm.cn(
              'absolute -bottom-20 -left-20 w-48 h-48 rounded-full bg-amber-300/20 blur-3xl',
            )}
            aria-hidden="true"
          />
          <div className={cm.cn('relative')}>
            <h1
              className={cm.cn(
                'text-3xl md:text-4xl font-extrabold tracking-tight leading-tight mb-2',
              )}
            >
              {t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
            </h1>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mb', 6))}>
              {t(
                'forgotPassword.subhead',
                {},
                { defaultValue: 'Enter your email and we will send you a link to reset.' },
              )}
            </p>

            {submitted ? (
              <div
                className={cm.cn(
                  cm.sp('p', 5),
                  'rounded-2xl bg-success-light border border-emerald-200 text-success',
                )}
              >
                <p className={cm.cn('font-bold text-sm mb-1')}>
                  {t('forgotPassword.success.title', {}, { defaultValue: 'Check your inbox.' })}
                </p>
                <p className={cm.cn('text-xs')}>
                  {t(
                    'forgotPassword.success.body',
                    { email },
                    {
                      defaultValue:
                        'If an account exists for {{email}}, you\u2019ll get a reset link in a few minutes.',
                    },
                  )}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className={cm.stack(4)}>
                <FloatingInput
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  placeholder={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={cm.cn(
                    'w-full inline-flex items-center justify-center gap-2 px-7 py-3 rounded-2xl bg-gradient-to-r from-primary to-tertiary text-white font-extrabold text-sm uppercase tracking-widest shadow-xl shadow-primary/30 hover:scale-[1.01] transition-transform disabled:opacity-60',
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-[18px]')}
                    aria-hidden="true"
                  >
                    mail
                  </span>
                  {isSubmitting
                    ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
                    : t(
                        'auth.forgotPassword.sendResetLink',
                        {},
                        { defaultValue: 'Send reset link' },
                      )}
                </button>
                {requestError ? (
                  <p className={cm.cn('text-xs font-semibold text-error text-center')}>
                    {requestError.message}
                  </p>
                ) : null}
              </form>
            )}

            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.textCenter,
                cm.sp('mt', 6),
                'text-on-surface-variant',
              )}
            >
              <Link to="/login" className={cm.cn('font-extrabold text-primary hover:underline')}>
                {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
              </Link>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default ForgotPassword
