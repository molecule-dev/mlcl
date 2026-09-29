import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BrandWordmark } from '../components/BrandWordmark.js'
import { ThemeToggle } from '../components/ThemeToggle.js'

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

  const isSubmitting = confirmStatus === 'pending'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await confirmReset({ token, password })
      await login({ email, password })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // Error tracked in hook state; UI reads confirmError from the hook.
    }
  }

  return (
    <div
      className={cm.cn(
        'min-h-screen relative overflow-hidden bg-background text-on-surface antialiased',
      )}
    >
      <div
        aria-hidden="true"
        className={cm.cn(
          'absolute -top-32 -right-20 h-96 w-96 rounded-full bg-primary/10 blur-3xl pointer-events-none',
        )}
      />
      <div
        aria-hidden="true"
        className={cm.cn(
          'absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-secondary-fixed/10 blur-3xl pointer-events-none',
        )}
      />

      <header
        className={cm.cn(
          'relative z-10 flex items-center justify-between',
          cm.sp('px', 6),
          cm.sp('py', 4),
        )}
      >
        <BrandWordmark size="md" />
        <ThemeToggle />
      </header>

      <main className={cm.cn('relative z-10 flex justify-center', cm.sp('px', 6), cm.sp('py', 12))}>
        <div className={cm.cn(cm.maxW('md'), 'w-full')}>
          <div className={cm.sp('mb', 8)}>
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">
              {t('auth.resetPassword.accountRecovery', {}, { defaultValue: 'Account recovery' })}
            </p>
            <h1
              className={cm.cn(
                cm.sp('mt', 2),
                'text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface',
              )}
            >
              {t('auth.resetPassword.setNewPassword', {}, { defaultValue: 'Set a new password' })}
            </h1>
            <p className={cm.cn(cm.sp('mt', 2), cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'resetPassword.subheading',
                {},
                { defaultValue: 'Enter the token from your email and choose a new password.' },
              )}
            </p>
          </div>

          <div
            className={cm.cn(
              cm.sp('p', 8),
              'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-md shadow-primary/5',
            )}
          >
            {confirmError ? (
              <div
                role="alert"
                aria-live="assertive"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.sp('mb', 5),
                  'rounded-xl bg-error/10 text-error text-sm font-semibold',
                )}
              >
                {confirmError.message}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className={cm.stack(4)}>
              <Field
                id="email"
                type="email"
                icon="mail"
                label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                placeholder={t(
                  'resetPassword.emailPlaceholder',
                  {},
                  { defaultValue: 'you@quorum.gov' },
                )}
                value={email}
                onChange={setEmail}
                autoComplete="email"
                required
              />
              <Field
                id="token"
                type="text"
                icon="key"
                label={t('auth.resetPassword.resetToken', {}, { defaultValue: 'Reset token' })}
                placeholder={t(
                  'resetPassword.tokenPlaceholder',
                  {},
                  { defaultValue: 'Paste from email' },
                )}
                value={token}
                onChange={setToken}
                required
              />
              <Field
                id="password"
                type="password"
                icon="lock"
                label={t('resetPassword.passwordLabel', {}, { defaultValue: 'New password' })}
                placeholder={t(
                  'common.atLeast12Characters',
                  {},
                  { defaultValue: 'At least 12 characters' },
                )}
                value={password}
                onChange={setPassword}
                autoComplete="new-password"
                required
              />

              <button
                type="submit"
                disabled={isSubmitting}
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 3),
                  cm.sp('mt', 2),
                  cm.fontWeight('bold'),
                  'rounded-xl bg-primary text-on-primary shadow-md shadow-primary/20 hover:opacity-90 disabled:opacity-50 transition-opacity',
                )}
              >
                {isSubmitting
                  ? t('common.resettingEllipsis', {}, { defaultValue: 'Resetting…' })
                  : t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
              </button>
            </form>
          </div>

          <p
            className={cm.cn(
              cm.sp('mt', 8),
              cm.textCenter,
              cm.textSize('sm'),
              'text-on-surface-variant',
            )}
          >
            <Link to="/login" className={cm.cn('font-bold text-primary hover:underline')}>
              ← {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}

interface FieldProps {
  id: string
  type: string
  label: string
  placeholder: string
  icon: string
  value: string
  onChange: (v: string) => void
  autoComplete?: string
  required?: boolean
}

function Field({
  id,
  type,
  label,
  placeholder,
  icon,
  value,
  onChange,
  autoComplete,
  required,
}: FieldProps) {
  const cm = getClassMap()
  return (
    <div className={cm.flex({ direction: 'col', gap: 'sm' })}>
      <label
        htmlFor={id}
        className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant"
      >
        {label}
      </label>
      <div
        className={cm.cn(
          cm.sp('px', 4),
          cm.sp('py', 3),
          'flex items-center rounded-xl border border-outline-variant/30 bg-surface-container-lowest focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all',
        )}
      >
        <span
          aria-hidden="true"
          className="material-symbols-outlined text-[20px] text-on-surface-variant"
        >
          {icon}
        </span>
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          className={cm.cn(
            cm.sp('ml', 3),
            'flex-1 bg-transparent border-none outline-none text-sm font-medium text-on-surface placeholder:text-on-surface-variant/60',
          )}
        />
      </div>
    </div>
  )
}
