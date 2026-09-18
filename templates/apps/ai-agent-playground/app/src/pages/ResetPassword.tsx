import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    if (password.length < 8) {
      setError(
        t(
          'resetPassword.tooShort',
          {},
          { defaultValue: 'Password must be at least 8 characters.' },
        ),
      )
      return
    }
    if (password !== confirm) {
      setError(
        t('auth.signup.passwordsDoNotMatchPeriod', {}, { defaultValue: 'Passwords do not match.' }),
      )
      return
    }
    setLoading(true)
    try {
      // The molecule user resource exposes `PATCH /users/:id/password`. The
      // recovery email contains a signed token that encodes the userId; the
      // backend verifies it and applies the new password without requiring a
      // logged-in session. If the token is malformed or expired the API
      // returns 4xx and we surface a generic error.
      await http.patch(`/users/password${token ? `?token=${encodeURIComponent(token)}` : ''}`, {
        password,
      })
      setInfo(
        t(
          'resetPassword.success',
          {},
          {
            defaultValue: 'Password updated. Redirecting to sign in…',
          },
        ),
      )
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
        cm.minH('screen'),
        'bg-surface-container-lowest text-on-surface font-body relative overflow-hidden bg-terminal-pattern',
      )}
    >
      <div
        className={cm.cn(
          cm.w('[800px]'),
          cm.h('[800px]'),
          'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary/5 blur-[120px] pointer-events-none',
          cm.roundedFull,
        )}
      />
      <div className={cm.cn(cm.w('full'), cm.sp('mx', 4), cm.maxW('[420px]'), 'relative z-10')}>
        <div className={cm.cn(cm.textCenter, cm.sp('mb', 8))}>
          <h1
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('4xl'),
              cm.sp('mb', 2),
              'font-headline tracking-tighter text-on-surface',
            )}
          >
            {t('resetPassword.appName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
          </h1>
          <p
            className={cm.cn(
              cm.textSize('sm'),
              'font-label text-on-surface-variant/70 uppercase tracking-widest',
            )}
          >
            {t('resetPassword.appTagline', {}, { defaultValue: 'Agent development platform' })}
          </p>
        </div>

        <div
          className={cm.cn(
            cm.sp('p', 8),
            'bg-surface-container-low rounded-lg relative border border-outline-variant/15',
          )}
          data-mol-id="reset-password-card"
        >
          <form className={cm.stack(5)} onSubmit={handleSubmit}>
            <div className={cm.stack(4)}>
              <div>
                <label
                  className={cm.cn(
                    cm.textSize('xs'),
                    'block font-label text-on-surface-variant mb-1.5',
                  )}
                  htmlFor="reset-password"
                >
                  {t('resetPassword.passwordLabel', {}, { defaultValue: 'New password' })}
                </label>
                <div className="relative">
                  <input
                    className={cm.cn(
                      cm.w('full'),
                      cm.textSize('sm'),
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.sp('pr', 10),
                      'bg-surface-container-lowest text-on-surface font-label rounded-lg border border-outline-variant/15 focus:border-secondary focus:ring-1 focus:ring-secondary focus:outline-none transition-colors',
                    )}
                    data-mol-id="reset-password-new"
                    id="reset-password"
                    minLength={8}
                    name="password"
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                  />
                  <button
                    aria-label={t(
                      'resetPassword.toggleShow',
                      {},
                      { defaultValue: 'Toggle password visibility' },
                    )}
                    className={cm.cn(
                      cm.flex({ align: 'center' }),
                      cm.sp('pr', 3),
                      'absolute inset-y-0 right-0 text-on-surface-variant/50 hover:text-on-surface transition-colors',
                    )}
                    onClick={() => setShowPassword((v) => !v)}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>
              <div>
                <label
                  className={cm.cn(
                    cm.textSize('xs'),
                    'block font-label text-on-surface-variant mb-1.5',
                  )}
                  htmlFor="reset-password-confirm"
                >
                  {t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
                </label>
                <input
                  className={cm.cn(
                    cm.w('full'),
                    cm.textSize('sm'),
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'bg-surface-container-lowest text-on-surface font-label rounded-lg border border-outline-variant/15 focus:border-secondary focus:ring-1 focus:ring-secondary focus:outline-none transition-colors',
                  )}
                  data-mol-id="reset-password-confirm"
                  id="reset-password-confirm"
                  minLength={8}
                  name="confirm"
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={confirm}
                />
              </div>
            </div>

            {error && (
              <p
                className={cm.cn(cm.textSize('xs'), 'text-error font-label')}
                data-mol-id="reset-password-error"
                role="alert"
              >
                {error}
              </p>
            )}
            {info && (
              <p
                className={cm.cn(cm.textSize('xs'), 'text-secondary font-label')}
                data-mol-id="reset-password-info"
                role="status"
              >
                {info}
              </p>
            )}

            <button
              className={cm.cn(
                cm.w('full'),
                cm.fontWeight('semibold'),
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.flex({ align: 'center', justify: 'center', gap: 2 }),
                'kinetic-gradient text-on-primary-fixed font-headline tracking-tight rounded-lg transition-all',
              )}
              data-mol-id="reset-password-submit"
              disabled={loading}
              type="submit"
            >
              <span>
                {loading
                  ? t('common.resettingEllipsis', {}, { defaultValue: 'Resetting…' })
                  : t('resetPassword.submit', {}, { defaultValue: 'Reset Password' })}
              </span>
              <span className="material-symbols-outlined text-[18px]">login</span>
            </button>
          </form>
        </div>

        <div className={cm.cn(cm.sp('mt', 8), cm.textCenter)}>
          <p className={cm.cn(cm.textSize('sm'), 'font-body text-on-surface-variant')}>
            {t('auth.login.rememberedIt', {}, { defaultValue: 'Remembered it?' })}{' '}
            <Link
              className={
                'font-label text-secondary hover:text-secondary-fixed transition-colors ml-1'
              }
              data-mol-id="reset-password-back-link"
              to="/login"
            >
              {t('auth.backToSignInArrow', {}, { defaultValue: '← Back to sign in' })}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default ResetPassword
export { ResetPassword, ResetPassword as ResetPasswordPage }
