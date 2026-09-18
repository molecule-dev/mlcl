import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE, BRAND_COLOR } from '../branding.js'

export function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { confirmStatus, confirmError, confirmReset } = usePasswordReset()
  const { login } = useLogin()

  const [token, setToken] = useState(searchParams.get('token') || '')
  // Cross-view auth form persistence (email shared across Login/Signup/
  // Forgot/Reset, cleared on success). The reset link's ?email= seeds it
  // and wins over any stored value; otherwise the email typed on Forgot
  // carries over.
  const urlEmail = searchParams.get('email') ?? undefined
  const {
    fields: authFormFields,
    setField: setAuthFormField,
    clear: clearAuthForm,
  } = useAuthFormState(urlEmail ? { initialFields: { email: urlEmail } } : undefined)
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const isSubmitting = confirmStatus === 'pending'
  const passwordsMatch = !confirm || confirm === password

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordsMatch) return
    try {
      await confirmReset({ token, password })
      await login({ email, password })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // confirmReset/login rejections are surfaced via the hook's error state
    }
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'relative font-body overflow-hidden',
      )}
      style={{ backgroundColor: 'var(--color-auth-bg)', color: 'var(--mol-color-text)' }}
      data-mol-id="page-reset-password"
    >
      <div
        className={cm.cn('absolute inset-0 -z-10 pointer-events-none')}
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
        aria-hidden="true"
      />
      <div
        className={cm.cn(
          'absolute top-1/4 left-1/2 -translate-x-1/2 -z-10 w-[60rem] h-[60rem] rounded-full pointer-events-none',
        )}
        style={{ background: BRAND_COLOR, filter: 'blur(140px)', opacity: 0.1 }}
        aria-hidden="true"
      />

      <main
        className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.flex1, cm.sp('p', 6))}
      >
        <div className={cm.cn(cm.w('full'), 'max-w-[440px]')}>
          <header className={cm.cn('text-center mb-6')}>
            <div className={cm.cn('mb-4')}>
              <div
                className={cm.cn('inline-flex items-center gap-2 px-3 py-1 rounded-full')}
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.10)',
                  border: '1px solid rgba(16, 185, 129, 0.30)',
                }}
              >
                <span
                  className={cm.cn('h-1.5 w-1.5 rounded-full animate-pulse')}
                  style={{ backgroundColor: BRAND_COLOR }}
                  aria-hidden="true"
                />
                <span
                  className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest')}
                  style={{ color: BRAND_COLOR }}
                >
                  {t(
                    'resetPassword.eyebrow',
                    { app: APP_NAME },
                    { defaultValue: 'recovery · {{app}} access' },
                  )}
                </span>
              </div>
            </div>
            <h1 className={cm.cn('text-3xl font-extrabold tracking-tight')}>{APP_NAME}</h1>
            <p className={cm.cn('mt-1 font-mono text-xs text-on-surface-variant')}>{APP_TAGLINE}</p>
          </header>

          <div
            className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }), cm.sp('p', 8), 'rounded-xl')}
            style={{
              backgroundColor: 'var(--color-auth-panel)',
              border: '1px solid var(--color-auth-border)',
              boxShadow: '0 30px 80px -30px rgba(0, 0, 0, 0.7)',
            }}
          >
            <div>
              <h2 className={cm.cn('text-lg font-bold')}>
                {t('auth.resetPassword.setNewPassword', {}, { defaultValue: 'Set a new password' })}
              </h2>
              <p className={cm.cn('mt-1 text-sm text-on-surface-variant')}>
                {t(
                  'resetPassword.subtitle',
                  { app: APP_NAME },
                  { defaultValue: 'Pick a strong password to regain access to {{app}}.' },
                )}
              </p>
            </div>

            <form className={cm.cn(cm.flex({ direction: 'col' }), 'gap-5')} onSubmit={handleSubmit}>
              <div>
                <label
                  className={cm.cn(
                    'block text-[10px] font-black uppercase tracking-widest mb-2 font-mono',
                  )}
                  style={{ color: 'var(--color-text-muted)' }}
                  htmlFor="reset-email"
                >
                  {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                </label>
                <input
                  id="reset-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('py', 3),
                    cm.sp('px', 4),
                    cm.textSize('sm'),
                    'rounded-md font-mono',
                  )}
                  style={{
                    backgroundColor: 'var(--color-auth-input-bg)',
                    border: '1px solid var(--color-auth-border)',
                    color: 'var(--mol-color-text)',
                  }}
                />
              </div>

              <div>
                <label
                  className={cm.cn(
                    'block text-[10px] font-black uppercase tracking-widest mb-2 font-mono',
                  )}
                  style={{ color: 'var(--color-text-muted)' }}
                  htmlFor="reset-token"
                >
                  {t('auth.resetPassword.resetToken', {}, { defaultValue: 'Reset token' })}
                </label>
                <input
                  id="reset-token"
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('py', 3),
                    cm.sp('px', 4),
                    cm.textSize('sm'),
                    'rounded-md font-mono',
                  )}
                  style={{
                    backgroundColor: 'var(--color-auth-input-bg)',
                    border: '1px solid var(--color-auth-border)',
                    color: 'var(--mol-color-text)',
                  }}
                  placeholder={t(
                    'resetPassword.tokenPlaceholder',
                    {},
                    { defaultValue: 'paste reset token' },
                  )}
                />
              </div>

              <div>
                <label
                  className={cm.cn(
                    'block text-[10px] font-black uppercase tracking-widest mb-2 font-mono',
                  )}
                  style={{ color: 'var(--color-text-muted)' }}
                  htmlFor="reset-password"
                >
                  {t('resetPassword.passwordLabel', {}, { defaultValue: 'New password' })}
                </label>
                <div className={cm.cn('relative')}>
                  <input
                    id="reset-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={cm.cn(
                      cm.w('full'),
                      cm.sp('py', 3),
                      cm.sp('px', 4),
                      cm.textSize('sm'),
                      'rounded-md font-mono pr-12',
                    )}
                    style={{
                      backgroundColor: 'var(--color-auth-input-bg)',
                      border: '1px solid var(--color-auth-border)',
                      color: 'var(--mol-color-text)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className={cm.cn(
                      'absolute right-3 top-1/2 -translate-y-1/2 transition-colors hover:opacity-80',
                    )}
                    style={{ color: 'var(--color-text-muted)' }}
                    aria-label={
                      showPassword
                        ? t('resetPassword.hidePassword', {}, { defaultValue: 'Hide password' })
                        : t('resetPassword.showPassword', {}, { defaultValue: 'Show password' })
                    }
                  >
                    <span className={cm.cn('material-symbols-outlined text-base')}>
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label
                  className={cm.cn(
                    'block text-[10px] font-black uppercase tracking-widest mb-2 font-mono',
                  )}
                  style={{ color: 'var(--color-text-muted)' }}
                  htmlFor="reset-confirm"
                >
                  {t(
                    'auth.signup.confirmNewPassword',
                    {},
                    { defaultValue: 'Confirm new password' },
                  )}
                </label>
                <input
                  id="reset-confirm"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('py', 3),
                    cm.sp('px', 4),
                    cm.textSize('sm'),
                    'rounded-md font-mono',
                  )}
                  style={{
                    backgroundColor: 'var(--color-auth-input-bg)',
                    border: `1px solid ${passwordsMatch ? 'var(--color-auth-border)' : 'rgba(239, 68, 68, 0.5)'}`,
                    color: 'var(--mol-color-text)',
                  }}
                />
                {!passwordsMatch ? (
                  <p
                    className={cm.cn('mt-1 font-mono text-[10px]')}
                    style={{ color: 'var(--color-auth-error-text)' }}
                  >
                    {t(
                      'auth.signup.passwordsDoNotMatchNoPeriod',
                      {},
                      { defaultValue: 'Passwords do not match' },
                    )}
                  </p>
                ) : null}
              </div>

              {confirmError && (
                <div
                  role="alert"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.textSize('sm'),
                    'rounded-md text-center',
                  )}
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.10)',
                    border: '1px solid rgba(239, 68, 68, 0.40)',
                    color: 'var(--color-auth-error-text)',
                  }}
                >
                  {confirmError.message}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !passwordsMatch}
                className={cm.cn(
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  'rounded-md font-mono font-bold transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-60',
                )}
                style={{
                  backgroundColor: BRAND_COLOR,
                  color: 'var(--color-auth-on-primary)',
                  boxShadow: '0 12px 28px -12px rgba(16, 185, 129, 0.6)',
                }}
              >
                {isSubmitting
                  ? t('common.resettingEllipsis', {}, { defaultValue: 'Resetting…' })
                  : t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
              </button>
            </form>
          </div>

          <footer
            className={cm.cn('mt-6 text-center text-sm')}
            style={{ color: 'var(--color-text-muted)' }}
          >
            <p>
              <Link
                to="/login"
                className={cm.cn('font-bold hover:underline inline-flex items-center gap-1')}
                style={{ color: BRAND_COLOR }}
              >
                <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                  arrow_back
                </span>
                {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
              </Link>
            </p>
          </footer>
        </div>
      </main>
    </div>
  )
}
