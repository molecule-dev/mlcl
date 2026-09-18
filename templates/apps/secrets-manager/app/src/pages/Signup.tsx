import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthShell } from '../components/AuthShell.js'
import { OAuthButtons } from '../components/OAuthButtons.js'

export function Signup() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { status, error, signup } = useSignup()
  // Cross-view auth form persistence via the shared @molecule hook: the
  // non-secret identity fields (email, name) are shared across the auth
  // views (Login/Signup/Forgot/Reset) and cleared on success. Secrets
  // (password) are deliberately kept in LOCAL state, never shared — see
  // useAuthFormState's docs for the rationale.
  const {
    fields: authFormFields,
    setField: setAuthFormField,
    clear: clearAuthForm,
  } = useAuthFormState()
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const name = authFormFields.name ?? ''
  const setName = (value: string): void => setAuthFormField('name', value)
  const [password, setPassword] = useState('')

  const isSigningUp = status === 'pending'

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    try {
      await signup({ email, password, name: name || undefined })
      clearAuthForm()
      navigate('/vaults', { replace: true })
    } catch (_error) {
      /* error rendered below via error hook state */
    }
  }

  return (
    <AuthShell
      heading={t('signup.heading', {}, { defaultValue: 'Create your vault' })}
      tagline={t(
        'signup.tagline',
        {},
        { defaultValue: 'Start with a free workspace — no credit card required.' },
      )}
      footer={
        <>
          {t('signup.haveAccount', {}, { defaultValue: 'Already have a vault?' })}{' '}
          <Link
            to="/login"
            className={cm.cn(
              'font-headline font-medium text-text underline decoration-border underline-offset-4 transition-colors hover:text-primary',
            )}
          >
            {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </Link>
        </>
      }
    >
      <form className={cm.cn('flex flex-col gap-5')} onSubmit={handleSubmit}>
        <Field
          id="signup-name"
          icon="person"
          label={t('form.displayName', {}, { defaultValue: 'Display name' })}
          placeholder="Ada Lovelace"
          type="text"
          autoComplete="name"
          value={name}
          onChange={setName}
          required={false}
        />
        <Field
          id="signup-email"
          icon="mail"
          label={t('auth.workEmail', {}, { defaultValue: 'Work email' })}
          placeholder="you@arcanum.dev"
          type="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
        />
        <Field
          id="signup-password"
          icon="lock"
          label={t('signup.password', {}, { defaultValue: 'Master password' })}
          placeholder="•••••••••••• (min 12 characters)"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
        />

        {error && (
          <div
            role="alert"
            data-mol-id="signup-error"
            className={cm.cn(
              'rounded border border-error/30 bg-error/10 px-3 py-2 font-mono text-xs text-error',
            )}
          >
            {error.message}
          </div>
        )}

        <button
          type="submit"
          disabled={isSigningUp}
          className={cm.cn(
            'group mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary font-headline font-bold text-on-primary',
            'transition-all hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface',
            'disabled:opacity-60',
          )}
        >
          <span>
            {isSigningUp
              ? t('signup.creating', {}, { defaultValue: 'Provisioning vault…' })
              : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
          </span>
          <span
            aria-hidden="true"
            className="material-symbols-outlined"
            style={{ fontSize: '0.875rem' }}
          >
            arrow_forward
          </span>
        </button>
      </form>

      <OAuthButtons />
    </AuthShell>
  )
}

interface FieldProps {
  id: string
  icon: string
  label: string
  placeholder: string
  type: string
  autoComplete?: string
  required?: boolean
  value: string
  onChange: (v: string) => void
}

function Field({
  id,
  icon,
  label,
  placeholder,
  type,
  autoComplete,
  required = true,
  value,
  onChange,
}: FieldProps) {
  const cm = getClassMap()
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
          required={required}
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
    </div>
  )
}

export default Signup
