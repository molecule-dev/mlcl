import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { FloatingInput } from '../components/FloatingInput.js'
import { Footer } from '../components/Footer.js'
import { SparqLogo } from '../components/SparqLogo.js'
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await confirmReset({ token, password })
      await login({ email, password })
      clearAuthForm()
      navigate('/discover', { replace: true })
    } catch (_error) {
      // Error tracked in hook state (confirmStatus/loginStatus); no additional handling needed
    }
  }

  return (
    <div
      className={cm.cn(cm.minH('screen'), 'bg-surface text-on-surface antialiased flex flex-col')}
    >
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 8),
          cm.sp('py', 5),
        )}
      >
        <Link to="/" aria-label={`${APP_NAME} home`}>
          <SparqLogo size="md" />
        </Link>
        <ThemeToggle />
      </header>

      <main
        className={cm.cn(
          cm.flex1,
          cm.flex({ align: 'center', justify: 'center' }),
          cm.sp('px', 6),
          cm.sp('py', 8),
        )}
      >
        <div
          className={cm.cn(
            'relative overflow-hidden rounded-[2rem] w-full bg-surface-container-lowest border border-outline-variant/20 shadow-2xl shadow-primary/10',
            cm.maxW('md'),
            cm.sp('p', 10),
          )}
        >
          <span
            className={cm.cn(
              'absolute -top-24 -right-24 w-56 h-56 rounded-full bg-primary/15 blur-3xl',
            )}
            aria-hidden="true"
          />
          <span
            className={cm.cn(
              'absolute -bottom-20 -left-20 w-48 h-48 rounded-full bg-amber-300/20 blur-3xl',
            )}
            aria-hidden="true"
          />
          <div className={cm.cn('relative')}>
            <h1
              className={cm.cn(
                'text-3xl md:text-4xl font-extrabold tracking-tight leading-tight mb-2',
              )}
            >
              {t(
                'auth.resetPassword.setNewPasswordShort',
                {},
                { defaultValue: 'Set new password' },
              )}
            </h1>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mb', 6))}>
              {t(
                'resetPassword.subhead',
                {},
                { defaultValue: 'Choose a new password to get back to your streak.' },
              )}
            </p>

            <form onSubmit={handleSubmit} className={cm.stack(4)}>
              <FloatingInput
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                placeholder={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
              />
              <FloatingInput
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
                placeholder={t(
                  'auth.resetPassword.resetToken',
                  {},
                  { defaultValue: 'Reset token' },
                )}
              />
              <FloatingInput
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                placeholder={t(
                  'auth.resetPassword.newPassword',
                  {},
                  { defaultValue: 'New password' },
                )}
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className={cm.cn(
                  'w-full inline-flex items-center justify-center gap-2 px-7 py-3 rounded-2xl bg-gradient-to-r from-primary to-tertiary text-white font-extrabold text-sm uppercase tracking-widest shadow-xl shadow-primary/30 hover:scale-[1.01] transition-transform disabled:opacity-60',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[18px]')} aria-hidden="true">
                  bolt
                </span>
                {isSubmitting
                  ? t('common.resettingEllipsis', {}, { defaultValue: 'Resetting…' })
                  : t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
              </button>
              {confirmError ? (
                <p className={cm.cn('text-xs font-semibold text-error text-center')}>
                  {confirmError.message}
                </p>
              ) : null}
            </form>

            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.textCenter,
                cm.sp('mt', 6),
                'text-on-surface-variant',
              )}
            >
              <Link to="/login" className={cm.cn('font-extrabold text-primary hover:underline')}>
                {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
              </Link>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default ResetPassword
