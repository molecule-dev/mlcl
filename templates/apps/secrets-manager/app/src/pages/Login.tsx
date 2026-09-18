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
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/vaults'
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

  const isLoggingIn = status === 'pending'

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    try {
      await login({ email, password })
      clearAuthForm()
      navigate(from, { replace: true })
    } catch (_error) {
      /* error rendered below via error hook state */
    }
  }

  return (
    <AuthShell
      heading={t(
        'login.heading',
        { appName: APP_NAME },
        { defaultValue: 'Sign in to {{appName}}' },
      )}
      tagline={t('login.tagline', {}, { defaultValue: 'Secrets die in the open.' })}
      footer={
        <>
          {t('login.noAccount', {}, { defaultValue: 'No vault yet?' })}{' '}
          <Link
            to="/signup"
            className={cm.cn(
              'font-headline font-medium text-text underline decoration-border underline-offset-4 transition-colors hover:text-primary',
            )}
          >
            {t('auth.signup.createYourWorkspace', {}, { defaultValue: 'Create your workspace' })}
          </Link>
        </>
      }
    >
      <form className={cm.cn('flex flex-col gap-5')} onSubmit={handleSubmit}>
        <FieldRow
          id="login-email"
          icon="mail"
          label={t('auth.workEmail', {}, { defaultValue: 'Work email' })}
          placeholder="you@arcanum.dev"
          type="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
        />
        <div className={cm.cn('space-y-1.5')}>
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
            <label
              htmlFor="login-password"
              className={cm.cn(
                'block font-mono text-[11px] font-bold uppercase tracking-widest text-muted',
              )}
            >
              {t('login.password', {}, { defaultValue: 'Master password' })}
            </label>
            <Link
              to="/forgot-password"
              className={cm.cn(
                'font-mono text-[11px] font-medium text-primary transition-colors hover:text-primary/80',
              )}
            >
              {t('auth.login.forgotShort', {}, { defaultValue: 'Forgot?' })}
            </Link>
          </div>
          <FieldInput
            id="login-password"
            icon="lock"
            placeholder="••••••••••••"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={setPassword}
          />
        </div>

        {error && (
          <div
            role="alert"
            data-mol-id="login-error"
            className={cm.cn(
              'rounded border border-error/30 bg-error/10 px-3 py-2 font-mono text-xs text-error',
            )}
          >
            {error.message}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoggingIn}
          className={cm.cn(
            'group mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary font-headline font-bold text-on-primary',
            'transition-all hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface',
            'disabled:opacity-60',
          )}
        >
          <span>
            {isLoggingIn
              ? t('login.signingIn', {}, { defaultValue: 'Unlocking…' })
              : t('login.submit', {}, { defaultValue: 'Unlock vault' })}
          </span>
          <span
            aria-hidden="true"
            className="material-symbols-outlined"
            style={{ fontSize: '0.875rem' }}
          >
            keyboard_return
          </span>
        </button>
      </form>

      <OAuthButtons />
    </AuthShell>
  )
}

function FieldRow(props: FieldInputProps & { label: string }) {
  const cm = getClassMap()
  const { label, id, ...rest } = props
  return (
    <div className={cm.cn('space-y-1.5')}>
      <label
        htmlFor={id}
        className={cm.cn(
          'block font-mono text-[11px] font-bold uppercase tracking-widest text-muted',
        )}
      >
        {label}
      </label>
      <FieldInput id={id} {...rest} />
    </div>
  )
}

interface FieldInputProps {
  id: string
  icon: string
  placeholder: string
  type: string
  autoComplete?: string
  value: string
  onChange: (v: string) => void
}

function FieldInput({
  id,
  icon,
  placeholder,
  type,
  autoComplete,
  value,
  onChange,
}: FieldInputProps) {
  const cm = getClassMap()
  return (
    <div className={cm.cn('relative flex items-center')}>
      <span
        aria-hidden="true"
        className={cm.cn(
          'material-symbols-outlined pointer-events-none absolute left-3 text-lg text-muted/60',
        )}
      >
        {icon}
      </span>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        required
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cm.cn(
          'h-10 w-full rounded border border-border bg-background pl-10 pr-3 font-mono text-sm text-text',
          'placeholder:text-muted/40',
          'transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
        )}
      />
    </div>
  )
}

export default Login
