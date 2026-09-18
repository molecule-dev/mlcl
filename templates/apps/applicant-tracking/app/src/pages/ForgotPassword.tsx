import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { LoginBrandPanel } from '../components/LoginBrandPanel.js'

export function ForgotPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  // Cross-view auth form persistence — the email typed here carries to
  // Reset Password (and back to Login/Signup). NOT cleared on submit so it
  // survives the navigation to the reset view.
  const { fields: authFormFields, setField: setAuthFormField } = useAuthFormState()
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const onPop = () => {
      setSent(false)
      setError(null)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) {
      setError(
        t(
          'forgotPassword.missingEmail',
          {},
          { defaultValue: 'Enter the email address tied to your account.' },
        ),
      )
      return
    }
    setLoading(true)
    setError(null)
    try {
      await http.post('/api/users/forgot-password', { email })
      setSent(true)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(
              'auth.forgotPassword.couldNotSendResetLink',
              {},
              { defaultValue: 'Could not send reset link.' },
            ),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      data-mol-id="page-forgot-password"
      className={cm.cn(cm.minH('screen'), 'flex bg-background text-on-surface antialiased')}
    >
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
                { defaultValue: 'Enter your email and we will send you a one-time reset link.' },
              )}
            </p>
          </header>

          {sent ? (
            <div
              role="status"
              data-mol-id="forgot-sent"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 5),
                'rounded-2xl bg-success/10 text-success border border-success/20',
              )}
            >
              <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                <span aria-hidden="true" className="material-symbols-outlined">
                  mark_email_read
                </span>
                <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'))}>
                  {t('forgotPassword.sent', {}, { defaultValue: 'Reset link sent.' })}
                </p>
              </div>
              <p className={cm.cn(cm.sp('mt', 2), cm.textSize('sm'), 'text-success/80')}>
                {t(
                  'forgotPassword.checkEmail',
                  { email },
                  { defaultValue: 'Check {{email}} for instructions to set a new password.' },
                )}
              </p>
            </div>
          ) : (
            <>
              {error ? (
                <div
                  role="alert"
                  aria-live="assertive"
                  data-mol-id="forgot-error"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.sp('mb', 6),
                    cm.textSize('sm'),
                    'rounded-xl bg-error/10 text-error font-semibold',
                  )}
                >
                  {error}
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
                      placeholder={t(
                        'auth.passwordPlaceholderCompanyEmail',
                        {},
                        { defaultValue: 'you@company.com' },
                      )}
                      autoComplete="email"
                      required
                      data-mol-id="forgot-email"
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
                  disabled={loading}
                  data-mol-id="forgot-submit"
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 3),
                    cm.sp('mt', 2),
                    cm.fontWeight('bold'),
                    cm.textSize('sm'),
                    'rounded-xl bg-primary text-on-primary shadow-md shadow-primary/20 hover:opacity-90 transition-opacity disabled:opacity-50',
                  )}
                >
                  {loading
                    ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
                    : t(
                        'auth.forgotPassword.sendResetLink',
                        {},
                        { defaultValue: 'Send reset link' },
                      )}
                </button>
              </form>
            </>
          )}

          <p
            className={cm.cn(
              cm.sp('mt', 8),
              cm.textCenter,
              cm.textSize('sm'),
              'text-on-surface-variant',
            )}
          >
            <Link
              to="/login"
              data-mol-id="forgot-back-link"
              className={cm.cn(cm.fontWeight('bold'), 'text-primary hover:underline')}
            >
              ← {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}

export default ForgotPassword
