// Phase 1 — derived copy from Login (same stitch: design-property-listing-login.html).
// Phase 4 wires it to this screen's own auth flow.
// Do not hand-edit; Phase 2 will extract sections one at a time.
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [params] = useSearchParams()
  const token = params.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError(
        t(
          'auth.signup.passwordsDoNotMatchNoPeriod',
          {},
          { defaultValue: 'Passwords do not match' },
        ),
      )
      return
    }
    if (!token) {
      setError(
        t('resetPassword.invalidToken', {}, { defaultValue: 'Invalid or missing reset token' }),
      )
      return
    }
    setLoading(true)
    setError(null)
    try {
      await http.post('/api/users/reset-password', { token, password })
      setSuccess(true)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(
              'resetPassword.error',
              {},
              { defaultValue: 'Unable to reset password. The link may have expired.' },
            ),
      )
    } finally {
      setLoading(false)
    }
  }
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'center' }),
        cm.sp('p', 6),
        'bg-background font-body text-on-surface min-h-screen selection:bg-primary-fixed selection:text-on-primary-fixed',
      )}
    >
      <main className={cm.cn(cm.w('full'), cm.maxW('lg'))}>
        {/* Auth Card */}
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', gap: 'xl' }),
            cm.w('full'),
            cm.sp('p', 10),
            'bg-surface-container-lowest rounded-xl md:p-14 luxury-shadow',
          )}
        >
          {/* Logo */}
          <div className={cm.cn(cm.flex({ direction: 'col', align: 'center', gap: 'sm' }))}>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.w(12),
                cm.h(12),
                cm.sp('mb', 2),
                'bg-primary rounded-lg rotate-3',
              )}
            >
              <span
                className={cm.cn(cm.textSize('2xl'), 'material-symbols-outlined text-on-primary')}
                data-icon="domain"
              >
                domain
              </span>
            </div>
            <h2
              className={cm.cn(
                cm.textSize('2xl'),
                'font-headline font-extrabold tracking-tighter text-primary',
              )}
            >
              {t('common.brandName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
            </h2>
          </div>
          {success ? (
            <div className={cm.cn(cm.textCenter, cm.stack(6), cm.w('full'))}>
              <h1
                className={cm.cn(
                  cm.textSize('4xl'),
                  cm.fontWeight('bold'),
                  'font-headline tracking-tight text-on-surface',
                )}
              >
                {t(
                  'resetPassword.successTitle',
                  {},
                  { defaultValue: 'Password reset successfully' },
                )}
              </h1>
              <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant')}>
                {t(
                  'resetPassword.successSubtitle',
                  {},
                  { defaultValue: 'You can now sign in with your new password.' },
                )}
              </p>
              <Link
                to="/login"
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
                  cm.w('full'),
                  cm.h(16),
                  cm.textSize('lg'),
                  cm.fontWeight('bold'),
                  'rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary font-headline shadow-lg shadow-primary/10 hover:opacity-90 active:scale-[0.98] transition-all',
                )}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}

                <span className={cm.cn('material-symbols-outlined')} data-icon="arrow_forward">
                  arrow_forward
                </span>
              </Link>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className={cm.cn(cm.textCenter)}>
                <h1
                  className={cm.cn(
                    cm.textSize('4xl'),
                    cm.fontWeight('bold'),
                    cm.sp('mb', 3),
                    'font-headline tracking-tight text-on-surface',
                  )}
                >
                  {t('resetPassword.title', {}, { defaultValue: 'Reset Your Password' })}
                </h1>
                <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant')}>
                  {t(
                    'resetPassword.subtitle',
                    {},
                    {
                      defaultValue:
                        'Choose a new password for your account. Make it strong and memorable.',
                    },
                  )}
                </p>
              </div>
              {/* Login Form */}
              <form className={cm.cn(cm.w('full'), cm.stack(6))} onSubmit={handleSubmit}>
                {error && (
                  <div
                    className={cm.cn(
                      cm.sp('p', 4),
                      cm.textSize('sm'),
                      cm.fontWeight('medium'),
                      'rounded-xl bg-error-container text-on-error-container',
                    )}
                    role="alert"
                  >
                    {error}
                  </div>
                )}
                <div className={cm.cn(cm.stack(2))}>
                  <label
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      cm.sp('ml', 4),
                      'block font-label text-on-surface-variant',
                    )}
                  >
                    {t(
                      'settings.changePasswordModal.newPassword',
                      {},
                      { defaultValue: 'New Password' },
                    )}
                  </label>
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'md' }),
                      cm.sp('px', 5),
                      cm.sp('py', 4),
                      'ghost-border bg-surface-container-low rounded-xl transition-all',
                    )}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-outline')}
                      data-icon="lock"
                    >
                      lock
                    </span>
                    <input
                      className={cm.cn(
                        cm.w('full'),
                        'bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-outline-variant',
                      )}
                      placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
                <div className={cm.cn(cm.stack(2))}>
                  <div
                    className={cm.cn(
                      cm.flex({ justify: 'between', align: 'center' }),
                      cm.sp('px', 4),
                    )}
                  >
                    <label
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        'block font-label text-on-surface-variant',
                      )}
                    >
                      {t(
                        'resetPassword.confirmPasswordLabel',
                        {},
                        { defaultValue: 'Confirm Password' },
                      )}
                    </label>
                  </div>
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'md' }),
                      cm.sp('px', 5),
                      cm.sp('py', 4),
                      'ghost-border bg-surface-container-low rounded-xl transition-all',
                    )}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-outline')}
                      data-icon="lock"
                    >
                      lock
                    </span>
                    <input
                      className={cm.cn(
                        cm.w('full'),
                        'bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-outline-variant',
                      )}
                      placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>
                <button
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
                    cm.w('full'),
                    cm.h(16),
                    cm.textSize('lg'),
                    cm.fontWeight('bold'),
                    'rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary font-headline shadow-lg shadow-primary/10 hover:opacity-90 active:scale-[0.98] transition-all',
                  )}
                  type="submit"
                  disabled={loading}
                >
                  {t('resetPassword.submitButton', {}, { defaultValue: 'Reset Password' })}

                  <span className={cm.cn('material-symbols-outlined')} data-icon="arrow_forward">
                    arrow_forward
                  </span>
                </button>
              </form>
            </>
          )}
          {/* Footer Link */}
          <div className={cm.cn(cm.textCenter)}>
            <p className={cm.cn('text-on-surface-variant')}>
              {t('resetPassword.noAccountPrompt', {}, { defaultValue: "Don't have an account? " })}

              <Link
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.sp('ml', 1),
                  'text-primary hover:underline',
                )}
                to="/signup"
              >
                {t('common.signUp', {}, { defaultValue: 'Sign Up' })}
              </Link>
            </p>
          </div>
        </div>
        {/* Decorative Surface Decoration (Tonal Layering) */}
        <div className={cm.cn(cm.sp('mt', 8), cm.textCenter, cm.sp('px', 10))}>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'text-outline tracking-widest uppercase opacity-40',
            )}
          >
            {t(
              'resetPassword.copyright',
              { year: 2024, appName: APP_NAME },
              { defaultValue: '{{appName}} © {{year}}' },
            )}
          </p>
        </div>
      </main>
      {/* Background Decoration */}
      <div className={cm.cn('fixed inset-0 -z-10 overflow-hidden pointer-events-none')}>
        <div
          className={cm.cn(
            'w-[40%]',
            'h-[40%]',
            cm.roundedFull,
            'absolute top-[-10%] right-[-10%] bg-primary/5 blur-[120px]',
          )}
        ></div>
        <div
          className={cm.cn(
            'w-[40%]',
            'h-[40%]',
            cm.roundedFull,
            'absolute bottom-[-10%] left-[-10%] bg-secondary/5 blur-[120px]',
          )}
        ></div>
      </div>
      {/* Mandatory Footer component from JSON structure (Suppressing for focused Login flow as per rules) */}
      {/* The "Relevance Check" logic hides the global footer for transactional login screens to prioritize focus. */}
    </div>
  )
}

export default ResetPassword
export { ResetPassword, ResetPassword as ResetPasswordPage }
