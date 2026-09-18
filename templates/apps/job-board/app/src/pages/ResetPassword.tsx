import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { LoginBrandPanel } from '../components/LoginBrandPanel.js'

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
  const [localError, setLocalError] = useState<string | null>(null)
  const isSubmitting = confirmStatus === 'pending'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLocalError(null)
    if (password !== confirmPassword) {
      setLocalError(
        t('resetPassword.passwordMismatch', {}, { defaultValue: 'Passwords don\u2019t match.' }),
      )
      return
    }
    try {
      await confirmReset({ token, password })
      await login({ email, password })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      /* error tracked in hook */
    }
  }

  return (
    <div className={cm.cn(cm.minH('screen'), 'flex bg-background text-on-surface antialiased')}>
      <LoginBrandPanel />
      <main
        className={cm.cn(
          'flex-1 flex items-center justify-center',
          cm.sp('px', 6),
          cm.sp('py', 10),
        )}
      >
        <div className={cm.cn(cm.w('full'), cm.maxW('md'))}>
          <header className={cm.sp('mb', 8)}>
            <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-primary')}>
              {t('auth.resetPassword.accountRecovery', {}, { defaultValue: 'Account recovery' })}
            </p>
            <h1
              className={cm.cn(
                cm.sp('mt', 2),
                cm.textSize('3xl'),
                'font-extrabold tracking-tight text-on-surface',
              )}
            >
              {t('auth.resetPassword.setNewPassword', {}, { defaultValue: 'Set a new password' })}
            </h1>
            <p className={cm.cn(cm.sp('mt', 2), cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'resetPassword.subheading',
                {},
                {
                  defaultValue:
                    'Pick something new and we\u2019ll get you straight back into your dashboard.',
                },
              )}
            </p>
          </header>

          {confirmError || localError ? (
            <div
              role="alert"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.sp('mb', 6),
                cm.textSize('sm'),
                'rounded-xl bg-error/10 text-error font-semibold',
              )}
            >
              {localError ?? confirmError?.message}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
            <ResetField
              id="email"
              type="email"
              label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
              icon="mail"
              value={email}
              onChange={setEmail}
              autoComplete="email"
              required
            />
            <ResetField
              id="token"
              label={t('auth.resetPassword.resetCode', {}, { defaultValue: 'Reset code' })}
              icon="vpn_key"
              value={token}
              onChange={setToken}
              required
            />
            <ResetField
              id="newPassword"
              type="password"
              label={t('resetPassword.newPasswordLabel', {}, { defaultValue: 'New password' })}
              icon="lock"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              required
            />
            <ResetField
              id="confirmPassword"
              type="password"
              label={t(
                'auth.signup.confirmNewPassword',
                {},
                { defaultValue: 'Confirm new password' },
              )}
              icon="lock"
              value={confirmPassword}
              onChange={setConfirmPassword}
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
                cm.textSize('sm'),
                'rounded-xl bg-primary text-on-primary shadow-md shadow-primary/20 hover:opacity-90 transition-opacity disabled:opacity-50',
              )}
            >
              {isSubmitting
                ? t('resetPassword.submitting', {}, { defaultValue: 'Updating\u2026' })
                : t('resetPassword.cta', {}, { defaultValue: 'Set password and sign in' })}
            </button>
          </form>

          <p
            className={cm.cn(
              cm.sp('mt', 8),
              cm.textCenter,
              cm.textSize('sm'),
              'text-on-surface-variant',
            )}
          >
            <Link
              to="/login"
              className={cm.cn(cm.fontWeight('bold'), 'text-primary hover:underline')}
            >
              {t('resetPassword.backToSignIn', {}, { defaultValue: '\u2190 Back to sign in' })}
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}

interface ResetFieldProps {
  id: string
  label: string
  icon: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
  autoComplete?: string
}

function ResetField({
  id,
  label,
  icon,
  value,
  onChange,
  type = 'text',
  required,
  autoComplete,
}: ResetFieldProps) {
  const cm = getClassMap()
  return (
    <div className={cm.flex({ direction: 'col', gap: 'sm' })}>
      <label
        htmlFor={id}
        className={cm.cn(
          'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </label>
      <div
        className={cm.cn(
          cm.flex({ align: 'center' }),
          cm.sp('px', 4),
          cm.sp('py', 3),
          'rounded-xl border border-outline-variant/30 bg-surface-container-lowest focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all',
        )}
      >
        <span
          aria-hidden="true"
          className={cm.cn('material-symbols-outlined text-[20px] text-on-surface-variant')}
        >
          {icon}
        </span>
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required={required}
          className={cm.cn(
            cm.sp('ml', 3),
            cm.fontWeight('medium'),
            cm.textSize('sm'),
            'flex-1 bg-transparent border-none outline-none text-on-surface placeholder:text-on-surface-variant/60',
          )}
        />
      </div>
    </div>
  )
}
