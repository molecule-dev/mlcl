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

  const [token, setToken] = useState(searchParams.get('token') ?? '')
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

  const isPending = confirmStatus === 'pending'
  const passwordsMatch = password.length === 0 || password === confirm

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordsMatch) return
    try {
      await confirmReset({ token, password })
      await login({ email, password })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
      // errors from confirmReset/login are surfaced via confirmError/hook state — no additional handling needed here
    } catch (_error) {
      /* error tracked in hook state */
    }
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-surface-container-low text-on-surface',
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
              'bg-surface-container-lowest rounded-2xl shadow-xl shadow-on-surface/5',
            )}
          >
            <AuthBrandHeader />

            <div className={cm.cn(cm.textCenter, cm.flex({ direction: 'col' }), 'gap-2')}>
              <h2 className={cm.cn(cm.textSize('xl'), 'font-bold tracking-tight')}>
                {t('auth.resetPassword.setNewPassword', {}, { defaultValue: 'Set a new password' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'resetPassword.subtitle',
                  {},
                  {
                    defaultValue:
                      "Choose a password you haven't used before — at least 12 characters.",
                  },
                )}
              </p>
            </div>

            <form className={cm.cn(cm.flex({ direction: 'col' }), 'gap-5')} onSubmit={handleSubmit}>
              <ResetField
                id="email"
                label={t('auth.workEmail', {}, { defaultValue: 'Work email' })}
                icon="mail"
                type="email"
                autoComplete="email"
                value={email}
                onChange={setEmail}
                required
              />
              <ResetField
                id="token"
                label={t('auth.resetPassword.resetToken', {}, { defaultValue: 'Reset token' })}
                icon="vpn_key"
                type="text"
                autoComplete="off"
                value={token}
                onChange={setToken}
                required
              />
              <ResetField
                id="password"
                label={t('resetPassword.newPasswordLabel', {}, { defaultValue: 'New password' })}
                icon="lock"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={setPassword}
                required
              />
              <ResetField
                id="confirm"
                label={t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
                icon="lock"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={setConfirm}
                required
              />

              {!passwordsMatch ? (
                <p className={cm.cn(cm.textSize('xs'), cm.textCenter, 'text-error')}>
                  {t(
                    'auth.signup.passwordsDoNotMatchPeriod',
                    {},
                    { defaultValue: 'Passwords do not match.' },
                  )}
                </p>
              ) : null}

              {confirmError ? (
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
              ) : null}

              <button
                type="submit"
                disabled={isPending || !passwordsMatch}
                className={cm.cn(
                  cm.sp('py', 4),
                  cm.roundedFull,
                  cm.textSize('base'),
                  cm.fontWeight('bold'),
                  'text-white bg-gradient-to-r from-primary to-secondary hover:shadow-lg hover:shadow-primary/30 active:scale-[0.99] transition-all disabled:opacity-60',
                )}
              >
                {isPending
                  ? t('common.resettingEllipsis', {}, { defaultValue: 'Resetting…' })
                  : t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
              </button>
            </form>
          </div>

          <footer className={cm.cn(cm.sp('mt', 8), cm.textCenter)}>
            <Link
              to="/login"
              className={cm.cn(cm.textSize('sm'), 'font-bold text-primary hover:underline')}
            >
              ← {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
            </Link>
          </footer>
        </div>
      </main>
      <Footer />
    </div>
  )
}

interface ResetFieldProps {
  id: string
  label: string
  icon: string
  type: 'text' | 'email' | 'password'
  autoComplete: string
  value: string
  onChange: (v: string) => void
  required?: boolean
}

function ResetField({
  id,
  label,
  icon,
  type,
  autoComplete,
  value,
  onChange,
  required,
}: ResetFieldProps) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
      <label
        htmlFor={id}
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('semibold'),
          cm.sp('ml', 1),
          'uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </label>
      <div
        className={cm.cn(
          cm.flex({ align: 'center' }),
          cm.sp('px', 4),
          'bg-surface-container-low rounded-xl py-3 ring-1 ring-outline-variant/40 focus-within:ring-2 focus-within:ring-primary',
        )}
      >
        <span
          className={cm.cn(
            cm.sp('mr', 3),
            cm.textSize('xl'),
            'material-symbols-outlined text-on-surface-variant',
          )}
          aria-hidden="true"
        >
          {icon}
        </span>
        <input
          id={id}
          type={type}
          autoComplete={autoComplete}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cm.cn(
            cm.w('full'),
            cm.fontWeight('medium'),
            'bg-transparent border-none focus:ring-0 text-on-surface outline-none',
          )}
        />
      </div>
    </div>
  )
}
