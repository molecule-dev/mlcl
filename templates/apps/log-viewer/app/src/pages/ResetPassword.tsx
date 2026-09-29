import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_TAGLINE, BRAND_COLOR } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'

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
  const [showPassword, setShowPassword] = useState(false)

  const isSubmitting = confirmStatus === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await confirmReset({ token, password })
      await login({ email, password })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // Error tracked in hook state; no additional logging needed.
    }
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'relative font-body overflow-hidden',
      )}
      style={{
        backgroundColor: 'var(--color-background)',
        color: 'var(--color-severity-debug-light)',
      }}
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
        <div className={cm.cn(cm.w('full'), cm.maxW('md'))}>
          <header className={cm.cn('text-center mb-6')}>
            <h1 className={cm.cn('text-4xl font-extrabold tracking-tighter text-on-surface')}>
              <BrandWordmark as="span" size="lg" />
            </h1>
            <p className={cm.cn('mt-1 font-mono text-xs text-on-surface-variant')}>{APP_TAGLINE}</p>
          </header>

          <div
            className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }), cm.sp('p', 8), 'rounded-xl')}
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              boxShadow: '0 30px 80px -30px rgba(0, 0, 0, 0.7)',
            }}
          >
            <div>
              <h2 className={cm.cn('text-lg font-bold text-on-surface')}>
                {t(
                  'auth.resetPassword.setNewPasswordShort',
                  {},
                  { defaultValue: 'Set new password' },
                )}
              </h2>
              <p className={cm.cn('mt-1 text-sm text-on-surface-variant')}>
                {t(
                  'resetPassword.subtitle',
                  {},
                  {
                    defaultValue: 'Pick a strong password — we will sign you in once it is saved.',
                  },
                )}
              </p>
            </div>

            <form className={cm.cn(cm.flex({ direction: 'col' }), 'gap-5')} onSubmit={handleSubmit}>
              <div>
                <label
                  className={cm.cn(
                    'block text-[10px] font-black uppercase tracking-widest mb-2 font-mono',
                  )}
                  style={{ color: 'var(--color-text-secondary)' }}
                  htmlFor="reset-email"
                >
                  {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                </label>
                <input
                  id="reset-email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder={t(
                    'auth.passwordPlaceholderEmail',
                    {},
                    { defaultValue: 'you@example.com' },
                  )}
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
                    backgroundColor: 'var(--color-input-background)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-severity-debug-light)',
                  }}
                  data-mol-id="reset-email"
                />
              </div>

              <div>
                <label
                  className={cm.cn(
                    'block text-[10px] font-black uppercase tracking-widest mb-2 font-mono',
                  )}
                  style={{ color: 'var(--color-text-secondary)' }}
                  htmlFor="reset-token"
                >
                  {t('auth.resetPassword.resetToken', {}, { defaultValue: 'Reset token' })}
                </label>
                <input
                  id="reset-token"
                  type="text"
                  required
                  placeholder={t(
                    'resetPassword.tokenPlaceholder',
                    {},
                    { defaultValue: 'Paste from email' },
                  )}
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
                    backgroundColor: 'var(--color-input-background)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-severity-debug-light)',
                  }}
                  data-mol-id="reset-token"
                />
              </div>

              <div>
                <label
                  className={cm.cn(
                    'block text-[10px] font-black uppercase tracking-widest mb-2 font-mono',
                  )}
                  style={{ color: 'var(--color-text-secondary)' }}
                  htmlFor="reset-password"
                >
                  {t('resetPassword.newPasswordLabel', {}, { defaultValue: 'New password' })}
                </label>
                <div className={cm.cn('relative')}>
                  <input
                    id="reset-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
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
                      backgroundColor: 'var(--mol-color-background)',
                      border: '1px solid var(--mol-color-border)',
                      color: 'var(--color-severity-debug-light)',
                    }}
                    data-mol-id="reset-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className={cm.cn('absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-80')}
                    style={{ color: 'var(--color-text-secondary)' }}
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
                    backgroundColor: 'color-mix(in srgb, var(--color-error) 10%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--color-error) 40%, transparent)',
                    color: 'var(--color-error-light)',
                  }}
                >
                  {confirmError.message}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className={cm.cn(
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  'rounded-md font-mono font-bold transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-60',
                )}
                style={{
                  backgroundColor: BRAND_COLOR,
                  color: 'var(--color-background)',
                  boxShadow:
                    '0 12px 28px -12px color-mix(in srgb, var(--color-primary) 60%, transparent)',
                }}
                data-mol-id="reset-submit"
              >
                {isSubmitting
                  ? t('common.resettingEllipsis', {}, { defaultValue: 'Resetting…' })
                  : t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
              </button>
            </form>
          </div>

          <footer
            className={cm.cn('mt-6 text-center text-sm')}
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <Link
              to="/login"
              className={cm.cn('font-bold hover:underline')}
              style={{ color: BRAND_COLOR }}
            >
              {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
            </Link>
          </footer>
        </div>
      </main>
    </div>
  )
}
