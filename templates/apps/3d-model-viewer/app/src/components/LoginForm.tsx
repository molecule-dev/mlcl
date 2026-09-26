import React, { useState } from 'react'
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
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({})
  const [submitting, setSubmitting] = useState(false)
  const inputCls = cm.cn(
    cm.w('full'),
    cm.sp('py', 3),
    cm.sp('px', 4),
    'block rounded-[12px] border-0 bg-surface-container-low text-on-surface shadow-sm ring-1 ring-inset ring-outline-variant/20 placeholder:text-outline focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 transition-all duration-200',
  )
  const passwordInputCls = cm.cn(
    cm.w('full'),
    cm.sp('py', 3),
    cm.sp('px', 4),
    cm.sp('pr', 10),
    'block rounded-[12px] border-0 bg-surface-container-low text-on-surface shadow-sm ring-1 ring-inset ring-outline-variant/20 placeholder:text-outline focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 transition-all duration-200',
  )

  function validate() {
    const next: typeof errors = {}
    if (!email) next.email = t('validation.emailRequired', {}, { defaultValue: 'Email required' })
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
      next.email = t('validation.emailInvalid', {}, { defaultValue: 'Enter a valid email' })
    if (!password)
      next.password = t('validation.passwordRequired', {}, { defaultValue: 'Password required' })
    else if (password.length < 8)
      next.password = t('common.atLeast8Characters', {}, { defaultValue: 'At least 8 characters' })
    return next
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const v = validate()
    setErrors(v)
    if (Object.keys(v).length > 0) return
    setSubmitting(true)
    try {
      await login({ email, password })
      clearAuthForm()
      navigate('/dashboard')
    } catch (err) {
      setErrors({
        form:
          err instanceof Error
            ? err.message
            : t('auth.error.loginFailed', {}, { defaultValue: 'Login failed' }),
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className={cm.cn(cm.w('full'), cm.stack(5))} onSubmit={handleSubmit}>
      {/* Email */}
      <div className={cm.stack(1)}>
        <label
          className={cm.cn(
            cm.fontWeight('medium'),
            'block font-label text-[11px] uppercase tracking-[0.05em] text-on-surface-variant',
          )}
          htmlFor="email"
        >
          {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
        </label>
        <div className="relative">
          <input
            autoComplete="email"
            className={inputCls}
            id="email"
            name="email"
            required={true}
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setErrors((er) => ({ ...er, email: undefined }))
            }}
            aria-invalid={!!errors.email}
          />
        </div>
        {errors.email && (
          <p role="alert" className={cm.cn(cm.textSize('xs'), 'text-error')}>
            {errors.email}
          </p>
        )}
      </div>
      {/* Password */}
      <div className={cm.stack(1)}>
        <div className={cm.flex({ align: 'center', justify: 'between' })}>
          <label
            className={cm.cn(
              cm.fontWeight('medium'),
              'block font-label text-[11px] uppercase tracking-[0.05em] text-on-surface-variant',
            )}
            htmlFor="password"
          >
            {t('auth.login.password', {}, { defaultValue: 'Password' })}
          </label>
          <Link
            className={cm.cn(
              'font-label text-[11px] font-medium text-primary hover:text-primary-container transition-colors',
            )}
            to="/forgot-password"
          >
            {t('login.forgotPassword', {}, { defaultValue: 'Forgot Password?' })}
          </Link>
        </div>
        <div className="relative">
          <input
            autoComplete="current-password"
            className={passwordInputCls}
            id="password"
            name="password"
            required={true}
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setErrors((er) => ({ ...er, password: undefined }))
            }}
            aria-invalid={!!errors.password}
          />
          <button
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.sp('pl', 3),
              cm.sp('pr', 3),
              'absolute inset-y-0 right-0 text-outline hover:text-on-surface transition-colors',
            )}
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={
              showPassword
                ? t('login.hidePassword', {}, { defaultValue: 'Hide password' })
                : t('login.showPassword', {}, { defaultValue: 'Show password' })
            }
          >
            <span className="material-symbols-outlined text-[20px]" data-icon="visibility">
              {showPassword ? 'visibility_off' : 'visibility'}
            </span>
          </button>
        </div>
        {errors.password && (
          <p role="alert" className={cm.cn(cm.textSize('xs'), 'text-error')}>
            {errors.password}
          </p>
        )}
      </div>
      {errors.form && (
        <p
          role="alert"
          data-mol-id="login-error"
          className={cm.cn(cm.textSize('xs'), cm.textCenter, 'text-error')}
        >
          {errors.form}
        </p>
      )}
      {/* Submit Button */}
      <div className={cm.sp('pt', 2)}>
        <button
          className={cm.cn(
            cm.w('full'),
            cm.flex({ justify: 'center' }),
            cm.sp('py', 3),
            cm.sp('px', 4),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'btn-gradient rounded-[12px] text-on-primary shadow-sm hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all duration-200 hover:shadow-[0_8px_32px_rgba(26,26,46,0.12)] active:scale-[0.98]',
          )}
          type="submit"
          disabled={submitting}
        >
          {submitting
            ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
            : t('login.submit', {}, { defaultValue: 'Sign In' })}
        </button>
      </div>
    </form>
  )
}

export default LoginForm
export { LoginForm }
