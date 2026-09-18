import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthBrandHeader } from '../components/AuthBrandHeader.js'

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await confirmReset({ token, password })
      await login({ email, password })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // hook exposes the error via its own state; no action needed here
    }
  }

  return (
    <div
      data-mol-id="page-reset-password"
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
              'bg-surface-container-lowest rounded-2xl shadow-xl shadow-primary/10',
            )}
          >
            <AuthBrandHeader />

            <div>
              <h2
                className={cm.cn(cm.textSize('xl'), cm.textCenter, 'font-extrabold tracking-tight')}
              >
                {t('auth.resetPassword.setNewPassword', {}, { defaultValue: 'Set a new password' })}
              </h2>
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.textCenter,
                  cm.sp('mt', 1),
                  'text-on-surface-variant',
                )}
              >
                {t(
                  'resetPassword.subheading',
                  {},
                  { defaultValue: 'Pick something memorable but hard to guess.' },
                )}
              </p>
            </div>

            <form className={cm.cn(cm.flex({ direction: 'col' }), 'gap-4')} onSubmit={handleSubmit}>
              <FieldShell
                cm={cm}
                id="reset-email"
                icon="mail"
                label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
              >
                <input
                  id="reset-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@school.edu"
                  className={inputClass(cm)}
                />
              </FieldShell>

              <FieldShell
                cm={cm}
                id="reset-token"
                icon="vpn_key"
                label={t('auth.resetPassword.resetToken', {}, { defaultValue: 'Reset token' })}
              >
                <input
                  id="reset-token"
                  type="text"
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder={t(
                    'resetPassword.tokenPlaceholder',
                    {},
                    { defaultValue: 'Paste the code from your email' },
                  )}
                  className={inputClass(cm)}
                />
              </FieldShell>

              <FieldShell
                cm={cm}
                id="reset-password"
                icon="lock_reset"
                label={t('resetPassword.newPassword', {}, { defaultValue: 'New password' })}
              >
                <input
                  id="reset-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputClass(cm)}
                />
              </FieldShell>

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
                  'bg-gradient-to-r from-primary to-primary/80 text-on-primary hover:shadow-lg hover:shadow-primary/30 active:scale-95 transition-all disabled:opacity-60',
                )}
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
                className={cm.cn(
                  'font-bold text-primary hover:underline decoration-2 underline-offset-4',
                )}
              >
                {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
              </Link>
            </p>
          </footer>
        </div>
      </main>
    </div>
  )
}

function inputClass(cm: ReturnType<typeof getClassMap>): string {
  return cm.cn(
    cm.w('full'),
    cm.sp('p', 0),
    cm.fontWeight('medium'),
    'bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-on-surface-variant focus:outline-none',
  )
}

function FieldShell({
  cm,
  id,
  label,
  icon,
  children,
}: {
  cm: ReturnType<typeof getClassMap>
  id: string
  label: string
  icon: string
  children: React.ReactNode
}) {
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
          'relative bg-surface-container-low rounded-t-lg py-3.5 border-b-2 border-outline-variant focus-within:border-primary',
        )}
      >
        <span
          className={cm.cn(
            cm.sp('mr', 3),
            cm.textSize('xl'),
            'material-symbols-outlined text-primary',
          )}
        >
          {icon}
        </span>
        {children}
      </div>
    </div>
  )
}
