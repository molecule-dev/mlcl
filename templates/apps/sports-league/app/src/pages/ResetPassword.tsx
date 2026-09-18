import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'

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
  const [token, setToken] = useState(searchParams.get('token') ?? '')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const isSubmitting = confirmStatus === 'pending'
  const passwordsMatch = password.length === 0 || confirm.length === 0 || password === confirm

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordsMatch) return
    try {
      await confirmReset({ token, password })
      await login({ email, password })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // error is tracked in hook state via confirmReset/login hooks
    }
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-surface-container-low font-body text-on-surface',
      )}
    >
      <main
        className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.flex1, cm.sp('p', 6))}
      >
        <div className={cm.cn(cm.w('full'), cm.maxW('md'))}>
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'xl' }),
              cm.sp('p', 10),
              'bg-surface-container-lowest rounded-2xl shadow-lg shadow-primary/10',
            )}
          >
            <AuthBrandHeader />
            <div className={cm.cn('text-center -mt-2')}>
              <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
                {t('auth.resetPassword.setNewPassword', {}, { defaultValue: 'Set a new password' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
                {t(
                  'reset.subtitle',
                  {},
                  { defaultValue: 'Choose a strong password of at least 12 characters.' },
                )}
              </p>
            </div>

            <form className={cm.cn(cm.flex({ direction: 'col' }), 'gap-6')} onSubmit={handleSubmit}>
              <Field
                id="email"
                label={t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
                icon="mail"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder={t(
                  'auth.passwordPlaceholderNameExample',
                  {},
                  { defaultValue: 'name@example.com' },
                )}
                autoComplete="email"
                required
              />
              <Field
                id="token"
                label={t('auth.resetPassword.resetToken', {}, { defaultValue: 'Reset token' })}
                icon="vpn_key"
                type="text"
                value={token}
                onChange={setToken}
                placeholder={t('reset.tokenPlaceholder', {}, { defaultValue: 'Paste from email' })}
                required
              />
              <Field
                id="new"
                label={t('reset.newLabel', {}, { defaultValue: 'New password' })}
                icon="lock"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder={t(
                  'common.atLeast12Characters',
                  {},
                  { defaultValue: 'At least 12 characters' },
                )}
                autoComplete="new-password"
                required
              />
              <Field
                id="confirm"
                label={t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
                icon="lock_reset"
                type="password"
                value={confirm}
                onChange={setConfirm}
                placeholder={t(
                  'reset.confirmPlaceholder',
                  {},
                  { defaultValue: 'Repeat the password' },
                )}
                autoComplete="new-password"
                required
              />

              {!passwordsMatch ? (
                <p className={cm.cn(cm.textSize('sm'), cm.textCenter, 'text-loss font-bold')}>
                  {t('reset.mismatch', {}, { defaultValue: 'Passwords don\u2019t match.' })}
                </p>
              ) : null}

              {confirmError ? (
                <div
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.textSize('sm'),
                    cm.textCenter,
                    'bg-error-container text-on-error-container rounded-xl',
                  )}
                  role="alert"
                >
                  {confirmError.message}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting || !passwordsMatch}
                className={cm.cn(
                  cm.sp('py', 4),
                  cm.roundedFull,
                  cm.textSize('lg'),
                  cm.sp('mt', 2),
                  cm.fontWeight('bold'),
                  'text-white hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] transition-all disabled:opacity-60',
                )}
                style={{
                  background:
                    'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                }}
              >
                {isSubmitting
                  ? t('common.resettingEllipsis', {}, { defaultValue: 'Resetting…' })
                  : t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
              </button>
            </form>
          </div>

          <footer className={cm.cn(cm.sp('mt', 8), cm.textCenter)}>
            <Link
              to="/login"
              className={cm.cn(
                'text-sm font-bold text-primary hover:underline decoration-2 underline-offset-4',
              )}
            >
              {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
            </Link>
          </footer>
        </div>
      </main>
      <Footer />
    </div>
  )
}

interface FieldProps {
  id: string
  label: string
  icon: string
  type: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  autoComplete?: string
  required?: boolean
}

function Field({
  id,
  label,
  icon,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
}: FieldProps) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
      <label
        className={cm.cn(
          'text-xs font-bold uppercase tracking-widest text-on-surface-variant px-1',
        )}
        htmlFor={id}
      >
        {label}
      </label>
      <div
        className={cm.cn(
          cm.flex({ align: 'center' }),
          cm.sp('px', 4),
          'bg-surface-container-low rounded-t-lg py-3.5 ring-1 ring-transparent focus-within:ring-primary transition-shadow',
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
          id={id}
          type={type}
          autoComplete={autoComplete}
          required={required}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cm.cn(
            cm.w('full'),
            cm.sp('p', 0),
            cm.fontWeight('medium'),
            'bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-outline/60',
          )}
        />
      </div>
    </div>
  )
}
