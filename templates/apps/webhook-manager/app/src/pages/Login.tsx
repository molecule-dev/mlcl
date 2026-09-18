import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, BRAND_COLOR } from '../branding.js'
import { AuthShell } from '../components/AuthShell.js'
import { OAuthButtons } from '../components/OAuthButtons.js'

const INPUT_BG = 'var(--mol-color-input-background)'
const BORDER = 'var(--mol-color-border)'

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
      /* hook owns error state — caller reads status/error from the hook */
    }
  }

  return (
    <AuthShell
      title={t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
      subtitle={t(
        'login.subtitle',
        { app: APP_NAME },
        { defaultValue: 'Continue to your {{app}} control plane.' },
      )}
      footer={
        <p>
          {t('login.noAccount', {}, { defaultValue: 'New here?' })}{' '}
          <Link
            to="/signup"
            className={cm.cn('font-bold ml-1 hover:underline')}
            style={{ color: BRAND_COLOR }}
          >
            {t('auth.signup.createAnAccount', {}, { defaultValue: 'Create an account' })}
          </Link>
        </p>
      }
    >
      <form className={cm.cn(cm.flex({ direction: 'col' }), 'gap-5')} onSubmit={handleSubmit}>
        <div>
          <label
            className={cm.cn(
              'block text-[10px] font-black uppercase tracking-widest mb-2 font-mono',
            )}
            style={{ color: 'var(--mol-color-text-secondary)' }}
            htmlFor="email"
          >
            {t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            placeholder={t(
              'auth.passwordPlaceholderCompanyEmail',
              {},
              { defaultValue: 'you@company.com' },
            )}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={cm.cn(
              cm.w('full'),
              cm.sp('py', 3),
              cm.sp('px', 4),
              cm.textSize('sm'),
              'rounded-md font-mono transition-colors',
            )}
            style={{
              backgroundColor: INPUT_BG,
              border: `1px solid ${BORDER}`,
              color: 'var(--mol-color-text)',
            }}
            data-mol-id="login-email"
          />
        </div>

        <div>
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 2))}>
            <label
              className={cm.cn('block text-[10px] font-black uppercase tracking-widest font-mono')}
              style={{ color: 'var(--mol-color-text-secondary)' }}
              htmlFor="password"
            >
              {t('auth.login.password', {}, { defaultValue: 'Password' })}
            </label>
            <Link
              to="/forgot-password"
              className={cm.cn('text-xs font-bold transition-opacity hover:opacity-80')}
              style={{ color: BRAND_COLOR }}
            >
              {t('auth.login.forgotShort', {}, { defaultValue: 'Forgot?' })}
            </Link>
          </div>
          <div className={cm.cn('relative')}>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={cm.cn(
                cm.w('full'),
                cm.sp('py', 3),
                cm.sp('px', 4),
                cm.textSize('sm'),
                'rounded-md font-mono transition-colors pr-12',
              )}
              style={{
                backgroundColor: INPUT_BG,
                border: `1px solid ${BORDER}`,
                color: 'var(--mol-color-text)',
              }}
              data-mol-id="login-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className={cm.cn(
                'absolute right-3 top-1/2 -translate-y-1/2 transition-colors hover:opacity-80',
              )}
              style={{ color: 'var(--mol-color-text-secondary)' }}
              aria-label={
                showPassword
                  ? t('login.hidePassword', {}, { defaultValue: 'Hide password' })
                  : t('login.showPassword', {}, { defaultValue: 'Show password' })
              }
            >
              <span className={cm.cn('material-symbols-outlined text-base')}>
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>

        {error ? (
          <div
            data-mol-id="login-error"
            role="alert"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'rounded-md text-center',
            )}
            style={{
              backgroundColor: 'color-mix(in srgb, var(--mol-color-error) 10%, transparent)',
              border: '1px solid color-mix(in srgb, var(--mol-color-error) 40%, transparent)',
              color: 'var(--mol-color-error)',
            }}
          >
            {error.message}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isLoggingIn}
          className={cm.cn(
            cm.sp('py', 3),
            cm.textSize('sm'),
            'rounded-md font-mono font-bold transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-60',
          )}
          style={{
            backgroundColor: BRAND_COLOR,
            color: 'var(--color-on-primary)',
            boxShadow:
              '0 12px 28px -12px color-mix(in srgb, var(--mol-color-primary) 60%, transparent)',
          }}
          data-mol-id="login-submit"
        >
          {isLoggingIn
            ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
            : t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
        </button>
      </form>

      <OAuthButtons />
    </AuthShell>
  )
}
