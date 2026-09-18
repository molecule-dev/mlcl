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
  const [showPassword, setShowPassword] = useState(false)

  const isSubmitting = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await signup({ email, password, name: name || undefined })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // Error tracked in hook state
    }
  }

  return (
    <AuthShell
      altLink={
        <span>
          {t('auth.login.alreadyHaveAccount', {}, { defaultValue: 'Already have an account?' })}{' '}
          <Link
            to="/login"
            className={cm.cn(
              cm.sp('ml', 1),
              cm.fontWeight('bold'),
              'text-primary hover:underline decoration-2 underline-offset-4',
            )}
          >
            {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </Link>
        </span>
      }
    >
      <div className={cm.textCenter}>
        <h2
          className={cm.cn(
            cm.textSize('2xl'),
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'text-on-surface',
          )}
        >
          {t('auth.signup.createYourAccount', {}, { defaultValue: 'Create your account' })}
        </h2>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('signup.subtitle', {}, { defaultValue: 'Launch what matters in under a minute.' })}
        </p>
      </div>

      <form className={cm.cn(cm.flex({ direction: 'col' }), 'gap-5')} onSubmit={handleSubmit}>
        <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
          <label
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
            htmlFor="name"
          >
            {t('form.name', {}, { defaultValue: 'Name' })}
          </label>
          <div
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.sp('px', 4),
              'bg-surface-container-low rounded-lg py-3 border border-outline-variant focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all',
            )}
          >
            <span
              className={cm.cn(
                cm.sp('mr', 3),
                cm.textSize('xl'),
                'material-symbols-outlined text-outline',
              )}
              aria-hidden="true"
            >
              person
            </span>
            <input
              className={cm.cn(
                cm.w('full'),
                cm.fontWeight('medium'),
                'bg-transparent border-none outline-none text-on-surface placeholder:text-on-surface-variant/50',
              )}
              id="name"
              type="text"
              autoComplete="name"
              placeholder={t('auth.signup.name', {}, { defaultValue: 'Your name' })}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>

        <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
          <label
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
            htmlFor="email"
          >
            {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          </label>
          <div
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.sp('px', 4),
              'bg-surface-container-low rounded-lg py-3 border border-outline-variant focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all',
            )}
          >
            <span
              className={cm.cn(
                cm.sp('mr', 3),
                cm.textSize('xl'),
                'material-symbols-outlined text-outline',
              )}
              aria-hidden="true"
            >
              mail
            </span>
            <input
              className={cm.cn(
                cm.w('full'),
                cm.fontWeight('medium'),
                'bg-transparent border-none outline-none text-on-surface placeholder:text-on-surface-variant/50',
              )}
              id="email"
              type="email"
              autoComplete="email"
              required
              placeholder={t(
                'auth.passwordPlaceholderEmail',
                {},
                { defaultValue: 'you@example.com' },
              )}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
          <label
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
            htmlFor="password"
          >
            {t('auth.login.password', {}, { defaultValue: 'Password' })}
          </label>
          <div
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.sp('px', 4),
              'bg-surface-container-low rounded-lg py-3 border border-outline-variant focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all',
            )}
          >
            <span
              className={cm.cn(
                cm.sp('mr', 3),
                cm.textSize('xl'),
                'material-symbols-outlined text-outline',
              )}
              aria-hidden="true"
            >
              lock
            </span>
            <input
              className={cm.cn(
                cm.w('full'),
                cm.fontWeight('medium'),
                'bg-transparent border-none outline-none text-on-surface placeholder:text-on-surface-variant/50',
              )}
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              minLength={8}
              required
              placeholder={t(
                'common.atLeast8Characters',
                {},
                { defaultValue: 'At least 8 characters' },
              )}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={
                showPassword
                  ? t('signup.hidePassword', {}, { defaultValue: 'Hide password' })
                  : t('signup.showPassword', {}, { defaultValue: 'Show password' })
              }
              className={cm.cn(cm.sp('ml', 2), 'text-outline hover:text-primary transition-colors')}
            >
              <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>
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
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.textCenter,
              'bg-error-container text-on-error-container rounded-lg',
            )}
          >
            {error.message}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className={cm.cn(
            cm.sp('py', 4),
            cm.textSize('base'),
            cm.fontWeight('bold'),
            cm.sp('mt', 2),
            'rounded-lg text-white shadow-md hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-60',
          )}
          style={{
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
          }}
        >
          {isSubmitting
            ? t('common.creatingAccountEllipsis', {}, { defaultValue: 'Creating account…' })
            : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
        </button>
      </form>

      <OAuthButtons />
    </AuthShell>
  )
}
