import { useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { LoginBrandPanel } from '../components/LoginBrandPanel.js'

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await requestReset({ email })
      setSubmitted(true)
    } catch (_error) {
      /* error tracked in hook */
    }
  }

  return (
    <div className={cm.cn(cm.minH('screen'), 'flex bg-background text-on-surface antialiased')}>
      <LoginBrandPanel />
      <main
        className={cm.cn(
          'flex-1 flex items-center justify-center',
          cm.sp('px', 6),
          cm.sp('py', 10),
        )}
      >
        <div className={cm.cn(cm.w('full'), cm.maxW('md'))}>
          <header className={cm.sp('mb', 8)}>
            <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-primary')}>
              {t('auth.resetPassword.accountRecovery', {}, { defaultValue: 'Account recovery' })}
            </p>
            <h1
              className={cm.cn(
                cm.sp('mt', 2),
                cm.textSize('3xl'),
                'font-extrabold tracking-tight text-on-surface',
              )}
            >
              {t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
            </h1>
            <p className={cm.cn(cm.sp('mt', 2), cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'forgotPassword.subheading',
                {},
                {
                  defaultValue: 'Enter the email on your account and we\u2019ll send a reset link.',
                },
              )}
            </p>
          </header>

          {submitted ? (
            <div
              className={cm.cn(
                cm.sp('p', 6),
                'rounded-2xl bg-success/10 border border-success/30 text-on-surface',
              )}
            >
              <p className={cm.cn('text-sm font-bold text-success')}>
                {t('common.checkYourInbox', {}, { defaultValue: 'Check your inbox' })}
              </p>
              <p className={cm.cn('mt-2 text-sm leading-relaxed text-on-surface-variant')}>
                {t(
                  'forgotPassword.successBody',
                  { email },
                  {
                    defaultValue:
                      'If {{email}} matches an account, a reset link is on its way \u2014 check spam if you don\u2019t see it.',
                  },
                )}
              </p>
              <Link
                to="/login"
                className={cm.cn(
                  'mt-4 inline-block text-xs font-bold text-primary hover:underline',
                )}
              >
                {t('forgotPassword.backToSignIn', {}, { defaultValue: '\u2190 Back to sign in' })}
              </Link>
            </div>
          ) : (
            <>
              {requestError ? (
                <div
                  role="alert"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.sp('mb', 6),
                    cm.textSize('sm'),
                    'rounded-xl bg-error/10 text-error font-semibold',
                  )}
                >
                  {requestError.message}
                </div>
              ) : null}
              <form
                onSubmit={handleSubmit}
                className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}
              >
                <div className={cm.flex({ direction: 'col', gap: 'sm' })}>
                  <label
                    htmlFor="email"
                    className={cm.cn(
                      'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
                  </label>
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center' }),
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'rounded-xl border border-outline-variant/30 bg-surface-container-lowest focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cm.cn(
                        'material-symbols-outlined text-[20px] text-on-surface-variant',
                      )}
                    >
                      mail
                    </span>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      autoComplete="email"
                      required
                      className={cm.cn(
                        cm.sp('ml', 3),
                        cm.fontWeight('medium'),
                        cm.textSize('sm'),
                        'flex-1 bg-transparent border-none outline-none text-on-surface placeholder:text-on-surface-variant/60',
                      )}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 3),
                    cm.sp('mt', 2),
                    cm.fontWeight('bold'),
                    cm.textSize('sm'),
                    'rounded-xl bg-primary text-on-primary shadow-md shadow-primary/20 hover:opacity-90 transition-opacity disabled:opacity-50',
                  )}
                >
                  {isSubmitting
                    ? t('forgotPassword.sending', {}, { defaultValue: 'Sending\u2026' })
                    : t(
                        'auth.forgotPassword.sendResetLink',
                        {},
                        { defaultValue: 'Send reset link' },
                      )}
                </button>
              </form>
              <p
                className={cm.cn(
                  cm.sp('mt', 8),
                  cm.textCenter,
                  cm.textSize('sm'),
                  'text-on-surface-variant',
                )}
              >
                {t('auth.login.rememberedIt', {}, { defaultValue: 'Remembered it?' })}{' '}
                <Link
                  to="/login"
                  className={cm.cn(cm.fontWeight('bold'), 'text-primary hover:underline')}
                >
                  {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
                </Link>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
