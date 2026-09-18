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
  const http = useHttpClient()
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

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
    <div className={cm.cn(cm.surface, 'font-body text-on-surface antialiased')}>
      {/* Shell Suppression: This is a focused reset-password page, so TopNavBar/SideNav are excluded as per Shell Visibility & Relevance */}
      <main
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.sp('p', 6),
          'min-h-screen bg-surface',
        )}
      >
        <div
          className={cm.cn(
            cm.w('full'),
            cm.maxW('md'),
            cm.sp('p', 12),
            'bg-surface-container-lowest scholar-shadow rounded-xl relative overflow-hidden',
          )}
        >
          {/* Branding Section */}
          <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }), cm.sp('mb', 10))}>
            <div
              className={cm.cn(
                cm.w(10),
                cm.h(10),
                cm.flex({ align: 'center', justify: 'center' }),
                'scholar-gradient rounded-lg shadow-md',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-white')}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                school
              </span>
            </div>
            <h1
              className={cm.cn(
                cm.fontWeight('bold'),
                'font-headline text-[1.75rem] text-on-surface tracking-tight',
              )}
            >
              {t('common.appName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
            </h1>
          </div>
          {success ? (
            <div className={cm.cn(cm.textCenter, cm.sp('py', 6))}>
              <h2
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.sp('mb', 4),
                  'font-headline text-[1.75rem] text-on-surface',
                )}
              >
                {t('resetPassword.successTitle', {}, { defaultValue: 'Password reset!' })}
              </h2>
              <p className={cm.cn(cm.sp('mb', 6), cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'resetPassword.successMessage',
                  {},
                  { defaultValue: 'Your password has been updated successfully.' },
                )}
              </p>
              <Link
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.textPrimary,
                  'hover:underline decoration-2 underline-offset-4',
                )}
                to="/login"
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
            </div>
          ) : (
            <>
              {/* Heading */}
              <div className={cm.sp('mb', 10)}>
                <h2
                  className={cm.cn(
                    cm.fontWeight('semibold'),
                    cm.sp('mb', 2),
                    'font-headline text-[1.75rem] text-on-surface',
                  )}
                >
                  {t(
                    'auth.resetPassword.setNewPasswordShort',
                    {},
                    { defaultValue: 'Set new password' },
                  )}
                </h2>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    'resetPassword.subtitle',
                    {},
                    { defaultValue: 'Enter your new password below.' },
                  )}
                </p>
              </div>
              {error && (
                <div
                  role="alert"
                  className={cm.cn(
                    cm.sp('mb', 6),
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'rounded-xl bg-error-container text-on-error-container text-[0.8125rem]',
                  )}
                >
                  {error}
                </div>
              )}
              {/* Form */}
              <form className={cm.stack(6)} onSubmit={handleSubmit}>
                {/* New Password Field */}
                <div>
                  <label
                    className={cm.cn(
                      cm.fontWeight('semibold'),
                      cm.sp('mb', 2),
                      'block text-[0.6875rem] text-on-surface-variant tracking-[0.05em] font-label',
                    )}
                    htmlFor="password"
                  >
                    {t('resetPassword.newPassword', {}, { defaultValue: 'NEW PASSWORD' })}
                  </label>
                  <div className={cm.cn('relative')}>
                    <input
                      className={cm.cn(
                        cm.w('full'),
                        cm.sp('py', 4),
                        cm.sp('px', 5),
                        cm.textSize('sm'),
                        'bg-surface-container-low border-none rounded-xl text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary/20 transition-all',
                      )}
                      autoComplete="new-password"
                      id="password"
                      name="password"
                      placeholder={t(
                        'resetPassword.newPasswordPlaceholder',
                        {},
                        { defaultValue: 'Enter new password' },
                      )}
                      required
                      type="password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        setError(null)
                      }}
                    />
                  </div>
                </div>
                {/* Confirm Password Field */}
                <div>
                  <label
                    className={cm.cn(
                      cm.fontWeight('semibold'),
                      cm.sp('mb', 2),
                      'block text-[0.6875rem] text-on-surface-variant tracking-[0.05em] font-label',
                    )}
                    htmlFor="confirm-password"
                  >
                    {t('resetPassword.confirmPassword', {}, { defaultValue: 'CONFIRM PASSWORD' })}
                  </label>
                  <div className={cm.cn('relative')}>
                    <input
                      className={cm.cn(
                        cm.w('full'),
                        cm.sp('py', 4),
                        cm.sp('px', 5),
                        cm.textSize('sm'),
                        'bg-surface-container-low border-none rounded-xl text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary/20 transition-all',
                      )}
                      autoComplete="new-password"
                      id="confirm-password"
                      name="confirm-password"
                      placeholder={t(
                        'auth.signup.confirmNewPassword',
                        {},
                        { defaultValue: 'Confirm new password' },
                      )}
                      required
                      type="password"
                      value={confirm}
                      onChange={(e) => {
                        setConfirm(e.target.value)
                        setError(null)
                      }}
                    />
                  </div>
                </div>
                {/* CTA Button */}
                <button
                  className={cm.cn(
                    cm.w('full'),
                    cm.fontWeight('semibold'),
                    cm.sp('py', 4),
                    cm.flex({ align: 'center', justify: 'center', gap: 2 }),
                    'scholar-gradient text-on-primary rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all group disabled:opacity-60 disabled:pointer-events-none',
                  )}
                  type="submit"
                  disabled={loading}
                >
                  <span>
                    {loading
                      ? t('common.resettingEllipsis', {}, { defaultValue: 'Resetting…' })
                      : t('resetPassword.submit', {}, { defaultValue: 'Reset Password' })}
                  </span>
                  {!loading && (
                    <span
                      aria-hidden="true"
                      className={cm.cn(
                        'material-symbols-outlined text-[1.2rem] group-hover:translate-x-1 transition-transform',
                      )}
                    >
                      arrow_forward
                    </span>
                  )}
                </button>
              </form>
              {/* Secondary Action */}
              <div className={cm.cn(cm.sp('mt', 10), cm.textCenter)}>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    'resetPassword.rememberPassword',
                    {},
                    { defaultValue: 'Remember your password?' },
                  )}
                  <Link
                    className={cm.cn(
                      cm.fontWeight('semibold'),
                      cm.sp('ml', 1),
                      cm.textPrimary,
                      'hover:underline decoration-2 underline-offset-4',
                    )}
                    to="/login"
                  >
                    {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </main>
      {/* Footer Component as defined in JSON (Content/Styles merged) */}
      <footer
        className={cm.cn(
          cm.w('full'),
          cm.sp('py', 8),
          cm.sp('px', 8),
          cm.flex({ direction: 'col', align: 'center', justify: 'between', gap: 4 }),
          cm.mxAuto,
          'bg-surface-secondary md:flex-row max-w-screen-2xl',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 6 }))}>
          <span className={cm.cn(cm.textSize('sm'), "text-foreground-secondary font-['Inter']")}>
            {t(
              'footer.copyright',
              { year: new Date().getFullYear(), appName: APP_NAME },
              { defaultValue: '© {{year}} {{appName}} LMS. The Digital Curator.' },
            )}
          </span>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 8 }))}>
          <LegalModalLinks
            linkClassName={cm.cn(
              cm.textSize('sm'),
              "text-foreground-secondary font-['Inter'] hover:text-foreground dark:hover:text-white transition-all",
            )}
            appName={APP_NAME}
            loadContent={loadContent}
            privacyLabel={t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
            termsLabel={t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
          />
          <Link
            className={cm.cn(
              cm.textSize('sm'),
              "text-foreground-secondary font-['Inter'] hover:text-foreground dark:hover:text-white transition-all",
            )}
            to="/help"
          >
            {t('footer.contactSupport', {}, { defaultValue: 'Contact Support' })}
          </Link>
        </div>
      </footer>
    </div>
  )
}

export default ResetPassword
export { ResetPassword, ResetPassword as ResetPasswordPage }
