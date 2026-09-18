import { type FormEvent, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { OAuthButtons } from '../components/OAuthButtons.js'

function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const { resetPassword } = useAuth() as ReturnType<typeof useAuth> & {
    resetPassword: (token: string | null, password: string) => Promise<void>
  }
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await resetPassword(token, password)
      setDone(true)
      setTimeout(() => navigate('/login'), 1500)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(
              'auth.resetPassword.couldNotReset',
              {},
              { defaultValue: 'Could not reset password.' },
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
        'bg-background text-on-background min-h-screen selection:bg-primary-fixed selection:text-primary',
      )}
    >
      <main
        className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), 'w-full max-w-[1280px]')}
      >
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center' }),
            cm.sp('p', 16),
            'bg-surface w-full max-w-[540px] rounded-2xl custom-shadow',
          )}
        >
          <div className={cm.cn(cm.sp('mb', 12), cm.textCenter)}>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
                cm.sp('mb', 4),
              )}
            >
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.w(10),
                  cm.h(10),
                  'indigo-gradient rounded-xl text-on-primary',
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined')}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  auto_awesome
                </span>
              </div>
              <span
                className={cm.cn(
                  cm.textSize('3xl'),
                  'font-black tracking-tighter text-on-background',
                )}
              >
                {t('brand.name', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
              </span>
            </div>
            <h1
              className={cm.cn(
                cm.textSize('2xl'),
                cm.fontWeight('bold'),
                cm.sp('mb', 2),
                'tracking-tight text-on-background',
              )}
            >
              {t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
            </h1>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant',
              )}
            >
              {t('resetPassword.subtitle', {}, { defaultValue: 'Enter your new password below' })}
            </p>
          </div>
          {done ? (
            <div
              role="status"
              data-testid="reset-password-done"
              className={cm.cn(
                'w-full p-6 rounded-xl bg-success-light text-success text-sm text-center',
              )}
            >
              {t(
                'resetPassword.done',
                {},
                { defaultValue: 'Password updated. Redirecting to sign in…' },
              )}
            </div>
          ) : (
            <form className={cm.cn(cm.stack(6), 'w-full')} onSubmit={handleSubmit}>
              {error && (
                <div
                  role="alert"
                  className={cm.cn(
                    'w-full p-3 text-sm text-center bg-error-light text-error rounded-lg',
                  )}
                >
                  {error}
                </div>
              )}
              <div className={cm.cn(cm.stack(2))}>
                <div
                  className={cm.cn(
                    cm.flex({ justify: 'between', align: 'center' }),
                    cm.sp('ml', 1),
                  )}
                >
                  <label
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      'block tracking-wide text-on-background',
                    )}
                    htmlFor="password"
                  >
                    {t(
                      'settings.changePasswordModal.newPassword',
                      {},
                      { defaultValue: 'New Password' },
                    )}
                  </label>
                  <Link
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      cm.textPrimary,
                      'hover:opacity-80 transition-opacity',
                    )}
                    to="/forgot-password"
                  >
                    {t('auth.login.forgotPassword', {}, { defaultValue: 'Forgot password?' })}
                  </Link>
                </div>
                <input
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 4),
                    'w-full bg-surface-container-low focus:bg-surface border-0 ghost-border rounded-xl text-on-background focus:ring-2 focus:ring-primary/20 transition-all duration-300 outline-none',
                  )}
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  disabled={loading}
                />
              </div>
              <button
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
                  cm.fontWeight('bold'),
                  cm.sp('py', 4),
                  cm.sp('mt', 4),
                  'w-full indigo-gradient text-on-primary rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50',
                )}
                type="submit"
                disabled={loading || !password}
              >
                {loading
                  ? t('common.resettingEllipsis', {}, { defaultValue: 'Resetting…' })
                  : t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
                <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
                  arrow_forward
                </span>
              </button>
            </form>
          )}
          <div className={cm.cn(cm.sp('mt', 10), cm.textCenter)}>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant',
              )}
            >
              {t(
                'resetPassword.newUserPrompt',
                { appName: APP_NAME },
                { defaultValue: 'New to {{appName}}?' },
              )}
              <Link
                className={cm.cn(
                  cm.textPrimary,
                  cm.fontWeight('bold'),
                  cm.sp('ml', 1),
                  'hover:underline underline-offset-4',
                )}
                to="/signup"
              >
                {t('resetPassword.signUpLink', {}, { defaultValue: 'Sign up for free' })}
              </Link>
            </p>
          </div>
          <div className={cm.cn(cm.sp('mt', 10), 'w-full')}>
            <OAuthButtons />
          </div>
        </div>
      </main>
    </div>
  )
}

export default ResetPassword
export { ResetPassword, ResetPassword as ResetPasswordPage }
