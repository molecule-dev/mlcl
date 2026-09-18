/**
 * Signup — derived from Login per screen-map.
 */
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthShell } from '../components/AuthShell.js'
import { OAuthButtons } from '../components/OAuthButtons.js'

export function Signup() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { register } = useAuth()
  const navigate = useNavigate()
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
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Clear transient state on browser navigation.
  useEffect(() => {
    const handler = () => setError(null)
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError(
        t('auth.signup.passwordsDoNotMatchPeriod', {}, { defaultValue: 'Passwords do not match.' }),
      )
      return
    }
    setLoading(true)
    try {
      await register({ email, password, name })
      clearAuthForm()
      navigate('/dashboard')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message.replace(/\b\d{3}\b/g, '').replace(/\bnot\s+found\b/gi, '')
          : t('signup.failed', {}, { defaultValue: 'Signup failed' }),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      pageId="signup"
      heading={t('auth.signup.createYourAccount', {}, { defaultValue: 'Create your account' })}
      subhead={t(
        'signup.subhead',
        {},
        { defaultValue: 'Start orchestrating your stack in under a minute.' },
      )}
      footer={
        <>
          {t('auth.login.alreadyHaveAccount', {}, { defaultValue: 'Already have an account?' })}{' '}
          <Link
            to="/login"
            data-mol-id="signup-login-link"
            className="font-bold transition-colors"
            style={{ color: 'var(--color-accent-violet)' }}
          >
            {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </Link>
        </>
      }
    >
      <form className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))} onSubmit={handleSubmit}>
        {error && (
          <div
            role="alert"
            data-mol-id="signup-error"
            className={cm.cn(cm.sp('p', 3), cm.textSize('sm'), 'rounded-xl')}
            style={{
              background: 'var(--color-status-error-bg)',
              color: 'var(--color-status-error-fg)',
            }}
          >
            {error}
          </div>
        )}
        <Input
          id="name"
          molId="signup-name"
          label={t('form.fullName', {}, { defaultValue: 'Full name' })}
          icon="person"
          type="text"
          value={name}
          onChange={setName}
          placeholder={t('signup.profileHint', {}, { defaultValue: 'How others will see you' })}
          autoComplete="name"
        />
        <Input
          id="email"
          molId="signup-email"
          label={t('auth.workEmail', {}, { defaultValue: 'Work email' })}
          icon="mail"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder={t('auth.passwordPlaceholderEmail', {}, { defaultValue: 'you@example.com' })}
          autoComplete="email"
          required
        />
        <Input
          id="password"
          molId="signup-password"
          label={t('auth.login.password', {}, { defaultValue: 'Password' })}
          icon="lock"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="••••••••"
          autoComplete="new-password"
          required
        />
        <Input
          id="confirm"
          molId="signup-confirm"
          label={t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
          icon="lock"
          type="password"
          value={confirm}
          onChange={setConfirm}
          placeholder="••••••••"
          autoComplete="new-password"
          required
        />
        <button
          type="submit"
          data-mol-id="signup-submit"
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
            ? t('common.creatingAccountEllipsis', {}, { defaultValue: 'Creating account…' })
            : t('signup.submit', {}, { defaultValue: 'Start automating' })}
        </button>
      </form>
      <div className={cm.sp('mt', 4)}>
        <OAuthButtons />
      </div>
    </AuthShell>
  )
}

function Input(props: {
  id: string
  molId?: string
  label: string
  icon: string
  type: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoComplete?: string
  required?: boolean
}) {
  const cm = getClassMap()
  return (
    <div>
      <label
        htmlFor={props.id}
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          'uppercase tracking-widest block',
          cm.sp('mb', 1),
        )}
        style={{ color: 'var(--color-status-muted-fg)' }}
      >
        {props.label}
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
          {props.icon}
        </span>
        <input
          id={props.id}
          data-mol-id={props.molId}
          type={props.type}
          placeholder={props.placeholder}
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          required={props.required}
          autoComplete={props.autoComplete}
          className={
            'flex-1 bg-transparent border-0 focus:ring-0 focus:outline-none text-foreground placeholder:text-foreground-tertiary'
          }
        />
      </div>
    </div>
  )
}

export default Signup
