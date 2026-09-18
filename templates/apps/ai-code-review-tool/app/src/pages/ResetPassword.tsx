// Refract reset-password — POLISHED-PATTERN-CATALOG §13 (auth).
// Pattern source: api-documentation Login, narrowed to two password fields
// per screen-map.json derivation notes.
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ACCENT_COLOR, BRAND_COLOR } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'

const submitGradient = `linear-gradient(135deg, ${BRAND_COLOR}, ${ACCENT_COLOR})`

const gridBackground = {
  backgroundImage:
    'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
  backgroundSize: '32px 32px',
}

export function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) {
      setError(
        t(
          'resetPassword.passwordTooShort',
          {},
          { defaultValue: 'Password must be at least 8 characters' },
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
    setLoading(true)
    setError(null)
    try {
      await http.post('/api/users/reset-password', { token, password })
      navigate('/login', { replace: true })
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

  const labelClass = cm.cn(
    cm.fontWeight('semibold'),
    cm.sp('mb', 2),
    'block text-[0.6875rem] tracking-[0.05em] font-mono uppercase',
  )
  const inputBase = cm.cn(
    cm.w('full'),
    cm.sp('py', 4),
    cm.sp('px', 5),
    cm.textSize('sm'),
    'rounded-lg transition-all font-mono',
  )
  const inputStyle = {
    backgroundColor: 'var(--color-auth-input)',
    border: '1px solid var(--color-auth-border)',
    color: 'var(--color-auth-text)',
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'relative font-body overflow-hidden',
      )}
      style={{ backgroundColor: 'var(--color-auth-dark)', color: 'var(--color-auth-text)' }}
    >
      <div className="absolute inset-0 -z-10 pointer-events-none" style={gridBackground} />
      <div
        className={cm.cn(
          'absolute top-1/3 left-1/2 -translate-x-1/2 -z-10 w-[60rem] h-[60rem] rounded-full pointer-events-none',
        )}
        style={{ background: BRAND_COLOR, filter: 'blur(140px)', opacity: 0.16 }}
      />

      <main
        className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.flex1, cm.sp('p', 6))}
      >
        <div className={cm.cn(cm.w('full'), cm.maxW('md'))}>
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'xl' }),
              cm.sp('p', 10),
              'rounded-xl',
            )}
            style={{
              backgroundColor: 'var(--color-auth-panel)',
              border: '1px solid var(--color-auth-border)',
              boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.6)',
            }}
          >
            <AuthBrandHeader
              subtitle={t(
                'auth.resetPassword.setNewPassword',
                {},
                { defaultValue: 'Set a new password' },
              )}
            />

            <form className={cm.cn(cm.flex({ direction: 'col' }), 'gap-5')} onSubmit={handleSubmit}>
              <div>
                <label
                  className={labelClass}
                  style={{ color: 'var(--color-auth-muted)' }}
                  htmlFor="new-password"
                >
                  {t('resetPassword.newPasswordLabel', {}, { defaultValue: 'NEW PASSWORD' })}
                </label>
                <div className="relative">
                  <input
                    className={cm.cn(inputBase, 'pr-12')}
                    style={inputStyle}
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    placeholder={t(
                      'common.atLeast8Characters',
                      {},
                      { defaultValue: 'At least 8 characters' },
                    )}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword
                        ? t('resetPassword.hidePassword', {}, { defaultValue: 'Hide password' })
                        : t('resetPassword.showPassword', {}, { defaultValue: 'Show password' })
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: 'var(--color-auth-muted)' }}
                  >
                    <span className="material-symbols-outlined">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label
                  className={labelClass}
                  style={{ color: 'var(--color-auth-muted)' }}
                  htmlFor="confirm-password"
                >
                  {t('resetPassword.confirmLabel', {}, { defaultValue: 'CONFIRM PASSWORD' })}
                </label>
                <input
                  className={inputBase}
                  style={inputStyle}
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  placeholder={t(
                    'resetPassword.confirmPlaceholder',
                    {},
                    { defaultValue: 'Re-enter your new password' },
                  )}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>

              {error && (
                <div
                  role="alert"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.textSize('sm'),
                    cm.textCenter,
                    'rounded-lg',
                  )}
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--color-error) 15%, transparent)',
                    color: 'var(--color-on-error-container)',
                    border: '1px solid color-mix(in srgb, var(--color-error) 40%, transparent)',
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                data-mol-id="reset-submit"
                className={cm.cn(
                  cm.sp('py', 4),
                  cm.sp('mt', 2),
                  cm.textSize('base'),
                  cm.fontWeight('bold'),
                  'rounded-lg text-white hover:shadow-lg active:scale-95 transition-all disabled:opacity-60',
                )}
                style={{ background: submitGradient }}
              >
                {loading
                  ? t('common.resettingEllipsis', {}, { defaultValue: 'Resetting…' })
                  : t('resetPassword.submit', {}, { defaultValue: 'Reset Password' })}
              </button>
            </form>
          </div>

          <footer className={cm.cn(cm.sp('mt', 8), cm.textCenter)}>
            <Link
              to="/login"
              className={cm.cn('font-bold hover:underline decoration-2 underline-offset-4 text-sm')}
              style={{ color: 'var(--color-auth-link)' }}
            >
              {t('resetPassword.backToLogin', {}, { defaultValue: 'Back to Sign In' })}
            </Link>
          </footer>
        </div>
      </main>
    </div>
  )
}

export default ResetPassword
export { ResetPassword as ResetPasswordPage }
