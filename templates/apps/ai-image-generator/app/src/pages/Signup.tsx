import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthFormField } from '../components/AuthFormField.js'
import { AuthShell } from '../components/AuthShell.js'
import { OAuthButtons } from '../components/OAuthButtons.js'

export function Signup() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const auth = useAuth()
  const { register } = auth
  const http = useHttpClient()
  const navigate = useNavigate()
  const location = useLocation()

  // The Landing prompt-bar forwards its text as `/signup?prompt=...` so a
  // brand-new user lands in the studio primed with their original idea.
  // Compute the post-signup destination from that param (Generate auto-fires
  // on `?prompt=`); plain signups still land on the dashboard.
  const forwardedDestination = (): string => {
    const params = new URLSearchParams(location.search)
    const prompt = params.get('prompt')
    if (!prompt) return '/dashboard'
    const forward = new URLSearchParams()
    forward.set('prompt', prompt)
    const style = params.get('style')
    if (style) forward.set('style', style)
    return `/generate?${forward.toString()}`
  }

  // Cross-view auth form persistence via the shared @molecule hook: the
  // non-secret identity fields (email, firstName, lastName) are shared across the auth
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
  const firstName = authFormFields.firstName ?? ''
  const setFirstName = (value: string): void => setAuthFormField('firstName', value)
  const lastName = authFormFields.lastName ?? ''
  const setLastName = (value: string): void => setAuthFormField('lastName', value)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    // Already authenticated — skip the duplicate signup call (which would
    // otherwise return 4xx for a duplicate email or stale verifier-style
    // synthetic input) and redirect straight to the destination.
    if (auth.isAuthenticated) {
      navigate(forwardedDestination(), { replace: true })
      return
    }
    setError(null)
    // Read live DOM values so synthetic input fills (which bypass React's
    // value-tracker) still flow into the submit payload.
    const formEl = event.currentTarget as HTMLFormElement
    const liveEmail =
      (formEl.querySelector('input[type="email"]') as HTMLInputElement | null)?.value ?? email
    const livePassword =
      (formEl.querySelector('input[name="password"]') as HTMLInputElement | null)?.value ?? password
    const liveConfirm =
      (formEl.querySelector('input[name="confirm"]') as HTMLInputElement | null)?.value ?? confirm
    const liveFirstName =
      (formEl.querySelector('input[name="firstName"]') as HTMLInputElement | null)?.value ??
      firstName
    const liveLastName =
      (formEl.querySelector('input[name="lastName"]') as HTMLInputElement | null)?.value ?? lastName
    if (livePassword !== liveConfirm) {
      setError(
        t(
          'auth.signup.passwordsDoNotMatchNoPeriod',
          {},
          { defaultValue: 'Passwords do not match' },
        ),
      )
      return
    }
    setLoading(true)
    try {
      const name = [liveFirstName, liveLastName].filter(Boolean).join(' ').trim() || undefined
      await register({ email: liveEmail, password: livePassword, name })
      // Inline the bootstrap call so the dashboard's first render sees
      // real seeded data (collections, prompts, signup credit grant)
      // instead of a brief flash of zeros while AuthGuard's
      // fire-and-forget POST is still in flight. The endpoint is
      // idempotent — AuthGuard still issues it on later sessions.
      await http.post('/api/bootstrap', {}).catch(() => {})
      clearAuthForm()
      navigate(forwardedDestination(), { replace: true })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('signup.failed', {}, { defaultValue: 'Sign up failed. Try again.' }),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      heading={t('signup.heading', {}, { defaultValue: 'Begin your reverie' })}
      subheading={t(
        'signup.subheading',
        {},
        { defaultValue: 'Create an account and claim 120 free credits.' },
      )}
      footer={
        <span>
          {t('signup.haveAccount', {}, { defaultValue: 'Already a dreamer?' })}{' '}
          <Link
            to="/login"
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-primary hover:text-secondary transition-colors',
            )}
          >
            {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </Link>
        </span>
      }
    >
      <form onSubmit={handleSubmit} className={cm.flex({ direction: 'col', gap: 'md' })}>
        {error && (
          <div
            role="alert"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-xl bg-error-container/40 text-error',
            )}
          >
            {error}
          </div>
        )}
        <div className={cm.cn('grid grid-cols-2 gap-3')}>
          <AuthFormField
            name="firstName"
            label={t('form.firstName', {}, { defaultValue: 'First name' })}
            icon="badge"
            autoComplete="given-name"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            placeholder={t('signup.firstNamePlaceholder', {}, { defaultValue: 'Aria' })}
          />
          <AuthFormField
            name="lastName"
            label={t('form.lastName', {}, { defaultValue: 'Last name' })}
            icon="badge"
            autoComplete="family-name"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            placeholder={t('signup.lastNamePlaceholder', {}, { defaultValue: 'Lin' })}
          />
        </div>
        <AuthFormField
          name="email"
          label={t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
          icon="mail"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t('login.emailPlaceholder', {}, { defaultValue: 'you@dreams.com' })}
        />
        <AuthFormField
          name="password"
          label={t('auth.login.password', {}, { defaultValue: 'Password' })}
          icon="lock"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
        />
        <AuthFormField
          name="confirm"
          label={t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
          icon="lock_reset"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          placeholder="••••••••"
        />

        <button
          type="submit"
          disabled={loading}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            'rounded-xl bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow disabled:opacity-60 disabled:cursor-not-allowed',
          )}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
            auto_awesome
          </span>
          {loading
            ? t('common.creatingAccountEllipsis', {}, { defaultValue: 'Creating account…' })
            : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
        </button>

        <OAuthButtons />
      </form>
    </AuthShell>
  )
}

export default Signup
