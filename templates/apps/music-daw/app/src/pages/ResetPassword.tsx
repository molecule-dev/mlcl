import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BRAND_ACCENT_COLOR, BRAND_COLOR, BRAND_LINK_COLOR } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'

const SUBMIT_GRADIENT = `linear-gradient(135deg, ${BRAND_COLOR}, ${BRAND_ACCENT_COLOR})`

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
  const [showPassword, setShowPassword] = useState(false)
  const [mismatch, setMismatch] = useState(false)

  const isSubmitting = confirmStatus === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setMismatch(true)
      return
    }
    setMismatch(false)
    try {
      await confirmReset({ token, password })
      await login({ email, password })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // Error tracked in hook state — the hook surfaces it via its own error field.
    }
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'relative bg-surface-container-low font-body text-on-surface overflow-hidden',
      )}
    >
      <div
        className={cm.cn(
          'fixed top-0 right-0 -z-10 w-1/3 h-1/3 rounded-full blur-[120px] translate-x-1/3 -translate-y-1/3 pointer-events-none',
        )}
        style={{ background: `${BRAND_COLOR}33` }}
        aria-hidden="true"
      />
      <div
        className={cm.cn(
          'fixed bottom-0 left-0 -z-10 w-1/4 h-1/4 rounded-full blur-[100px] -translate-x-1/3 translate-y-1/3 pointer-events-none',
        )}
        style={{ background: `${BRAND_ACCENT_COLOR}26` }}
        aria-hidden="true"
      />

      <main
        className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.flex1, cm.sp('p', 6))}
      >
        <div className={cm.cn(cm.w('full'), cm.maxW('md'))}>
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'xl' }),
              cm.sp('p', 10),
              'bg-surface-container-lowest rounded-2xl shadow-2xl shadow-on-surface/10 border border-outline-variant/40',
            )}
          >
            <AuthBrandHeader />

            <div className={cm.cn('space-y-2 text-center')}>
              <h2 className={cm.cn('text-2xl font-extrabold tracking-tight')}>
                {t('auth.resetPassword.setNewPassword', {}, { defaultValue: 'Set a new password' })}
              </h2>
              <p className={cm.cn('text-sm text-on-surface-variant')}>
                {t(
                  'resetPassword.body',
                  {},
                  {
                    defaultValue: "Choose a fresh password and we'll get you back into the studio.",
                  },
                )}
              </p>
            </div>

            <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col' }), 'gap-5')}>
              <FieldInput
                id="reset-email"
                type="email"
                icon="mail"
                label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                required
                value={email}
                onChange={setEmail}
                placeholder={t(
                  'resetPassword.emailPlaceholder',
                  {},
                  { defaultValue: 'producer@fugue.studio' },
                )}
                autoComplete="email"
              />
              <FieldInput
                id="reset-token"
                type="text"
                icon="key"
                label={t('auth.resetPassword.resetToken', {}, { defaultValue: 'Reset token' })}
                required
                value={token}
                onChange={setToken}
                placeholder={t(
                  'resetPassword.tokenPlaceholder',
                  {},
                  { defaultValue: 'Paste from email' },
                )}
              />
              <FieldInput
                id="reset-new"
                type={showPassword ? 'text' : 'password'}
                icon="lock"
                label={t('resetPassword.newPasswordLabel', {}, { defaultValue: 'New password' })}
                required
                value={password}
                onChange={setPassword}
                autoComplete="new-password"
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword
                        ? t('resetPassword.hidePassword', {}, { defaultValue: 'Hide password' })
                        : t('resetPassword.showPassword', {}, { defaultValue: 'Show password' })
                    }
                    className={cm.cn('text-outline hover:text-primary transition-colors')}
                  >
                    <span className={cm.cn('text-xl material-symbols-outlined')}>
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                }
              />
              <FieldInput
                id="reset-confirm"
                type={showPassword ? 'text' : 'password'}
                icon="lock_reset"
                label={t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
                required
                value={confirmPassword}
                onChange={setConfirmPassword}
                autoComplete="new-password"
              />

              {mismatch && (
                <p role="alert" className={cm.cn('text-xs font-semibold text-error')}>
                  {t(
                    'auth.signup.passwordsDontMatchPeriod',
                    {},
                    { defaultValue: "Passwords don't match." },
                  )}
                </p>
              )}

              {confirmError && (
                <div
                  role="alert"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.textSize('sm'),
                    cm.textCenter,
                    'bg-error-container text-on-error-container rounded-xl',
                  )}
                >
                  {confirmError.message}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className={cm.cn(
                  cm.sp('py', 4),
                  cm.roundedFull,
                  cm.textSize('lg'),
                  cm.sp('mt', 2),
                  cm.fontWeight('bold'),
                  'text-white hover:shadow-lg active:scale-95 transition-all disabled:opacity-60',
                )}
                style={{ background: SUBMIT_GRADIENT, boxShadow: `0 12px 32px ${BRAND_COLOR}40` }}
              >
                {isSubmitting
                  ? t('common.resettingEllipsis', {}, { defaultValue: 'Resetting…' })
                  : t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
              </button>
            </form>
          </div>

          <footer className={cm.cn(cm.sp('mt', 8), cm.textCenter)}>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant',
              )}
            >
              <Link
                to="/login"
                className={cm.cn('font-bold hover:underline decoration-2 underline-offset-4')}
                style={{ color: BRAND_LINK_COLOR }}
              >
                {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
              </Link>
            </p>
          </footer>
        </div>
      </main>
      <Footer />
    </div>
  )
}

function FieldInput({
  id,
  type,
  label,
  icon,
  placeholder,
  autoComplete,
  required,
  value,
  onChange,
  trailing,
}: {
  id: string
  type: string
  label: string
  icon: string
  placeholder?: string
  autoComplete?: string
  required?: boolean
  value: string
  onChange: (v: string) => void
  trailing?: React.ReactNode
}) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
      <label
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('semibold'),
          cm.sp('ml', 1),
          'uppercase tracking-widest text-on-surface-variant',
        )}
        htmlFor={id}
      >
        {label}
      </label>
      <div
        className={cm.cn(
          cm.flex({ align: 'center' }),
          cm.sp('px', 4),
          'bg-surface-container-low rounded-t-lg py-3.5 border-b-2 border-outline focus-within:border-primary transition-colors',
        )}
      >
        <span
          className={cm.cn(
            cm.sp('mr', 3),
            cm.textSize('xl'),
            'material-symbols-outlined text-outline',
          )}
        >
          {icon}
        </span>
        <input
          className={cm.cn(
            cm.w('full'),
            cm.sp('p', 0),
            cm.fontWeight('medium'),
            'bg-transparent border-none focus:ring-0 outline-none text-on-surface placeholder:text-outline/60',
          )}
          id={id}
          type={type}
          autoComplete={autoComplete}
          required={required}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {trailing}
      </div>
    </div>
  )
}
