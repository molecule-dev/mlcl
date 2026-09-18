import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthShell } from '../components/AuthShell.js'
import { OAuthButtons } from '../components/OAuthButtons.js'

export function Signup() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { register } = useAuth()
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
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await register({ name: name || undefined, email, password })
      clearAuthForm()
      navigate('/surveys', { replace: true })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('signup.failed', {}, { defaultValue: 'Could not create your account.' }),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      heading={t('signup.heading', {}, { defaultValue: 'Start listening today' })}
      subheading={t(
        'signup.subheading',
        {},
        { defaultValue: 'Create your free workspace — no credit card required.' },
      )}
      footer={
        <>
          <span>
            {t('auth.login.alreadyHaveAccount', {}, { defaultValue: 'Already have an account?' })}
          </span>
          <Link
            to="/login"
            className={cm.cn(cm.fontWeight('semibold'), 'text-primary hover:underline')}
          >
            {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </Link>
        </>
      }
    >
      <form className={cm.cn(cm.flex({ direction: 'col', gap: 4 }))} onSubmit={handleSubmit}>
        {error && (
          <div
            role="alert"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'rounded-md bg-error-light text-[color:var(--color-on-error)]',
            )}
          >
            {error}
          </div>
        )}
        <label className={cm.cn(cm.flex({ direction: 'col', gap: 1 }))}>
          <span
            className={cm.cn(
              cm.fontWeight('semibold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('form.fullName', {}, { defaultValue: 'Full name' })}
          </span>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 2 }),
              cm.sp('px', 4),
              'h-12 rounded-md border border-[color:var(--color-border)] bg-surface-secondary focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition-shadow',
            )}
          >
            <span
              className="material-symbols-outlined text-on-surface-variant"
              style={{ fontSize: 18 }}
              aria-hidden="true"
            >
              badge
            </span>
            <input
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={cm.cn(
                cm.flex1,
                cm.sp('p', 0),
                cm.fontWeight('medium'),
                cm.textSize('sm'),
                'bg-transparent border-none focus:outline-none focus:ring-0 text-on-surface placeholder:text-on-surface-variant',
              )}
              placeholder={t('signup.namePlaceholder', {}, { defaultValue: 'Ada Lovelace' })}
            />
          </div>
        </label>
        <label className={cm.cn(cm.flex({ direction: 'col', gap: 1 }))}>
          <span
            className={cm.cn(
              cm.fontWeight('semibold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('auth.workEmail', {}, { defaultValue: 'Work email' })}
          </span>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 2 }),
              cm.sp('px', 4),
              'h-12 rounded-md border border-[color:var(--color-border)] bg-surface-secondary focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition-shadow',
            )}
          >
            <span
              className="material-symbols-outlined text-on-surface-variant"
              style={{ fontSize: 18 }}
              aria-hidden="true"
            >
              mail
            </span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={cm.cn(
                cm.flex1,
                cm.sp('p', 0),
                cm.fontWeight('medium'),
                cm.textSize('sm'),
                'bg-transparent border-none focus:outline-none focus:ring-0 text-on-surface placeholder:text-on-surface-variant',
              )}
              placeholder={t(
                'auth.passwordPlaceholderCompanyEmail',
                {},
                { defaultValue: 'you@company.com' },
              )}
            />
          </div>
        </label>
        <label className={cm.cn(cm.flex({ direction: 'col', gap: 1 }))}>
          <span
            className={cm.cn(
              cm.fontWeight('semibold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('auth.login.password', {}, { defaultValue: 'Password' })}
          </span>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 2 }),
              cm.sp('px', 4),
              'h-12 rounded-md border border-[color:var(--color-border)] bg-surface-secondary focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition-shadow',
            )}
          >
            <span
              className="material-symbols-outlined text-on-surface-variant"
              style={{ fontSize: 18 }}
              aria-hidden="true"
            >
              lock
            </span>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={cm.cn(
                cm.flex1,
                cm.sp('p', 0),
                cm.fontWeight('medium'),
                cm.textSize('sm'),
                'bg-transparent border-none focus:outline-none focus:ring-0 text-on-surface',
              )}
              placeholder={t(
                'common.atLeast8Characters',
                {},
                { defaultValue: 'At least 8 characters' },
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className={cm.cn('text-on-surface-variant hover:text-primary transition-colors')}
              aria-label={
                showPassword
                  ? t('signup.hidePassword', {}, { defaultValue: 'Hide password' })
                  : t('signup.showPassword', {}, { defaultValue: 'Show password' })
              }
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 18 }}
                aria-hidden="true"
              >
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </label>
        <button
          type="submit"
          disabled={loading}
          className={cm.cn(
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'rounded-md bg-gradient-to-r from-primary to-secondary text-white shadow-md hover:shadow-lg hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-60',
          )}
        >
          {loading
            ? t('common.creatingWorkspaceEllipsis', {}, { defaultValue: 'Creating workspace…' })
            : t('signup.submit', {}, { defaultValue: 'Create workspace' })}
        </button>
        <OAuthButtons />
      </form>
    </AuthShell>
  )
}

export default Signup
