import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
function LoginForm() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { login } = useAuth()
  const navigate = useNavigate()
  // Cross-view auth form persistence (email shared across Login/Signup/
  // Forgot/Reset, cleared on success) via the shared @molecule hook.
  const {
    fields: authFormFields,
    setField: setAuthFormField,
    clear: clearAuthForm,
  } = useAuthFormState()
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await login({ email, password })
      clearAuthForm()
      navigate('/')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('auth.error.loginFailed', {}, { defaultValue: 'Login failed' }),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className={cm.cn(cm.flex({ direction: 'col' }), 'gap-6')} onSubmit={handleSubmit}>
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          data-mol-id="login-error"
          style={{
            padding: '12px 16px',
            backgroundColor: 'var(--color-error-container)',
            color: 'var(--color-on-error-container)',
            borderRadius: '8px',
            fontSize: '14px',
            textAlign: 'center',
          }}
        >
          {error}
        </div>
      )}
      {/* Email Field */}
      <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
        <label
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            cm.sp('ml', 1),
            'uppercase tracking-widest text-on-surface-variant',
          )}
          htmlFor="email"
        >
          {t('login.emailLabel', {}, { defaultValue: 'Email Address' })}
        </label>
        <div
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.sp('px', 4),
            'relative bg-surface-container-low rounded-t-lg py-3.5 input-focus-border',
          )}
        >
          <span
            className={cm.cn(
              cm.sp('mr', 3),
              cm.textSize('xl'),
              'material-symbols-outlined text-outline',
            )}
          >
            mail
          </span>
          <input
            className={cm.cn(
              cm.w('full'),
              cm.sp('p', 0),
              cm.fontWeight('medium'),
              'bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-outline/60',
            )}
            id="email"
            placeholder={t('login.emailPlaceholder', {}, { defaultValue: 'curator@ledger.com' })}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
      </div>
      {/* Password Field */}
      <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('px', 1))}>
          <label
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
            htmlFor="password"
          >
            {t('auth.login.password', {}, { defaultValue: 'Password' })}
          </label>
          <Link
            className={cm.cn(
              'text-xs font-bold text-primary hover:text-primary-hover transition-colors',
            )}
            to="/forgot-password"
          >
            {t('login.forgot', {}, { defaultValue: 'Forgot Password?' })}
          </Link>
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.sp('px', 4),
            'relative bg-surface-container-low rounded-t-lg py-3.5 input-focus-border',
          )}
        >
          <span
            className={cm.cn(
              cm.sp('mr', 3),
              cm.textSize('xl'),
              'material-symbols-outlined text-outline',
            )}
          >
            lock
          </span>
          <input
            className={cm.cn(
              cm.w('full'),
              cm.sp('p', 0),
              cm.fontWeight('medium'),
              'bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-outline/60',
            )}
            id="password"
            placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            className={cm.cn(cm.sp('ml', 2), 'text-outline hover:text-primary transition-colors')}
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={
              showPassword
                ? t('login.hidePassword', {}, { defaultValue: 'Hide password' })
                : t('login.showPassword', {}, { defaultValue: 'Show password' })
            }
          >
            <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>
              {showPassword ? 'visibility_off' : 'visibility'}
            </span>
          </button>
        </div>
      </div>
      {/* Primary Action */}
      <button
        className={cm.cn(
          cm.sp('py', 4),
          cm.roundedFull,
          cm.textSize('lg'),
          cm.sp('mt', 4),
          cm.fontWeight('bold'),
          'primary-gradient text-white font-headline hover:shadow-lg hover:shadow-primary/10 active:scale-95 transition-all',
        )}
        type="submit"
        disabled={loading}
      >
        {loading
          ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
          : t('login.submit', {}, { defaultValue: 'Sign In' })}
      </button>
    </form>
  )
}

export default LoginForm
export { LoginForm }
