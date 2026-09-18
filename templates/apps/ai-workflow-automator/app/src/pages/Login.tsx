/**
 * Login — branded centered card on the Dendrite auth shell.
 */
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthShell } from '../components/AuthShell.js'
import { OAuthButtons } from '../components/OAuthButtons.js'

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

  // Clear transient error state on browser navigation so a prior failure
  // doesn't bleed into the next route render.
  useEffect(() => {
    const handler = () => {
      setError(null)
    }
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])

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
          ? err.message.replace(/\b\d{3}\b/g, '').replace(/\bnot\s+found\b/gi, '')
          : t('auth.error.loginFailed', {}, { defaultValue: 'Login failed' }),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      pageId="login"
      heading={t('auth.login.signInTitle', {}, { defaultValue: 'Welcome back' })}
      subhead={t(
        'login.subhead',
        {},
        { defaultValue: 'Sign in to keep your automations flowing.' },
      )}
      footer={
        <>
          {t('login.noAccount', { appName: APP_NAME }, { defaultValue: 'New to {{appName}}?' })}{' '}
          <Link
            to="/signup"
            data-mol-id="login-signup-link"
            className="font-bold transition-colors"
            style={{ color: 'var(--color-accent-violet)' }}
          >
            {t('common.startFree', {}, { defaultValue: 'Start free' })}
          </Link>
        </>
      }
    >
      <form className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))} onSubmit={handleSubmit}>
        {error && (
          <div
            role="alert"
            data-mol-id="login-error"
            className={cm.cn(cm.sp('p', 3), cm.textSize('sm'), 'rounded-xl')}
            style={{
              background: 'var(--color-status-error-bg)',
              color: 'var(--color-status-error-fg)',
            }}
          >
            {error}
          </div>
        )}
        <Field
          id="email"
          molId="login-email"
          label={t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
          icon="mail"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={setEmail}
          required
          autoComplete="email"
        />
        <div>
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
            <label
              htmlFor="password"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest',
              )}
              style={{ color: 'var(--color-status-muted-fg)' }}
            >
              {t('auth.login.password', {}, { defaultValue: 'Password' })}
            </label>
            <Link
              to="/forgot-password"
              data-mol-id="login-forgot-link"
              className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), 'hover:underline')}
              style={{ color: 'var(--color-node-condition)' }}
            >
              {t('auth.login.forgotShort', {}, { defaultValue: 'Forgot?' })}
            </Link>
          </div>
          <PasswordInput
            id="password"
            molId="login-password"
            toggleMolId="login-toggle-password"
            value={password}
            onChange={setPassword}
            show={showPassword}
            onToggleShow={() => setShowPassword((v) => !v)}
            placeholder="••••••••"
            t={t}
          />
        </div>
        <button
          type="submit"
          data-mol-id="login-submit"
          disabled={loading}
          className={cm.cn(
            cm.w('full'),
            cm.sp('py', 3),
            cm.textSize('base'),
            cm.fontWeight('bold'),
            cm.sp('mt', 2),
            'rounded-xl text-white shadow-md transition-all active:scale-[0.98]',
          )}
          style={{
            background:
              'linear-gradient(135deg, var(--color-accent-violet), var(--color-accent-violet))',
            boxShadow: '0 8px 20px color-mix(in srgb, var(--color-accent-violet) 35%, transparent)',
            opacity: loading ? 0.8 : 1,
          }}
        >
          {loading
            ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
            : t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
        </button>
      </form>

      <div className={cm.sp('mt', 4)}>
        <OAuthButtons />
      </div>
    </AuthShell>
  )
}

interface FieldProps {
  id: string
  molId?: string
  label: string
  icon: string
  type: string
  placeholder?: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  autoComplete?: string
}

function Field({
  id,
  molId,
  label,
  icon,
  type,
  placeholder,
  value,
  onChange,
  required,
  autoComplete,
}: FieldProps) {
  const cm = getClassMap()
  return (
    <div>
      <label
        htmlFor={id}
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          'uppercase tracking-widest block',
          cm.sp('mb', 1),
        )}
        style={{ color: 'var(--color-status-muted-fg)' }}
      >
        {label}
      </label>
      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.sp('px', 4),
          cm.sp('py', 3),
          'rounded-xl',
        )}
        style={{ background: 'var(--mol-color-background)', border: '1px solid transparent' }}
      >
        <span
          className={'material-symbols-outlined text-xl'}
          style={{ color: 'var(--color-accent-violet-light)' }}
        >
          {icon}
        </span>
        <input
          id={id}
          data-mol-id={molId}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          autoComplete={autoComplete}
          className={
            'flex-1 bg-transparent border-0 focus:ring-0 focus:outline-none text-foreground placeholder:text-foreground-tertiary'
          }
        />
      </div>
    </div>
  )
}

interface PasswordInputProps {
  id: string
  molId?: string
  toggleMolId?: string
  value: string
  onChange: (v: string) => void
  show: boolean
  onToggleShow: () => void
  placeholder?: string
  t: ReturnType<typeof useTranslation>['t']
}

function PasswordInput({
  id,
  molId,
  toggleMolId,
  value,
  onChange,
  show,
  onToggleShow,
  placeholder,
  t,
}: PasswordInputProps) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'sm' }),
        cm.sp('px', 4),
        cm.sp('py', 3),
        cm.sp('mt', 1),
        'rounded-xl',
      )}
      style={{ background: 'var(--mol-color-background)', border: '1px solid transparent' }}
    >
      <span
        className={'material-symbols-outlined text-xl'}
        style={{ color: 'var(--color-accent-violet-light)' }}
      >
        lock
      </span>
      <input
        id={id}
        data-mol-id={molId}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        autoComplete="current-password"
        className={
          'flex-1 bg-transparent border-0 focus:ring-0 focus:outline-none text-foreground placeholder:text-foreground-tertiary'
        }
      />
      <button
        type="button"
        data-mol-id={toggleMolId}
        onClick={onToggleShow}
        className={
          'text-[var(--color-accent-violet-light)] hover:text-[var(--color-accent-violet)] transition-colors'
        }
        aria-label={
          show
            ? t('login.hidePassword', {}, { defaultValue: 'Hide password' })
            : t('login.showPassword', {}, { defaultValue: 'Show password' })
        }
      >
        <span className={'material-symbols-outlined text-xl'}>
          {show ? 'visibility_off' : 'visibility'}
        </span>
      </button>
    </div>
  )
}

export default Login
