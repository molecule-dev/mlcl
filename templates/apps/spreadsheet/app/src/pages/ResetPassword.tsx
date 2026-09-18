import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { CalciteAuthHeader } from '../components/CalciteAuthHeader.js'
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
  const [twoFactorToken, setTwoFactorToken] = useState('')

  const isSubmitting = confirmStatus === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await confirmReset({ token, password })
      await login({ email, password })
      clearAuthForm()
      navigate('/workbooks', { replace: true })
    } catch (_error) {
      // error is tracked in confirmError state by usePasswordReset; nothing to do here
    }
  }

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.sp('p', 6),
        'bg-surface-container-low text-on-surface relative',
      )}
    >
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(37,99,235,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.06) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
        aria-hidden="true"
      />
      <div className="absolute top-6 right-6 z-10">
        <ThemeToggle />
      </div>
      <main className={cm.cn(cm.w('full'), cm.maxW('md'), 'relative z-10')}>
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'xl' }),
            cm.sp('p', 10),
            'bg-surface-container-lowest rounded-2xl shadow-xl shadow-primary/5 border border-outline-variant/40',
          )}
        >
          <CalciteAuthHeader
            tagline={t(
              'resetPassword.tagline',
              {},
              { defaultValue: 'Choose a strong password to lock down your workbooks.' },
            )}
            title={t(
              'auth.resetPassword.setNewPassword',
              {},
              { defaultValue: 'Set a new password' },
            )}
            subtitle={t(
              'resetPassword.subtitle',
              {},
              { defaultValue: 'Enter your recovery code and a new password.' },
            )}
          />
          <form className={cm.cn(cm.w('full'), cm.stack(5))} onSubmit={handleSubmit}>
            {confirmError && (
              <div
                role="alert"
                className={'px-4 py-3 text-sm text-error bg-error-container/40 rounded-xl'}
              >
                {confirmError.message}
              </div>
            )}
            <div className={cm.stack(2)}>
              <label
                htmlFor="reset-email"
                className={'text-xs font-bold uppercase tracking-widest text-on-surface-variant'}
              >
                {t('auth.workEmail', {}, { defaultValue: 'Work email' })}
              </label>
              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                placeholder={t(
                  'auth.passwordPlaceholderNameCompany',
                  {},
                  { defaultValue: 'name@company.com' },
                )}
                disabled={isSubmitting}
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'bg-surface-container-low rounded-xl border-0 focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/30 outline-none text-on-surface placeholder:text-on-surface-variant transition-all',
                )}
              />
            </div>
            <div className={cm.stack(2)}>
              <label
                htmlFor="reset-token"
                className={'text-xs font-bold uppercase tracking-widest text-on-surface-variant'}
              >
                {t('resetPassword.token', {}, { defaultValue: 'Recovery code' })}
              </label>
              <input
                id="reset-token"
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
                placeholder={t(
                  'resetPassword.tokenPlaceholder',
                  {},
                  { defaultValue: 'Paste the code from your email' },
                )}
                disabled={isSubmitting}
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'bg-surface-container-low rounded-xl border-0 focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/30 outline-none text-on-surface placeholder:text-on-surface-variant transition-all font-mono text-sm',
                )}
              />
            </div>
            <div className={cm.stack(2)}>
              <label
                htmlFor="reset-password"
                className={'text-xs font-bold uppercase tracking-widest text-on-surface-variant'}
              >
                {t('resetPassword.newPassword', {}, { defaultValue: 'New password' })}
              </label>
              <input
                id="reset-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                placeholder="••••••••"
                disabled={isSubmitting}
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'bg-surface-container-low rounded-xl border-0 focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/30 outline-none text-on-surface placeholder:text-on-surface-variant transition-all',
                )}
              />
            </div>
            <div className={cm.stack(2)}>
              <label
                htmlFor="reset-2fa"
                className={'text-xs font-bold uppercase tracking-widest text-on-surface-variant'}
              >
                {t('resetPassword.twoFactor', {}, { defaultValue: '2-factor code (if enabled)' })}
              </label>
              <input
                id="reset-2fa"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={twoFactorToken}
                onChange={(e) => setTwoFactorToken(e.target.value)}
                autoComplete="one-time-code"
                placeholder="123 456"
                disabled={isSubmitting}
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'bg-surface-container-low rounded-xl border-0 focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/30 outline-none text-on-surface placeholder:text-on-surface-variant transition-all font-mono',
                )}
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className={
                'w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold text-on-primary rounded-xl bg-gradient-to-br from-primary to-primary-dark shadow-lg shadow-primary/25 hover:scale-[1.01] active:scale-[0.99] transition-transform disabled:opacity-60 disabled:cursor-not-allowed'
              }
            >
              {isSubmitting
                ? t('resetPassword.submitting', {}, { defaultValue: 'Updating credentials…' })
                : t('resetPassword.cta', {}, { defaultValue: 'Reset password and sign in' })}
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                lock_reset
              </span>
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
          {t(
            'auth.login.rememberedYourPassword',
            {},
            { defaultValue: 'Remembered your password?' },
          )}{' '}
          <Link
            to="/login"
            className={'text-primary font-bold hover:underline decoration-2 underline-offset-4'}
          >
            {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </Link>
        </p>
      </main>
    </div>
  )
}

export default ResetPassword
