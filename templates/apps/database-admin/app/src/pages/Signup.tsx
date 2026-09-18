import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthShell } from '../components/AuthShell.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { loadContent } from '../config.js'

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
  const [confirm, setConfirm] = useState('')
  const [mismatch, setMismatch] = useState(false)

  const isRegistering = status === 'pending'

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (password !== confirm) {
      setMismatch(true)
      return
    }
    setMismatch(false)
    try {
      await signup({ email, password, name })
      clearAuthForm()
      navigate('/connections', { replace: true })
    } catch (_error) {
      /* error rendered below via the error state */
    }
  }

  return (
    <AuthShell
      heading={t(
        'signup.heading',
        { appName: APP_NAME },
        { defaultValue: 'Create your {{appName}} account' },
      )}
      tagline={t('signup.tagline', {}, { defaultValue: 'Spin up access in under a minute.' })}
      footer={
        <div className={cm.cn('space-y-3')}>
          <div>
            {t('auth.login.alreadyHaveAccount', {}, { defaultValue: 'Already have an account?' })}{' '}
            <Link
              to="/login"
              className={cm.cn(
                'font-headline font-medium text-text underline decoration-border underline-offset-4 transition-colors hover:text-primary',
              )}
            >
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </Link>
          </div>
          <div className={cm.cn('flex items-center justify-center gap-4 text-xs')}>
            <LegalModalLinks
              linkClassName={cm.cn('font-medium transition-colors hover:text-primary')}
              appName={APP_NAME}
              loadContent={loadContent}
              privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
              termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
            />
          </div>
        </div>
      }
    >
      <form className={cm.cn('flex flex-col gap-4')} onSubmit={handleSubmit}>
        <Field
          id="signup-name"
          icon="badge"
          label={t('form.fullName', {}, { defaultValue: 'Full name' })}
          placeholder="Ada Lovelace"
          type="text"
          autoComplete="name"
          value={name}
          onChange={setName}
        />
        <Field
          id="signup-email"
          icon="mail"
          label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          placeholder="admin@domain.com"
          type="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
        />
        <Field
          id="signup-password"
          icon="lock"
          label={t('auth.login.password', {}, { defaultValue: 'Password' })}
          placeholder="••••••••"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
        />
        <Field
          id="signup-confirm"
          icon="check"
          label={t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
          placeholder="••••••••"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={setConfirm}
        />

        {(mismatch || error) && (
          <div
            role="alert"
            data-mol-id="signup-error"
            className={cm.cn(
              'rounded border border-error/30 bg-error/10 px-3 py-2 font-mono text-xs text-error',
            )}
          >
            {mismatch
              ? t(
                  'auth.signup.passwordsDoNotMatchPeriod',
                  {},
                  { defaultValue: 'Passwords do not match.' },
                )
              : error?.message}
          </div>
        )}

        <button
          type="submit"
          disabled={isRegistering}
          className={cm.cn(
            'group mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary font-headline font-bold text-on-primary',
            'transition-all hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface',
            'disabled:opacity-60',
          )}
        >
          <span>
            {isRegistering
              ? t('common.creatingAccountEllipsis', {}, { defaultValue: 'Creating account…' })
              : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
          </span>
          <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-sm font-bold')}>
            keyboard_return
          </span>
        </button>
      </form>

      <OAuthButtons />
    </AuthShell>
  )
}

function Field({
  id,
  icon,
  label,
  placeholder,
  type,
  autoComplete,
  value,
  onChange,
}: {
  id: string
  icon: string
  label: string
  placeholder: string
  type: string
  autoComplete?: string
  value: string
  onChange: (v: string) => void
}) {
  const cm = getClassMap()
  return (
    <div className={cm.cn('space-y-1.5')}>
      <label
        htmlFor={id}
        className={cm.cn(
          'block font-label text-[11px] font-bold uppercase tracking-widest text-muted',
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
          required
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cm.cn(
            'h-10 w-full rounded border border-border bg-bg pl-10 pr-3 font-mono text-sm text-text',
            'placeholder:text-muted/40',
            'transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
          )}
        />
      </div>
    </div>
  )
}

export default Signup
