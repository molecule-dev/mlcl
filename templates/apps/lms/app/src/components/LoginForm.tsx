import { useState } from 'react'
import { Link } from 'react-router'
import { useNavigate } from 'react-router'

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
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await login({ email, password })
      clearAuthForm()
      navigate('/dashboard')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('login.errorInvalidCredentials', {}, { defaultValue: 'Invalid email or password.' }),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className={cm.stack(6)} onSubmit={handleSubmit}>
      {error && (
        <div
          data-mol-id="login-error"
          role="alert"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.textSize('sm'),
            'rounded-xl bg-error-container text-on-error-container',
          )}
        >
          {error}
        </div>
      )}
      {/* Email Field */}
      <div>
        <label
          className={cm.cn(
            cm.fontWeight('semibold'),
            cm.sp('mb', 2),
            'block text-[0.6875rem] text-on-surface-variant tracking-[0.05em] font-label',
          )}
          htmlFor="email"
        >
          {t('login.email', {}, { defaultValue: 'EMAIL' })}
        </label>
        <div className={cm.cn('relative')}>
          <input
            className={cm.cn(
              cm.w('full'),
              cm.sp('py', 4),
              cm.sp('px', 5),
              cm.textSize('sm'),
              'bg-surface-container-low border-none rounded-xl text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary/20 transition-all',
            )}
            id="email"
            name="email"
            placeholder={t('login.emailPlaceholder', {}, { defaultValue: 'Enter your email' })}
            required={true}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>
      {/* Password Field */}
      <div>
        <label
          className={cm.cn(
            cm.fontWeight('semibold'),
            cm.sp('mb', 2),
            'block text-[0.6875rem] text-on-surface-variant tracking-[0.05em] font-label',
          )}
          htmlFor="password"
        >
          {t('login.password', {}, { defaultValue: 'PASSWORD' })}
        </label>
        <div className={cm.cn('relative')}>
          <input
            className={cm.cn(
              cm.w('full'),
              cm.sp('py', 4),
              cm.sp('px', 5),
              cm.sp('pr', 12),
              cm.textSize('sm'),
              'bg-surface-container-low border-none rounded-xl text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary/20 transition-all',
            )}
            id="password"
            name="password"
            placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
            required={true}
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            className={cm.cn(
              'absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors',
            )}
            type="button"
            data-mol-id="btn-toggle-password"
            aria-label={
              showPassword
                ? t('login.hidePassword', {}, { defaultValue: 'Hide password' })
                : t('login.showPassword', {}, { defaultValue: 'Show password' })
            }
            onClick={() => setShowPassword((v) => !v)}
          >
            <span className={cm.cn('material-symbols-outlined')}>
              {showPassword ? 'visibility_off' : 'visibility'}
            </span>
          </button>
        </div>
      </div>
      {/* Remember & Forgot */}
      <div className={cm.flex({ align: 'center', justify: 'between' })}>
        <label className={cm.cn(cm.flex({ align: 'center' }), cm.cursorPointer, 'group')}>
          <div className={cm.cn(cm.flex({ align: 'center' }), 'relative')}>
            <input
              className={cm.cn(
                cm.h(5),
                cm.w(5),
                cm.textPrimary,
                'peer rounded border-none bg-surface-container-low focus:ring-primary/20 transition-all',
              )}
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <div
              className={cm.cn(
                'absolute inset-0 rounded pointer-events-none border-2 border-transparent peer-checked:border-primary opacity-0 peer-checked:opacity-100 transition-opacity',
              )}
            ></div>
          </div>
          <span
            className={cm.cn(
              cm.sp('ml', 2),
              cm.textSize('sm'),
              'text-on-surface-variant group-hover:text-on-surface transition-colors',
            )}
          >
            {t('auth.login.rememberMe', {}, { defaultValue: 'Remember me' })}
          </span>
        </label>
        <Link
          className={cm.cn(
            'text-[0.875rem] font-semibold text-primary hover:opacity-80 transition-opacity',
          )}
          to="/forgot-password"
        >
          {t('auth.login.forgotPassword', {}, { defaultValue: 'Forgot password?' })}
        </Link>
      </div>
      {/* CTA Button */}
      <button
        className={cm.cn(
          cm.w('full'),
          cm.fontWeight('semibold'),
          cm.sp('py', 4),
          cm.flex({ align: 'center', justify: 'center', gap: 2 }),
          'scholar-gradient text-on-primary rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all group',
        )}
        type="submit"
        data-mol-id="btn-login"
        disabled={loading}
      >
        <span>
          {loading
            ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
            : t('login.signIn', {}, { defaultValue: 'Sign In' })}
        </span>
        {!loading && (
          <span
            className={cm.cn(
              'material-symbols-outlined text-[1.2rem] group-hover:translate-x-1 transition-transform',
            )}
          >
            arrow_forward
          </span>
        )}
      </button>
    </form>
  )
}

export default LoginForm
export { LoginForm }
