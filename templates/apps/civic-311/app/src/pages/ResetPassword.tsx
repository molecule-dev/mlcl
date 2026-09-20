import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'

function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const legalLinkClass = cm.cn(
    'text-[10px] font-bold text-foreground-tertiary uppercase tracking-widest hover:text-sky-500 transition-colors',
  )
  const http = useHttpClient()
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError(
        t(
          'auth.signup.passwordsDoNotMatchNoPeriod',
          {},
          { defaultValue: 'Passwords do not match' },
        ),
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
              { defaultValue: 'Reset failed. The link may have expired.' },
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
        cm.minH('screen'),
        'bg-background selection:bg-primary-fixed selection:text-on-primary-fixed',
      )}
    >
      <main
        className={cm.cn(
          cm.w('full'),
          cm.stack(10),
          'max-w-[440px] animate-in fade-in duration-700',
        )}
      >
        {/* Logo Area */}
        <div className={cm.cn(cm.flex({ direction: 'col', align: 'center' }))}>
          <div
            className={cm.cn(
              cm.w(12),
              cm.h(12),
              cm.flex({ align: 'center', justify: 'center' }),
              cm.sp('mb', 4),
              'rounded-xl bg-login-gradient login-card-shadow',
            )}
          >
            <span
              className={cm.cn(cm.textSize('3xl'), 'material-symbols-outlined text-white')}
              data-icon="cloud_done"
            >
              cloud_done
            </span>
          </div>
          <h1
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('bold'),
              'tracking-tight text-on-surface',
            )}
          >
            {t('app.name', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
          </h1>
        </div>
        {/* Login Card */}
        <div
          className={cm.cn(
            'bg-surface-container-lowest login-card-shadow rounded-xl overflow-hidden',
          )}
        >
          <div className={cm.cn(cm.sp('p', 8), 'md:p-10')}>
            {success ? (
              <div className={cm.cn(cm.textCenter, cm.stack(6))}>
                <div className={cm.stack(2)}>
                  <h2
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      'text-[2.25rem] leading-tight tracking-[-0.02em] text-on-surface',
                    )}
                  >
                    {t('resetPassword.successTitle', {}, { defaultValue: 'Password reset!' })}
                  </h2>
                  <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant')}>
                    {t(
                      'resetPassword.successSubtitle',
                      {},
                      { defaultValue: 'Your password has been successfully reset.' },
                    )}
                  </p>
                </div>
                <Link
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('py', 4),
                    cm.sp('px', 6),
                    cm.fontWeight('bold'),
                    cm.textSize('sm'),
                    cm.textCenter,
                    'block rounded-lg bg-login-gradient text-white tracking-wide transition-all hover:opacity-95 active:scale-[0.98] login-card-shadow',
                  )}
                  to="/login"
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
              </div>
            ) : (
              <div className={cm.stack(10)}>
                <header className={cm.stack(2)}>
                  <h2
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      'text-[2.25rem] leading-tight tracking-[-0.02em] text-on-surface',
                    )}
                  >
                    {t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
                  </h2>
                  <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant')}>
                    {t(
                      'resetPassword.subheading',
                      {},
                      { defaultValue: 'Enter your new password below' },
                    )}
                  </p>
                </header>
                {error && (
                  <div
                    data-mol-id="reset-password-error"
                    className={cm.cn(
                      cm.sp('p', 3),
                      cm.sp('px', 4),
                      cm.textSize('sm'),
                      cm.textCenter,
                      'bg-error-container text-on-error-container rounded-lg',
                    )}
                    role="alert"
                  >
                    {error}
                  </div>
                )}
                <form className={cm.stack(6)} onSubmit={handleSubmit}>
                  <div className={cm.stack(2)}>
                    <label
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        'block text-on-surface-variant tracking-wide uppercase',
                      )}
                      htmlFor="new-password"
                    >
                      {t('resetPassword.newPassword', {}, { defaultValue: 'New password' })}
                    </label>
                    <div className={cm.cn('relative')}>
                      <input
                        className={cm.cn(
                          cm.w('full'),
                          cm.sp('px', 4),
                          'py-3.5 bg-surface-container-low border-none rounded-lg text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary-container transition-all',
                        )}
                        data-mol-id="input-new-password"
                        id="new-password"
                        name="new-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
                        autoComplete="new-password"
                        required
                      />
                      <button
                        className={cm.cn(
                          'absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors',
                        )}
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        aria-label={
                          showPassword
                            ? t('common.hidePassword', {}, { defaultValue: 'Hide password' })
                            : t('common.showPassword', {}, { defaultValue: 'Show password' })
                        }
                      >
                        <span
                          className={cm.cn('material-symbols-outlined text-[20px]')}
                          data-icon="visibility"
                        >
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>
                  <div className={cm.stack(2)}>
                    <label
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        'block text-on-surface-variant tracking-wide uppercase',
                      )}
                      htmlFor="confirm-password"
                    >
                      {t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
                    </label>
                    <div className={cm.cn('relative')}>
                      <input
                        className={cm.cn(
                          cm.w('full'),
                          cm.sp('px', 4),
                          'py-3.5 bg-surface-container-low border-none rounded-lg text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary-container transition-all',
                        )}
                        data-mol-id="input-confirm-password"
                        id="confirm-password"
                        name="confirm-password"
                        type={showConfirm ? 'text' : 'password'}
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
                        autoComplete="new-password"
                        required
                      />
                      <button
                        className={cm.cn(
                          'absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors',
                        )}
                        type="button"
                        onClick={() => setShowConfirm((s) => !s)}
                        aria-label={
                          showConfirm
                            ? t('common.hidePassword', {}, { defaultValue: 'Hide password' })
                            : t('common.showPassword', {}, { defaultValue: 'Show password' })
                        }
                      >
                        <span
                          className={cm.cn('material-symbols-outlined text-[20px]')}
                          data-icon="visibility"
                        >
                          {showConfirm ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>
                  <button
                    className={cm.cn(
                      cm.w('full'),
                      cm.sp('py', 4),
                      cm.sp('px', 6),
                      cm.fontWeight('bold'),
                      cm.textSize('sm'),
                      'rounded-lg bg-login-gradient text-white tracking-wide transition-all hover:opacity-95 active:scale-[0.98] login-card-shadow disabled:opacity-60',
                    )}
                    type="submit"
                    disabled={loading}
                  >
                    {loading
                      ? t('common.resettingEllipsis', {}, { defaultValue: 'Resetting…' })
                      : t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
                  </button>
                </form>
              </div>
            )}
          </div>
          {/* Card Footer */}
          <div
            className={cm.cn(
              cm.sp('px', 8),
              cm.sp('py', 5),
              cm.textCenter,
              'bg-surface-container-low',
            )}
          >
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              <Link
                className={cm.cn(
                  'font-bold text-primary hover:text-primary-container transition-colors',
                )}
                to="/login"
              >
                {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
              </Link>
            </p>
          </div>
        </div>
        {/* Global Footer (Shared Component Guidance) */}
        <footer
          className={cm.cn(
            cm.sp('mt', 12),
            cm.flex({ direction: 'col', align: 'center' }),
            cm.stack(4),
          )}
        >
          <div className={cm.cn(cm.flex({ justify: 'center', wrap: 'wrap' }), 'gap-x-8 gap-y-2')}>
            <LegalModalLinks
              linkClassName={legalLinkClass}
              appName={APP_NAME}
              loadContent={loadContent}
              privacyLabel={t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
              termsLabel={t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
            />
            <Link
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] text-foreground-tertiary uppercase tracking-widest hover:text-sky-500 transition-colors',
              )}
              to="/settings"
            >
              {t('nav.security', {}, { defaultValue: 'Security' })}
            </Link>
          </div>
          <p className={cm.cn('text-[10px] text-foreground-secondary uppercase tracking-wider')}>
            {t(
              'common.copyright',
              { year: new Date().getFullYear(), appName: APP_NAME },
              { defaultValue: '© {{year}} {{appName}}' },
            )}
          </p>
        </footer>
      </main>
      {/* Decoration element */}
      <div
        className={cm.cn(
          cm.w('1/3'),
          cm.h('1/3'),
          cm.roundedFull,
          'fixed top-0 right-0 -z-10 bg-primary/5 blur-[120px] translate-x-1/2 -translate-y-1/2',
        )}
      ></div>
      <div
        className={cm.cn(
          cm.w('1/4'),
          cm.h('1/4'),
          cm.roundedFull,
          'fixed bottom-0 left-0 -z-10 bg-secondary/5 blur-[100px] -translate-x-1/3 translate-y-1/3',
        )}
      ></div>
    </div>
  )
}

export default ResetPassword
export { ResetPassword, ResetPassword as ResetPasswordPage }
