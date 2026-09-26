import { useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { post } from '@molecule/app-http'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

function ForgotPassword() {
  const { t } = useTranslation()
  const cm = getClassMap()
  // Cross-view auth form persistence — the email typed here carries to
  // Reset Password (and back to Login/Signup). NOT cleared on submit so it
  // survives the navigation to the reset view.
  const { fields: authFormFields, setField: setAuthFormField } = useAuthFormState()
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await post('/api/users/forgot-password', { email })
      setSent(true)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('forgotPassword.sendError', {}, { defaultValue: 'Could not send reset email' }),
      )
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div
        data-mol-id="page-forgot-sent"
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.minH('screen'),
          'bg-background text-on-surface antialiased',
        )}
      >
        <main
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.sp('p', 6),
            'flex-grow relative overflow-hidden',
          )}
        >
          <div
            className={cm.cn(
              cm.w('[40vw]'),
              cm.h('[40vw]'),
              cm.roundedFull,
              'absolute top-[-10%] left-[-10%] bg-surface-container blur-3xl opacity-50 mix-blend-multiply pointer-events-none',
            )}
          ></div>
          <div
            className={cm.cn(
              cm.w('[50vw]'),
              cm.h('[50vw]'),
              cm.roundedFull,
              'absolute bottom-[-10%] right-[-10%] bg-surface-variant blur-3xl opacity-30 mix-blend-multiply pointer-events-none',
            )}
          ></div>
          <div
            className={cm.cn(
              cm.sp('p', 10),
              cm.w('full'),
              cm.textCenter,
              cm.maxW('[420px]'),
              'bg-surface-container-lowest rounded-xl relative z-10',
            )}
            style={{ boxShadow: 'var(--shadow-lg)' }}
          >
            <h1
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.sp('mb', 2),
                cm.textPrimary,
                'text-[2.75rem] tracking-tight leading-none font-headline',
              )}
            >
              {t('common.appName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
            </h1>
            <p
              data-mol-id="forgot-sent"
              className={cm.cn(
                cm.textSize('sm'),
                cm.sp('mt', 4),
                'text-on-surface-variant leading-relaxed',
              )}
            >
              {t('forgotPassword.sent', {}, { defaultValue: 'Check your email for a reset link.' })}
            </p>
            <Link
              data-mol-id="forgot-back-to-login"
              className="mt-6 inline-block font-medium text-primary hover:text-primary-container transition-colors text-[0.875rem]"
              to="/login"
            >
              {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div
      data-mol-id="page-forgot-password"
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-background text-on-surface antialiased',
      )}
    >
      <main
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.sp('p', 6),
          'flex-grow relative overflow-hidden',
        )}
      >
        <div
          aria-hidden="true"
          className={cm.cn(
            cm.w('[40vw]'),
            cm.h('[40vw]'),
            cm.roundedFull,
            'absolute top-[-10%] left-[-10%] bg-surface-container blur-3xl opacity-50 mix-blend-multiply pointer-events-none',
          )}
        ></div>
        <div
          aria-hidden="true"
          className={cm.cn(
            cm.w('[50vw]'),
            cm.h('[50vw]'),
            cm.roundedFull,
            'absolute bottom-[-10%] right-[-10%] bg-surface-variant blur-3xl opacity-30 mix-blend-multiply pointer-events-none',
          )}
        ></div>
        <div
          className={cm.cn(
            cm.sp('p', 10),
            cm.w('full'),
            'bg-surface-container-lowest rounded-xl max-w-[420px] relative z-10',
          )}
          style={{ boxShadow: 'var(--shadow-lg)' }}
        >
          <div className={cm.cn(cm.textCenter, cm.sp('mb', 8))}>
            <h1
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.sp('mb', 2),
                cm.textPrimary,
                'text-[2.75rem] tracking-tight leading-none font-headline',
              )}
            >
              {t('common.appName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
            </h1>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
              {t(
                'forgotPassword.subtitle',
                {},
                { defaultValue: 'Enter your email to receive a password reset link.' },
              )}
            </p>
          </div>
          <form data-mol-id="forgot-form" className={cm.stack(6)} onSubmit={handleSubmit}>
            <div className={cm.stack(4)}>
              <div>
                <label
                  className={cm.cn(
                    cm.fontWeight('medium'),
                    cm.sp('ml', 1),
                    'block text-[0.6875rem] uppercase tracking-widest text-on-surface mb-1.5',
                  )}
                  htmlFor="email"
                >
                  {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                </label>
                <div className="relative">
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center' }),
                      cm.sp('pl', 3),
                      cm.sp('pr', 3),
                      'absolute inset-y-0 left-0 pointer-events-none text-outline',
                    )}
                  >
                    <span className="material-symbols-outlined text-[1.25rem]">mail</span>
                  </span>
                  <input
                    data-mol-id="forgot-email"
                    className={cm.cn(
                      cm.w('full'),
                      cm.sp('pl', 10),
                      cm.sp('pr', 4),
                      cm.sp('py', 3),
                      cm.textSize('sm'),
                      'bg-surface-container-low border-transparent rounded-xl text-on-surface focus:ring-2 focus:ring-primary/30 focus:bg-surface-container-lowest focus:border-transparent transition-all duration-300',
                    )}
                    id="email"
                    name="email"
                    placeholder={t(
                      'forgotPassword.emailPlaceholder',
                      {},
                      { defaultValue: 'agent@rapport.io' },
                    )}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
            {error && (
              <p
                data-mol-id="forgot-error"
                role="alert"
                className={cm.cn(cm.textSize('sm'), cm.textCenter, 'text-error')}
              >
                {error}
              </p>
            )}
            <div>
              <button
                data-mol-id="forgot-submit"
                className={cm.cn(
                  cm.w('full'),
                  cm.flex({ justify: 'center' }),
                  cm.sp('px', 4),
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'py-3.5 border border-transparent rounded-xl text-on-primary bg-gradient-to-br from-primary to-primary-container hover:scale-[1.02] transition-transform duration-300 ease-out shadow-[0_8px_16px_-4px_rgba(37,99,235,0.2)]',
                )}
                type="submit"
                disabled={loading}
              >
                {loading
                  ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
                  : t('forgotPassword.submit', {}, { defaultValue: 'Send Reset Link' })}
              </button>
            </div>
          </form>
          <div className={cm.cn(cm.sp('mt', 8), cm.textCenter, cm.textSize('sm'))}>
            <Link
              data-mol-id="forgot-back-link"
              className="font-medium text-primary hover:text-primary-container transition-colors"
              to="/login"
            >
              {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

export default ForgotPassword
export { ForgotPassword, ForgotPassword as ForgotPasswordPage }
