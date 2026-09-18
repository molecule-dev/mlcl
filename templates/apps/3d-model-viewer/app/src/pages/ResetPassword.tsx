import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'

function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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
    if (password.length < 8) {
      setError(
        t(
          'resetPassword.tooShort',
          { min: 8 },
          { defaultValue: 'Password must be at least {{min}} characters' },
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
          : t('resetPassword.failed', {}, { defaultValue: 'Reset failed' }),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        cm.w('full'),
        'bg-mesh-gradient font-body text-on-surface antialiased overflow-hidden',
      )}
    >
      {/* Top Navigation Suppressed: Transactional Screen (Login) */}
      {/* Main Canvas */}
      <main
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.sp('p', 6),
          'flex-grow relative z-10',
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center' }),
            cm.w('full'),
            cm.sp('p', 10),
            'glass-card max-w-[440px] rounded-[12px]',
          )}
        >
          {/* Header */}
          <div className={cm.cn(cm.textCenter, cm.sp('mb', 8), cm.w('full'))}>
            <h1
              className={cm.cn(
                cm.textSize('3xl'),
                cm.sp('mb', 2),
                'font-headline font-bold text-on-surface tracking-tight',
              )}
            >
              {t('resetPassword.title', {}, { defaultValue: 'Set New Password' })}
            </h1>
            <p className={cm.cn(cm.textSize('sm'), 'font-body text-on-surface-variant')}>
              {t(
                'resetPassword.subtitle',
                {},
                { defaultValue: 'Choose a strong password for your studio account' },
              )}
            </p>
          </div>
          {/* Form */}
          <form className={cm.cn(cm.w('full'), cm.stack(5))} onSubmit={handleSubmit}>
            {error && (
              <div
                role="alert"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  'rounded-[12px] bg-error-container/20 text-error ring-1 ring-inset ring-error/20',
                )}
              >
                {error}
              </div>
            )}
            {/* New Password */}
            <div className={cm.stack(1)}>
              <label
                className={cm.cn(
                  cm.fontWeight('medium'),
                  'block font-label text-[11px] uppercase tracking-[0.05em] text-on-surface-variant',
                )}
                htmlFor="password"
              >
                {t(
                  'settings.changePasswordModal.newPassword',
                  {},
                  { defaultValue: 'New Password' },
                )}
              </label>
              <div className="relative">
                <input
                  autoComplete="new-password"
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('py', 3),
                    cm.sp('px', 4),
                    'block rounded-[12px] border-0 bg-surface-container-low text-on-surface shadow-sm ring-1 ring-inset ring-outline-variant/20 placeholder:text-outline focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 transition-all duration-200',
                  )}
                  id="password"
                  name="password"
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
            {/* Confirm Password */}
            <div className={cm.stack(1)}>
              <label
                className={cm.cn(
                  cm.fontWeight('medium'),
                  'block font-label text-[11px] uppercase tracking-[0.05em] text-on-surface-variant',
                )}
                htmlFor="confirm"
              >
                {t('resetPassword.confirmPassword', {}, { defaultValue: 'Confirm Password' })}
              </label>
              <div className="relative">
                <input
                  autoComplete="new-password"
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('py', 3),
                    cm.sp('px', 4),
                    'block rounded-[12px] border-0 bg-surface-container-low text-on-surface shadow-sm ring-1 ring-inset ring-outline-variant/20 placeholder:text-outline focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 transition-all duration-200',
                  )}
                  id="confirm"
                  name="confirm"
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
            {/* Submit Button */}
            <div className={cm.sp('pt', 2)}>
              <button
                className={cm.cn(
                  cm.flex({ justify: 'center' }),
                  cm.w('full'),
                  cm.sp('py', 3),
                  cm.sp('px', 4),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'btn-gradient rounded-[12px] text-on-primary shadow-sm hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all duration-200 hover:shadow-[0_8px_32px_rgba(26,26,46,0.12)] active:scale-[0.98]',
                )}
                type="submit"
                disabled={loading}
              >
                {loading
                  ? t('common.resettingEllipsis', {}, { defaultValue: 'Resetting…' })
                  : t('resetPassword.submit', {}, { defaultValue: 'Reset Password' })}
              </button>
            </div>
          </form>
          {/* Footer Link */}
          <p
            className={cm.cn(
              cm.sp('mt', 8),
              cm.textCenter,
              cm.textSize('sm'),
              'text-on-surface-variant',
            )}
          >
            <Link
              className={cm.cn(
                'font-semibold text-primary hover:text-primary-container transition-colors',
              )}
              to="/login"
            >
              {t('resetPassword.backToSignIn', {}, { defaultValue: 'Back to Sign In' })}
            </Link>
          </p>
        </div>
      </main>
      {/* Footer Component */}
      <footer
        className={cm.cn(
          cm.flex({ justify: 'between', align: 'center' }),
          cm.w('full'),
          cm.sp('px', 8),
          cm.sp('py', 6),
          cm.fontWeight('medium'),
          "fixed bottom-0 opacity-60 bg-transparent text-primary font-['Inter'] text-[11px] uppercase tracking-[0.05em] z-10 pointer-events-none",
        )}
      >
        <div>
          {t(
            'footer.copyright',
            { year: new Date().getFullYear(), appName: APP_NAME },
            { defaultValue: '© {{year}} {{appName}} Visualization. Precision Crafted.' },
          )}
        </div>
        <div className={cm.cn(cm.flex({ gap: 6 }), 'pointer-events-auto')}>
          <LegalModalLinks
            linkClassName={cm.cn('text-on-surface-variant hover:text-primary transition-colors')}
            appName={APP_NAME}
            loadContent={loadContent}
            privacyLabel={t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
            termsLabel={t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
          />
        </div>
      </footer>
    </div>
  )
}

export default ResetPassword
export { ResetPassword, ResetPassword as ResetPasswordPage }
