import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { VivaceAuthShell } from '../components/VivaceAuthShell.js'

const INPUT_STYLE = {
  backgroundColor: 'var(--anim-background)',
  color: 'var(--anim-text)',
  border: '1px solid var(--anim-border)',
}

export function Login() {
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
    const form = e.currentTarget as HTMLFormElement
    const liveEmail = (form.querySelector('input#email') as HTMLInputElement | null)?.value ?? email
    const livePassword =
      (form.querySelector('input#password') as HTMLInputElement | null)?.value ?? password
    setLoading(true)
    setError(null)
    try {
      await login({ email: liveEmail, password: livePassword })
      clearAuthForm()
      navigate('/dashboard')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('login.failed', {}, { defaultValue: 'Sign in failed' }),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <VivaceAuthShell
      heading={t('auth.login.signInTitle', {}, { defaultValue: 'Welcome back' })}
      subheading={t('login.subheading', {}, { defaultValue: 'Continue your motion workflow' })}
      footer={
        <>
          {t('login.noAccount', { appName: APP_NAME }, { defaultValue: 'New to {{appName}}?' })}{' '}
          <Link
            to="/signup"
            className={'font-medium transition-colors'}
            style={{ color: 'var(--anim-primary)' }}
          >
            {t('auth.signup.createAnAccount', {}, { defaultValue: 'Create an account' })}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className={cm.stack(5)} data-mol-id="login-form">
        <div className={cm.stack(4)}>
          <div>
            <label
              htmlFor="email"
              className={cm.cn(
                cm.textSize('xs'),
                'block font-mono uppercase tracking-widest mb-1.5',
              )}
              style={{ color: 'var(--anim-text-secondary)' }}
            >
              {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('login.emailPlaceholder', {}, { defaultValue: 'animator@vivace.io' })}
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                'rounded-lg focus:outline-none transition-colors',
              )}
              style={INPUT_STYLE}
            />
          </div>

          <div>
            <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'mb-1.5')}>
              <label
                htmlFor="password"
                className={cm.cn(cm.textSize('xs'), 'font-mono uppercase tracking-widest')}
                style={{ color: 'var(--anim-text-secondary)' }}
              >
                {t('auth.login.password', {}, { defaultValue: 'Password' })}
              </label>
              <Link
                to="/forgot-password"
                className={'font-mono text-[10px] uppercase tracking-widest transition-colors'}
                style={{ color: 'var(--anim-primary)' }}
              >
                {t('auth.login.forgotShort', {}, { defaultValue: 'Forgot?' })}
              </Link>
            </div>
            <div className={cm.cn('relative')}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.sp('pr', 10),
                  cm.textSize('sm'),
                  'rounded-lg focus:outline-none transition-colors',
                )}
                style={INPUT_STYLE}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className={'absolute inset-y-0 right-3 flex items-center transition-colors'}
                style={{ color: 'var(--anim-text-secondary)' }}
                aria-label={t(
                  'login.togglePassword',
                  {},
                  { defaultValue: 'Toggle password visibility' },
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[20px]')}>
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {error && (
          <p
            role="alert"
            data-mol-id="login-error"
            className={cm.cn(cm.textSize('xs'), 'font-mono')}
            style={{ color: 'var(--anim-danger)' }}
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          data-mol-id="login-submit"
          className={cm.cn(
            cm.w('full'),
            cm.sp('py', 3),
            cm.sp('px', 4),
            cm.fontWeight('semibold'),
            cm.flex({ align: 'center', justify: 'center', gap: 2 }),
            'rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
          )}
          style={{
            background:
              'linear-gradient(135deg, var(--anim-primary) 0%, var(--anim-secondary) 100%)',
            color: 'var(--color-on-primary)',
          }}
        >
          <span>
            {loading
              ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
              : t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </span>
          <span className={cm.cn('material-symbols-outlined text-[18px]')}>arrow_forward</span>
        </button>

        <OAuthButtons />
      </form>
    </VivaceAuthShell>
  )
}

export default Login
