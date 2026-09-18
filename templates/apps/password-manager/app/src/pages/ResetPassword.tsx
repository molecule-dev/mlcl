import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { PasswordStrengthMeter } from '../components/PasswordStrengthMeter.js'
import { SigilBrandHeader } from '../components/SigilBrandHeader.js'

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
  const [confirm, setConfirm] = useState('')
  const [mismatchError, setMismatchError] = useState<string | null>(null)

  const isSubmitting = confirmStatus === 'pending'

  const segments: 1 | 2 | 3 | 4 | null = !password
    ? null
    : password.length >= 16
      ? 4
      : password.length >= 12
        ? 3
        : password.length >= 8
          ? 2
          : 1

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setMismatchError(
        t('auth.signup.passwordsDoNotMatch', {}, { defaultValue: 'Passwords do not match.' }),
      )
      return
    }
    setMismatchError(null)
    try {
      await confirmReset({ token, password })
      await login({ email, password })
      clearAuthForm()
      navigate('/vault', { replace: true })
    } catch (_error) {
      // error surfaced via confirmError from usePasswordReset hook state
    }
  }

  const inputClass = cm.cn(
    cm.w('full'),
    cm.sp('px', 4),
    cm.sp('py', 3),
    cm.textSize('sm'),
    'rounded-lg border border-primary-light/40 bg-surface text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all',
  )

  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'center' }),
        cm.sp('p', 6),
        cm.minH('screen'),
        'bg-surface-container-low/40 font-body text-on-surface',
      )}
    >
      <main className={cm.cn(cm.w('full'), cm.maxW('md'))}>
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'lg' }),
            cm.sp('p', 8),
            'bg-surface rounded-2xl shadow-lg shadow-primary-light/40 border border-primary-light/30',
          )}
        >
          <SigilBrandHeader
            heading={t('reset.heading', {}, { defaultValue: 'Set new master password' })}
            subhead={t(
              'reset.subhead',
              {},
              {
                defaultValue:
                  'All vault items will be re-encrypted locally — this may take a moment.',
              },
            )}
          />

          <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
            {!searchParams.get('email') && (
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                autoComplete="email"
                required
                className={inputClass}
              />
            )}
            {!searchParams.get('token') && (
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={t(
                  'auth.resetPassword.resetToken',
                  {},
                  { defaultValue: 'Reset token' },
                )}
                required
                className={cm.cn(inputClass, 'font-mono')}
              />
            )}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('reset.newPassword', {}, { defaultValue: 'New master password' })}
              autoComplete="new-password"
              required
              className={cm.cn(inputClass, 'font-mono tracking-[0.08em]')}
            />
            {segments && <PasswordStrengthMeter segments={segments} width="full" />}
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={t('reset.confirm', {}, { defaultValue: 'Confirm new master password' })}
              autoComplete="new-password"
              required
              className={cm.cn(inputClass, 'font-mono tracking-[0.08em]')}
            />

            <p
              className={cm.cn(
                cm.flex({ align: 'start', gap: 'xs' }),
                cm.sp('p', 3),
                cm.textSize('xs'),
                'rounded-lg bg-warning-light text-warning border border-amber-200/80 leading-relaxed',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-[16px] mt-0.5')}
                aria-hidden="true"
              >
                bolt
              </span>
              {t(
                'reset.warning',
                {},
                {
                  defaultValue:
                    'All vault items will be re-encrypted locally — this may take a moment.',
                },
              )}
            </p>

            <button
              type="submit"
              disabled={isSubmitting}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                cm.w('full'),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-lg bg-primary hover:bg-primary-hover text-white shadow-md shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed mt-2',
              )}
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                {isSubmitting ? 'progress_activity' : 'autorenew'}
              </span>
              {isSubmitting
                ? t('reset.encrypting', {}, { defaultValue: 'Re-encrypting vault...' })
                : t('reset.submit', {}, { defaultValue: 'Re-encrypt vault' })}
            </button>
            {(mismatchError || confirmError) && (
              <p className={cm.cn(cm.textSize('xs'), 'text-error text-center')}>
                {mismatchError ?? confirmError?.message}
              </p>
            )}
          </form>
        </div>

        <footer
          className={cm.cn(
            cm.sp('mt', 6),
            cm.textCenter,
            cm.textSize('sm'),
            'text-on-surface-variant',
          )}
        >
          <Link to="/login" className={cm.cn('text-primary-dark font-bold hover:underline')}>
            {t('reset.signInLink', {}, { defaultValue: 'Back to Sign In' })}
          </Link>
        </footer>
      </main>
    </div>
  )
}

export default ResetPassword
