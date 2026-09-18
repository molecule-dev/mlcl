import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { PennantBrandMark } from '../components/PennantBrandMark.js'

const SURFACE_DARK = 'var(--color-background)'
const PANEL = 'var(--color-surface)'
const INPUT_BG = 'var(--color-input-background, var(--color-surface-container-low))'
const BORDER = 'var(--color-border)'

export function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { confirmStatus, confirmError, confirmReset } = usePasswordReset()
  const { login } = useLogin()

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
  const [token, setToken] = useState(searchParams.get('token') || '')
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
      // Error tracked in hook state.
    }
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'relative font-body overflow-hidden',
      )}
      style={{ backgroundColor: SURFACE_DARK, color: 'var(--color-text-code)' }}
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
        style={{ background: 'var(--color-primary)', filter: 'blur(140px)', opacity: 0.1 }}
        aria-hidden="true"
      />

      <main
        className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.flex1, cm.sp('p', 6))}
      >
        <div className={cm.cn(cm.w('full'), cm.maxW('md'))}>
          <header className={cm.cn('text-center mb-6')}>
            <PennantBrandMark size="lg" />
          </header>

          <div
            className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }), cm.sp('p', 8), 'rounded-xl')}
            style={{
              backgroundColor: PANEL,
              border: `1px solid ${BORDER}`,
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
              <p className={cm.cn('mt-1 text-xs text-on-surface-variant')}>
                {t(
                  'resetPassword.subtitle',
                  {},
                  {
                    defaultValue:
                      'Use the token from the email we sent. Tokens expire in 30 minutes.',
                  },
                )}
              </p>
            </div>

            <form className={cm.cn(cm.flex({ direction: 'col' }), 'gap-5')} onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="reset-email"
                  className={cm.cn(
                    'block font-mono text-[10px] font-black uppercase tracking-widest mb-2',
                  )}
                  style={{ color: 'var(--color-text-secondary)' }}
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
                    'w-full rounded-md py-3 px-4 font-mono text-sm transition-colors',
                  )}
                  style={{
                    backgroundColor: INPUT_BG,
                    border: `1px solid ${BORDER}`,
                    color: 'var(--color-text-code)',
                  }}
                />
              </div>
              <div>
                <label
                  htmlFor="reset-token"
                  className={cm.cn(
                    'block font-mono text-[10px] font-black uppercase tracking-widest mb-2',
                  )}
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {t('auth.resetPassword.resetToken', {}, { defaultValue: 'Reset token' })}
                </label>
                <input
                  id="reset-token"
                  type="text"
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder={t('resetPassword.tokenPh', {}, { defaultValue: 'rt_••••' })}
                  className={cm.cn(
                    'w-full rounded-md py-3 px-4 font-mono text-sm transition-colors',
                  )}
                  style={{
                    backgroundColor: INPUT_BG,
                    border: `1px solid ${BORDER}`,
                    color: 'var(--color-text-code)',
                  }}
                />
              </div>
              <div>
                <label
                  htmlFor="reset-password"
                  className={cm.cn(
                    'block font-mono text-[10px] font-black uppercase tracking-widest mb-2',
                  )}
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {t('resetPassword.newPasswordLabel', {}, { defaultValue: 'New password' })}
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
                      'w-full rounded-md py-3 px-4 pr-12 font-mono text-sm transition-colors',
                    )}
                    style={{
                      backgroundColor: INPUT_BG,
                      border: `1px solid ${BORDER}`,
                      color: 'var(--color-text-code)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className={cm.cn(
                      'absolute right-3 top-1/2 -translate-y-1/2 transition-colors hover:opacity-80',
                    )}
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
                  className={cm.cn('rounded-md px-4 py-3 text-sm text-center')}
                  style={{
                    backgroundColor: 'var(--color-error-banner-bg)',
                    border: '1px solid var(--color-error-banner-border)',
                    color: 'var(--color-error-chip-text)',
                  }}
                >
                  {confirmError.message}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className={cm.cn(
                  'rounded-md py-3 text-sm font-mono font-bold transition-all hover:opacity-90 disabled:opacity-60',
                )}
                style={{
                  backgroundColor: 'var(--color-primary)',
                  color: 'var(--color-on-primary-cta)',
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
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <Link
              to="/login"
              className={cm.cn('font-bold hover:underline')}
              style={{ color: 'var(--color-text-link)' }}
            >
              {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
            </Link>
          </footer>
        </div>
      </main>
    </div>
  )
}
