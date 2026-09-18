import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthShell } from '../components/AuthShell.js'
import { OAuthButtons } from '../components/OAuthButtons.js'

export function Login() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard'
  const { status, error, login } = useLogin()
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

  const isLoggingIn = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login({ email, password })
      clearAuthForm()
      navigate(from, { replace: true })
    } catch (_error) {
      // error is tracked in error from useLogin hook state
    }
  }

  return (
    <AuthShell
      footer={
        <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-on-surface-variant')}>
          {t('login.noAccount', { app: APP_NAME }, { defaultValue: 'New to {{app}}?' })}{' '}
          <Link
            to="/signup"
            className={cm.cn(
              'font-bold text-primary hover:underline decoration-2 underline-offset-4 ml-1',
            )}
          >
            {t('login.signUp', {}, { defaultValue: 'Open your kitchen' })}
          </Link>
        </p>
      }
    >
      <form className={cm.cn(cm.flex({ direction: 'col' }), 'gap-6')} onSubmit={handleSubmit}>
        <FloatingField
          id="email"
          type="email"
          autoComplete="email"
          icon="mail"
          label={t('login.emailLabel', {}, { defaultValue: 'Email Address' })}
          placeholder={t(
            'auth.passwordPlaceholderNameExample',
            {},
            { defaultValue: 'name@example.com' },
          )}
          value={email}
          onChange={setEmail}
        />

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
              className={cm.cn('text-xs font-bold text-primary hover:opacity-80 transition-colors')}
              to="/forgot-password"
            >
              {t('auth.login.forgotPassword', {}, { defaultValue: 'Forgot password?' })}
            </Link>
          </div>
          <div
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.sp('px', 4),
              'relative bg-surface-container-low rounded-t-lg py-3.5 input-focus-border border-b-2 border-transparent focus-within:border-primary',
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
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={
                showPassword
                  ? t('login.hidePassword', {}, { defaultValue: 'Hide password' })
                  : t('login.showPassword', {}, { defaultValue: 'Show password' })
              }
              className={cm.cn(cm.sp('ml', 2), 'text-outline hover:text-primary transition-colors')}
            >
              <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>

        {error && (
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
            {error.message}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoggingIn}
          className={cm.cn(
            cm.sp('py', 4),
            cm.roundedFull,
            cm.textSize('lg'),
            cm.sp('mt', 2),
            cm.fontWeight('bold'),
            'text-on-primary bg-gradient-to-br from-primary to-tertiary hover:shadow-lg hover:shadow-primary/20 active:scale-95 transition-all disabled:opacity-60',
          )}
        >
          {isLoggingIn
            ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
            : t('login.submit', {}, { defaultValue: 'Sign In' })}
        </button>
      </form>

      <OAuthButtons />
    </AuthShell>
  )
}

interface FloatingFieldProps {
  id: string
  type: string
  autoComplete?: string
  icon: string
  label: string
  placeholder?: string
  value: string
  onChange: (v: string) => void
  required?: boolean
}

function FloatingField(props: FloatingFieldProps) {
  const cm = getClassMap()
  const {
    id,
    type,
    autoComplete,
    icon,
    label,
    placeholder,
    value,
    onChange,
    required = true,
  } = props
  return (
    <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
      <label
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('semibold'),
          cm.sp('ml', 1),
          'uppercase tracking-widest text-on-surface-variant',
        )}
        htmlFor={id}
      >
        {label}
      </label>
      <div
        className={cm.cn(
          cm.flex({ align: 'center' }),
          cm.sp('px', 4),
          'relative bg-surface-container-low rounded-t-lg py-3.5 border-b-2 border-transparent focus-within:border-primary',
        )}
      >
        <span
          className={cm.cn(
            cm.sp('mr', 3),
            cm.textSize('xl'),
            'material-symbols-outlined text-outline',
          )}
        >
          {icon}
        </span>
        <input
          className={cm.cn(
            cm.w('full'),
            cm.sp('p', 0),
            cm.fontWeight('medium'),
            'bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-outline/60',
          )}
          id={id}
          type={type}
          autoComplete={autoComplete}
          required={required}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  )
}
