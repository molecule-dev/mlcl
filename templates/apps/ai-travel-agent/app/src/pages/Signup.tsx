import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthShell } from '../components/AuthShell.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { loadContent } from '../config.js'

function Signup() {
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
  const nameRef = useRef<HTMLInputElement | null>(null)
  const emailRef = useRef<HTMLInputElement | null>(null)
  const passwordRef = useRef<HTMLInputElement | null>(null)
  const confirmRef = useRef<HTMLInputElement | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    // Prefer the live DOM value so the form still works when inputs
    // are filled programmatically (e.g., automation that bypasses
    // React-controlled value updates).
    const submittedName = name.trim() || (nameRef.current?.value ?? '').trim()
    const submittedEmail = email.trim() || (emailRef.current?.value ?? '').trim()
    const submittedPassword = password || passwordRef.current?.value || ''
    const submittedConfirm = confirm || confirmRef.current?.value || ''
    if (submittedPassword !== submittedConfirm) {
      setError(
        t('auth.signup.passwordsDoNotMatchPeriod', {}, { defaultValue: 'Passwords do not match.' }),
      )
      return
    }
    setLoading(true)
    try {
      await register({ name: submittedName, email: submittedEmail, password: submittedPassword })
      clearAuthForm()
      navigate('/talk')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('signup.failed', {}, { defaultValue: 'Sign up failed' }),
      )
    } finally {
      setLoading(false)
    }
  }

  const inputClass = cm.cn(
    cm.w('full'),
    cm.sp('px', 4),
    cm.sp('py', 3),
    'rounded-xl bg-surface-secondary border border-border text-foreground placeholder-foreground-tertiary focus:border-primary focus:ring-2 focus:ring-primary/40 outline-none transition-all',
  )
  const labelText = cm.cn(
    cm.textSize('xs'),
    cm.fontWeight('semibold'),
    cm.textMuted,
    'uppercase tracking-widest',
  )

  return (
    <AuthShell
      heading={t('signup.heading', {}, { defaultValue: 'Create your voice' })}
      subheading={t(
        'signup.subheading',
        {},
        { defaultValue: 'A few details and you can start talking.' },
      )}
      footer={
        <div className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(4))}>
          <OAuthButtons />
          <p className={cm.cn(cm.textCenter, cm.textSize('sm'), cm.textMuted)}>
            {t('auth.login.alreadyHaveAccount', {}, { defaultValue: 'Already have an account?' })}{' '}
            <Link
              to="/login"
              className={cm.cn(
                cm.fontWeight('semibold'),
                'text-secondary hover:text-secondary-light transition-colors',
              )}
            >
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </Link>
          </p>
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'center', gap: 'md' }))}>
            <LegalModalLinks
              linkClassName={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                cm.textMuted,
                'hover:text-primary transition-colors',
              )}
              appName={APP_NAME}
              loadContent={loadContent}
              privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
              termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
            />
          </div>
        </div>
      }
    >
      <form className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(4))} onSubmit={handleSubmit}>
        <label className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(2))}>
          <span className={labelText}>{t('form.fullName', {}, { defaultValue: 'Full name' })}</span>
          <input
            ref={nameRef}
            type="text"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('signup.fullPlaceholder', {}, { defaultValue: 'e.g. Alex Rivera' })}
            className={inputClass}
          />
        </label>
        <label className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(2))}>
          <span className={labelText}>
            {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          </span>
          <input
            ref={emailRef}
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t(
              'auth.passwordPlaceholderEmail',
              {},
              { defaultValue: 'you@example.com' },
            )}
            className={inputClass}
          />
        </label>
        <label className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(2))}>
          <span className={labelText}>
            {t('auth.login.password', {}, { defaultValue: 'Password' })}
          </span>
          <input
            ref={passwordRef}
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t(
              'common.atLeast8Characters',
              {},
              { defaultValue: 'At least 8 characters' },
            )}
            className={inputClass}
          />
        </label>
        <label className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(2))}>
          <span className={labelText}>
            {t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
          </span>
          <input
            ref={confirmRef}
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={t(
              'auth.signup.repeatYourPassword',
              {},
              { defaultValue: 'Repeat your password' },
            )}
            className={inputClass}
          />
        </label>
        {error ? (
          <div
            role="alert"
            data-mol-id="signup-error"
            className={cm.cn(
              cm.roundedFull,
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.textCenter,
              'bg-error/15 text-error border border-error/30',
            )}
          >
            {error}
          </div>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className={cm.cn(
            cm.roundedFull,
            cm.fontWeight('bold'),
            cm.sp('py', 3),
            cm.textSize('base'),
            'bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/30 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60',
          )}
        >
          {loading
            ? t('common.creatingAccountEllipsis', {}, { defaultValue: 'Creating account…' })
            : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
        </button>
      </form>
    </AuthShell>
  )
}

export default Signup
export { Signup, Signup as SignupPage }
