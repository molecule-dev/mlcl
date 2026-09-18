import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
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
  const [showPassword, setShowPassword] = useState(false)

  const isSigningUp = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await signup({ email, password, name: name || undefined })
      clearAuthForm()
      navigate('/clips', { replace: true })
    } catch (_error) {
      // Error tracked in hook state
    }
  }

  return (
    <AuthShell
      brandSubtitle={t('signup.brandSubtitle', {}, { defaultValue: 'Copy once, find forever.' })}
      heading={t(
        'signup.heading',
        { appName: APP_NAME },
        { defaultValue: 'Create your {{appName}} account' },
      )}
      body={t(
        'signup.body',
        {},
        {
          defaultValue:
            'Sync every snippet across every device — encrypted, searchable, and instantly recallable.',
        },
      )}
      footerSlot={
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('auth.login.alreadyHaveAccount', {}, { defaultValue: 'Already have an account?' })}{' '}
          <Link
            to="/login"
            className={cm.cn('font-semibold hover:underline')}
            style={{ color: 'var(--color-primary)' }}
          >
            {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </Link>
        </p>
      }
    >
      <form className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))} onSubmit={handleSubmit}>
        <div>
          <label
            htmlFor="name"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              cm.sp('mb', 1),
              'block text-on-surface',
            )}
          >
            {t('form.displayName', {}, { defaultValue: 'Display name' })}
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('signup.namePlaceholder', {}, { defaultValue: 'Alex Morgan' })}
            className={cm.cn(
              cm.w('full'),
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'rounded-md border border-outline-variant bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
            )}
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              cm.sp('mb', 1),
              'block text-on-surface',
            )}
          >
            {t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
          </label>
          <input
            id="email"
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
            className={cm.cn(
              cm.w('full'),
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'rounded-md border border-outline-variant bg-surface-container-lowest font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
            )}
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              cm.sp('mb', 1),
              'block text-on-surface',
            )}
          >
            {t('auth.login.password', {}, { defaultValue: 'Password' })}
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t(
                'common.atLeast8Characters',
                {},
                { defaultValue: 'At least 8 characters' },
              )}
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'rounded-md border border-outline-variant bg-surface-container-lowest font-mono pr-10 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={
                showPassword
                  ? t('signup.hidePassword', {}, { defaultValue: 'Hide password' })
                  : t('signup.showPassword', {}, { defaultValue: 'Show password' })
              }
              className={cm.cn(
                'absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface',
              )}
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>

        {error && (
          <div
            data-mol-id="signup-error"
            role="alert"
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'rounded-md bg-error-container/30 text-error border border-error/30',
            )}
          >
            {error.message}
          </div>
        )}

        <button
          type="submit"
          disabled={isSigningUp}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            cm.sp('mt', 2),
            'rounded-md text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60',
          )}
          style={{ background: 'var(--color-primary)' }}
        >
          <span>
            {isSigningUp
              ? t('common.creatingAccountEllipsis', {}, { defaultValue: 'Creating account…' })
              : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
          </span>
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
            arrow_forward
          </span>
        </button>
      </form>

      <OAuthButtons />
    </AuthShell>
  )
}

export default Signup
export { Signup as SignupPage }
