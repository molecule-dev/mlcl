import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { CalciteAuthHeader } from '../components/CalciteAuthHeader.js'
import { ThemeToggle } from '../components/ThemeToggle.js'

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
      // error is tracked in requestError state by usePasswordReset; nothing to do here
    }
  }

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.sp('p', 6),
        'bg-surface-container-low text-on-surface relative',
      )}
    >
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(37,99,235,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.06) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
        aria-hidden="true"
      />
      <div className="absolute top-6 right-6 z-10">
        <ThemeToggle />
      </div>
      <main className={cm.cn(cm.w('full'), cm.maxW('md'), 'relative z-10')}>
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'xl' }),
            cm.sp('p', 10),
            'bg-surface-container-lowest rounded-2xl shadow-xl shadow-primary/5 border border-outline-variant/40',
          )}
        >
          <CalciteAuthHeader
            tagline={t(
              'forgotPassword.tagline',
              {},
              { defaultValue: 'Recover access to your workbooks in two steps.' },
            )}
            title={t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
            subtitle={t(
              'forgotPassword.subtitle',
              {},
              { defaultValue: 'Enter your work email and we\u2019ll send a recovery link.' },
            )}
          />
          {!submitted ? (
            <form className={cm.cn(cm.w('full'), cm.stack(5))} onSubmit={handleSubmit}>
              {requestError && (
                <div
                  role="alert"
                  className={'px-4 py-3 text-sm text-error bg-error-container/40 rounded-xl'}
                >
                  {requestError.message}
                </div>
              )}
              <div className={cm.stack(2)}>
                <label
                  htmlFor="forgot-email"
                  className={'text-xs font-bold uppercase tracking-widest text-on-surface-variant'}
                >
                  {t('auth.workEmail', {}, { defaultValue: 'Work email' })}
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  placeholder={t(
                    'auth.passwordPlaceholderNameCompany',
                    {},
                    { defaultValue: 'name@company.com' },
                  )}
                  disabled={isSubmitting}
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'bg-surface-container-low rounded-xl border-0 focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/30 outline-none text-on-surface placeholder:text-on-surface-variant transition-all',
                  )}
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className={
                  'w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold text-on-primary rounded-xl bg-gradient-to-br from-primary to-primary-dark shadow-lg shadow-primary/25 hover:scale-[1.01] active:scale-[0.99] transition-transform disabled:opacity-60 disabled:cursor-not-allowed'
                }
              >
                {isSubmitting
                  ? t('forgotPassword.submitting', {}, { defaultValue: 'Sending recovery link…' })
                  : t('forgotPassword.cta', {}, { defaultValue: 'Send recovery link' })}
                <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                  mail
                </span>
              </button>
            </form>
          ) : (
            <div className={cm.stack(5)}>
              <div
                className={cm.cn(
                  cm.sp('p', 5),
                  'rounded-xl bg-secondary/10 border border-secondary/20',
                )}
              >
                <div className={cm.cn(cm.flex({ align: 'start', gap: 'sm' }))}>
                  <span
                    className={'material-symbols-outlined text-secondary mt-0.5'}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                    aria-hidden="true"
                  >
                    mark_email_read
                  </span>
                  <div className={cm.stack(1)}>
                    <p className={'text-sm font-bold text-on-surface'}>
                      {t('common.checkYourInbox', {}, { defaultValue: 'Check your inbox' })}
                    </p>
                    <p className={'text-sm text-on-surface-variant'}>
                      {t(
                        'forgotPassword.success',
                        { email },
                        {
                          defaultValue:
                            'We sent a recovery link to {{email}}. The token expires in 30 minutes.',
                        },
                      )}
                    </p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/reset-password')}
                className={
                  'w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold text-on-primary rounded-xl bg-gradient-to-br from-primary to-primary-dark shadow-lg shadow-primary/25 hover:scale-[1.01] transition-transform'
                }
              >
                {t('forgotPassword.continue', {}, { defaultValue: 'I have my recovery code' })}
                <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                  arrow_forward
                </span>
              </button>
            </div>
          )}
        </div>
        <p
          className={cm.cn(
            cm.sp('mt', 8),
            cm.textCenter,
            cm.textSize('sm'),
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
            className={'text-primary font-bold hover:underline decoration-2 underline-offset-4'}
          >
            {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </Link>
        </p>
      </main>
    </div>
  )
}

export default ForgotPassword
