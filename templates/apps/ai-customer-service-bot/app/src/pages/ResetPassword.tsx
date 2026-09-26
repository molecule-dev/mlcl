import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { post } from '@molecule/app-http'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) {
      setError(
        t('resetPassword.missingToken', {}, { defaultValue: 'Reset link is missing or invalid' }),
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
    setLoading(true)
    setError(null)
    try {
      await post('/api/users/reset-password', { token, password })
      navigate('/login')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('resetPassword.resetFailed', {}, { defaultValue: 'Reset failed' }),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      data-mol-id="page-reset-password"
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
            cm.roundedFull,
            'absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-surface-container blur-3xl opacity-50 mix-blend-multiply pointer-events-none',
          )}
        ></div>
        <div
          aria-hidden="true"
          className={cm.cn(
            cm.roundedFull,
            'absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-surface-variant blur-3xl opacity-30 mix-blend-multiply pointer-events-none',
          )}
        ></div>
        <div
          className={cm.cn(
            cm.w('full'),
            cm.maxW('[420px]'),
            cm.sp('p', 10),
            'bg-surface-container-lowest rounded-xl relative z-10',
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
                'resetPassword.subtitle',
                {},
                { defaultValue: 'Set a new password for your account' },
              )}
            </p>
          </div>
          <form data-mol-id="reset-form" className={cm.stack(6)} onSubmit={handleSubmit}>
            <div className={cm.stack(4)}>
              <div>
                <label
                  className={cm.cn(
                    cm.fontWeight('medium'),
                    cm.sp('ml', 1),
                    'block text-[0.6875rem] uppercase tracking-widest text-on-surface mb-1.5',
                  )}
                  htmlFor="new-password"
                >
                  {t(
                    'settings.changePasswordModal.newPassword',
                    {},
                    { defaultValue: 'New Password' },
                  )}
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
                    <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>
                      lock
                    </span>
                  </span>
                  <input
                    data-mol-id="reset-password"
                    className={cm.cn(
                      cm.w('full'),
                      cm.sp('pl', 10),
                      cm.sp('pr', 10),
                      cm.sp('py', 3),
                      cm.textSize('sm'),
                      'bg-surface-container-low border-transparent rounded-xl text-on-surface focus:ring-2 focus:ring-primary/30 focus:bg-surface-container-lowest focus:border-transparent transition-all duration-300',
                    )}
                    id="new-password"
                    name="new-password"
                    placeholder="••••••••"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    data-mol-id="reset-toggle-password"
                    className={cm.cn(
                      cm.flex({ align: 'center' }),
                      cm.sp('pl', 3),
                      cm.sp('pr', 3),
                      'absolute inset-y-0 right-0 text-outline hover:text-on-surface transition-colors',
                    )}
                    type="button"
                    aria-label={t(
                      'resetPassword.togglePassword',
                      {},
                      { defaultValue: 'Toggle password visibility' },
                    )}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>
              <div>
                <label
                  className={cm.cn(
                    cm.fontWeight('medium'),
                    cm.sp('ml', 1),
                    'block text-[0.6875rem] uppercase tracking-widest text-on-surface mb-1.5',
                  )}
                  htmlFor="confirm-password"
                >
                  {t(
                    'resetPassword.confirmPasswordLabel',
                    {},
                    { defaultValue: 'Confirm Password' },
                  )}
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
                    <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>
                      lock
                    </span>
                  </span>
                  <input
                    data-mol-id="reset-confirm"
                    className={cm.cn(
                      cm.w('full'),
                      cm.sp('pl', 10),
                      cm.sp('pr', 10),
                      cm.sp('py', 3),
                      cm.textSize('sm'),
                      'bg-surface-container-low border-transparent rounded-xl text-on-surface focus:ring-2 focus:ring-primary/30 focus:bg-surface-container-lowest focus:border-transparent transition-all duration-300',
                    )}
                    id="confirm-password"
                    name="confirm-password"
                    placeholder="••••••••"
                    type={showConfirm ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    data-mol-id="reset-toggle-confirm"
                    className={cm.cn(
                      cm.flex({ align: 'center' }),
                      cm.sp('pl', 3),
                      cm.sp('pr', 3),
                      'absolute inset-y-0 right-0 text-outline hover:text-on-surface transition-colors',
                    )}
                    type="button"
                    aria-label={t(
                      'resetPassword.toggleConfirm',
                      {},
                      { defaultValue: 'Toggle confirm password visibility' },
                    )}
                    aria-pressed={showConfirm}
                    onClick={() => setShowConfirm((v) => !v)}
                  >
                    <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>
                      {showConfirm ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
            {error && (
              <p
                data-mol-id="reset-error"
                role="alert"
                className={cm.cn(cm.textSize('sm'), cm.textCenter, 'text-error')}
              >
                {error}
              </p>
            )}
            <div>
              <button
                data-mol-id="reset-submit"
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
                  ? t('common.resettingEllipsis', {}, { defaultValue: 'Resetting…' })
                  : t('resetPassword.submit', {}, { defaultValue: 'Reset Password' })}
              </button>
            </div>
          </form>
          <div className={cm.cn(cm.sp('mt', 8), cm.textCenter, cm.textSize('sm'))}>
            <Link
              data-mol-id="reset-back-link"
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

export default ResetPassword
export { ResetPassword, ResetPassword as ResetPasswordPage }
