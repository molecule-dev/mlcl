import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'
import { loadContent } from '../config.js'
function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) {
      setError(
        t(
          'resetPassword.invalidLinkError',
          {},
          { defaultValue: 'Invalid or expired reset link. Please request a new one.' },
        ),
      )
      return
    }
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
    if (password.length < 8) {
      setError(
        t(
          'resetPassword.passwordTooShortError',
          {},
          { defaultValue: 'Password must be at least 8 characters' },
        ),
      )
      return
    }
    setLoading(true)
    setError(null)
    try {
      await http.post('/api/users/reset-password', { token, password })
      navigate('/login')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('resetPassword.resetFailedError', {}, { defaultValue: 'Reset failed' }),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={cm.cn(
        'bg-surface font-body text-on-surface min-h-screen flex flex-col relative overflow-hidden',
      )}
    >
      {/* Background Decorative Orbs (The "Neural Nodes") */}
      <div
        className={cm.cn(
          cm.roundedFull,
          'absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-primary neural-orb',
        )}
      ></div>
      <div
        className={cm.cn(
          cm.roundedFull,
          'absolute bottom-[-10%] right-[-10%] w-[35rem] h-[35rem] bg-tertiary-container neural-orb',
        )}
      ></div>
      <div
        className={cm.cn(
          cm.roundedFull,
          'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50rem] h-[50rem] bg-secondary-container neural-orb',
        )}
      ></div>
      {/* Main Content */}
      <main
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.sp('p', 6),
          'flex-grow relative z-10',
        )}
      >
        <div
          className={cm.cn(
            cm.w('full'),
            cm.flex({ direction: 'col', align: 'center' }),
            cm.sp('p', 8),
            'max-w-[440px] glass-card ambient-glow rounded-lg md:p-10',
          )}
        >
          {/* Logo Section */}
          <div className={cm.cn(cm.flex({ align: 'center' }), cm.sp('mb', 8), 'gap-2 group')}>
            <BrandWordmark as="span" size="lg" />
          </div>
          {/* Header */}
          <div className={cm.cn(cm.textCenter, cm.sp('mb', 10))}>
            <h1
              className={cm.cn(
                cm.textSize('3xl'),
                cm.sp('mb', 2),
                'font-headline font-extrabold text-on-background tracking-tight',
              )}
            >
              {t('resetPassword.title', {}, { defaultValue: 'Reset Password' })}
            </h1>
            <p className={cm.cn(cm.fontWeight('medium'), 'text-on-surface-variant')}>
              {t('resetPassword.subtitle', {}, { defaultValue: 'Enter your new password below' })}
            </p>
          </div>
          {/* Form */}
          <form className={cm.cn(cm.w('full'), cm.stack(6))} onSubmit={handleSubmit}>
            {/* New Password Field */}
            <div className={cm.stack(2)}>
              <label
                htmlFor="new-password"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  cm.sp('ml', 1),
                  'block text-on-surface-variant',
                )}
              >
                {t(
                  'settings.changePasswordModal.newPassword',
                  {},
                  { defaultValue: 'New Password' },
                )}
              </label>
              <div className={cm.cn('relative')}>
                <input
                  id="new-password"
                  autoComplete="new-password"
                  aria-invalid={!!error}
                  aria-describedby="reset-error"
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('px', 4),
                    'bg-surface-container-high border-0 rounded-DEFAULT py-3.5 text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary-container focus:bg-surface-container-lowest transition-all duration-300',
                  )}
                  placeholder="••••••••"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  className={cm.cn(
                    'absolute right-4 top-1/2 -translate-y-1/2 text-outline-variant hover:text-primary transition-colors',
                  )}
                  type="button"
                  aria-label={
                    showPassword
                      ? t('resetPassword.hidePassword', {}, { defaultValue: 'Hide password' })
                      : t('resetPassword.showPassword', {}, { defaultValue: 'Show password' })
                  }
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  <span
                    className={cm.cn('material-symbols-outlined')}
                    data-icon={showPassword ? 'visibility_off' : 'visibility'}
                  >
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>
            {/* Confirm Password Field */}
            <div className={cm.stack(2)}>
              <label
                htmlFor="confirm-password"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  cm.sp('ml', 1),
                  'block text-on-surface-variant',
                )}
              >
                {t('resetPassword.confirmPasswordLabel', {}, { defaultValue: 'Confirm Password' })}
              </label>
              <div className={cm.cn('relative')}>
                <input
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('px', 4),
                    'bg-surface-container-high border-0 rounded-DEFAULT py-3.5 text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary-container focus:bg-surface-container-lowest transition-all duration-300',
                  )}
                  id="confirm-password"
                  autoComplete="new-password"
                  aria-invalid={!!error}
                  aria-describedby="reset-error"
                  placeholder="••••••••"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
                <button
                  className={cm.cn(
                    'absolute right-4 top-1/2 -translate-y-1/2 text-outline-variant hover:text-primary transition-colors',
                  )}
                  type="button"
                  aria-label={
                    showConfirm
                      ? t('resetPassword.hidePassword', {}, { defaultValue: 'Hide password' })
                      : t('resetPassword.showPassword', {}, { defaultValue: 'Show password' })
                  }
                  aria-pressed={showConfirm}
                  onClick={() => setShowConfirm((v) => !v)}
                >
                  <span
                    className={cm.cn('material-symbols-outlined')}
                    data-icon={showConfirm ? 'visibility_off' : 'visibility'}
                  >
                    {showConfirm ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>
            {/* CTA Button */}
            {error && (
              <p
                id="reset-error"
                role="alert"
                className={cm.cn(cm.textSize('sm'), cm.textCenter, 'text-error -mt-2')}
              >
                {error}
              </p>
            )}
            <button
              className={cm.cn(
                cm.w('full'),
                cm.roundedFull,
                cm.sp('py', 4),
                cm.sp('px', 6),
                cm.fontWeight('bold'),
                cm.textSize('lg'),
                cm.sp('mt', 2),
                'bg-gradient-to-r from-primary to-secondary text-white shadow-lg hover:opacity-90 active:scale-[0.98] transition-all duration-200',
              )}
              type="submit"
              disabled={loading}
            >
              {loading
                ? t('common.resettingEllipsis', {}, { defaultValue: 'Resetting…' })
                : t('resetPassword.submit', {}, { defaultValue: 'Reset Password' })}
            </button>
          </form>
          {/* Back to Sign In */}
          <p
            className={cm.cn(
              cm.sp('mt', 10),
              cm.textSize('sm'),
              cm.textCenter,
              cm.fontWeight('medium'),
              'text-on-surface-variant',
            )}
          >
            <Link className={cm.cn('text-tertiary hover:underline transition-all')} to="/login">
              {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
            </Link>
          </p>
        </div>
      </main>
      {/* Shared Component Footer */}
      <footer className={cm.cn('relative z-10')}>
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', justify: 'between' }),
            cm.w('full'),
            cm.sp('px', 8),
            cm.mxAuto,
            cm.sp('py', 8),
            'max-w-7xl',
            'gap-4 md:flex-row',
          )}
        >
          <div
            className={cm.cn(
              cm.textSize('sm'),
              "text-on-surface-variant font-['Inter'] tracking-normal",
            )}
          >
            {t(
              'footer.copyright',
              { year: new Date().getFullYear(), appName: APP_NAME },
              {
                defaultValue: '© {{year}} {{appName}} AI. The chatbot builder for AI-native teams.',
              },
            )}
          </div>
          <div className={cm.cn(cm.flex({}), 'gap-6')}>
            <LegalModalLinks
              linkClassName={cm.cn(
                "text-foreground-secondary hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-['Inter'] text-sm",
              )}
              appName={APP_NAME}
              loadContent={loadContent}
              privacyLabel={t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
              termsLabel={t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
            />
            <Link
              className={cm.cn(
                "text-foreground-secondary hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-['Inter'] text-sm",
              )}
              to="/help"
            >
              {t('footer.helpCenter', {}, { defaultValue: 'Help Center' })}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default ResetPassword
export { ResetPassword, ResetPassword as ResetPasswordPage }
