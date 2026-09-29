import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_TAGLINE, BRAND_COLOR } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'

const SURFACE_DARK = 'var(--color-background)'
const PANEL = 'var(--color-surface)'
const INPUT_BG = 'var(--color-input-background)'
const BORDER = 'var(--color-border)'

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
  const [confirmPassword, setConfirmPassword] = useState('')
  const [mismatchError, setMismatchError] = useState<string | null>(null)

  const isSubmitting = confirmStatus === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setMismatchError(
        t('auth.signup.passwordsDoNotMatchPeriod', {}, { defaultValue: 'Passwords do not match.' }),
      )
      return
    }
    setMismatchError(null)
    try {
      await confirmReset({ token, password })
      await login({ email, password })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // Error tracked in hook state via resetError/loginError — no additional handling needed.
    }
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'relative font-body overflow-hidden',
      )}
      style={{ backgroundColor: SURFACE_DARK, color: 'var(--color-text)' }}
    >
      <div
        className={cm.cn('absolute inset-0 -z-10 pointer-events-none')}
        style={{
          backgroundImage:
            'linear-gradient(color-mix(in srgb, var(--color-on-background) 3.5%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--color-on-background) 3.5%, transparent) 1px, transparent 1px)',
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
            <div className={cm.cn('mb-4')}>
              <div
                className={cm.cn('inline-flex items-center gap-2 px-3 py-1 rounded-full')}
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)',
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
                  {t('resetPassword.statusBadge', {}, { defaultValue: 'reset · token verified' })}
                </span>
              </div>
            </div>
            <h1 className={cm.cn(cm.flex({ justify: 'center' }))}>
              <BrandWordmark as="span" size="lg" />
            </h1>
            <p
              className={cm.cn('mt-1 font-mono text-xs')}
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <span className={cm.cn('opacity-60')}>v3.1.0 · </span>
              {APP_TAGLINE}
            </p>
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
              <h2 className={cm.cn('text-lg font-bold')} style={{ color: 'var(--color-text)' }}>
                {t('resetPassword.masterHeading', {}, { defaultValue: 'Set New Master Password' })}
              </h2>
              <p className={cm.cn('mt-1 text-sm')} style={{ color: 'var(--color-text-secondary)' }}>
                {t(
                  'resetPassword.subtitle',
                  {},
                  { defaultValue: 'Choose a strong password you have not used before.' },
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
                  htmlFor="email"
                >
                  {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                </label>
                <input
                  id="email"
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
                    'rounded-md font-mono transition-colors',
                  )}
                  style={{
                    backgroundColor: INPUT_BG,
                    border: `1px solid ${BORDER}`,
                    color: 'var(--color-text)',
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
                  htmlFor="token"
                >
                  {t('auth.resetPassword.resetToken', {}, { defaultValue: 'Reset token' })}
                </label>
                <input
                  id="token"
                  type="text"
                  required
                  placeholder={t(
                    'resetPassword.tokenPlaceholder',
                    {},
                    { defaultValue: 'paste from email' },
                  )}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('py', 3),
                    cm.sp('px', 4),
                    cm.textSize('sm'),
                    'rounded-md font-mono transition-colors',
                  )}
                  style={{
                    backgroundColor: INPUT_BG,
                    border: `1px solid ${BORDER}`,
                    color: 'var(--color-text)',
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
                  htmlFor="password"
                >
                  {t('resetPassword.passwordLabel', {}, { defaultValue: 'New password' })}
                </label>
                <input
                  id="password"
                  type="password"
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
                    'rounded-md font-mono transition-colors',
                  )}
                  style={{
                    backgroundColor: INPUT_BG,
                    border: `1px solid ${BORDER}`,
                    color: 'var(--color-text)',
                  }}
                  data-mol-id="reset-password"
                />
              </div>

              <div>
                <label
                  className={cm.cn(
                    'block text-[10px] font-black uppercase tracking-widest mb-2 font-mono',
                  )}
                  style={{ color: 'var(--color-text-secondary)' }}
                  htmlFor="confirmPassword"
                >
                  {t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('py', 3),
                    cm.sp('px', 4),
                    cm.textSize('sm'),
                    'rounded-md font-mono transition-colors',
                  )}
                  style={{
                    backgroundColor: INPUT_BG,
                    border: `1px solid ${BORDER}`,
                    color: 'var(--color-text)',
                  }}
                  data-mol-id="reset-confirm-password"
                />
              </div>

              {(confirmError || mismatchError) && (
                <div
                  data-mol-id="reset-error"
                  role="alert"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.textSize('sm'),
                    'rounded-md text-center',
                  )}
                  style={{
                    backgroundColor: 'var(--color-severity-critical-light)',
                    border: '1px solid var(--color-severity-critical)',
                    color: 'var(--color-severity-critical)',
                  }}
                >
                  {mismatchError || confirmError?.message}
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
                  color: 'var(--color-on-primary)',
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
              className={cm.cn('inline-flex items-center gap-1 font-bold hover:underline')}
              style={{ color: BRAND_COLOR }}
            >
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                arrow_back
              </span>
              {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
            </Link>
          </footer>
        </div>
      </main>
    </div>
  )
}
