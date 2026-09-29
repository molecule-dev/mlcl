import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthShell } from '../components/AuthShell.js'
import { OAuthButtons } from '../components/OAuthButtons.js'

/**
 * Returns a same-origin path safe to navigate to after signup. Strips
 * any external URLs to defeat open-redirect attacks.
 */
function safeRedirect(target: string | null): string {
  if (!target) return '/dashboard'
  if (!target.startsWith('/') || target.startsWith('//')) return '/dashboard'
  return target
}

export function Signup() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
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
  const [showPassword, setShowPassword] = useState(false)

  const isSigningUp = status === 'pending'
  const mismatch = confirm.length > 0 && confirm !== password
  const redirectTo = safeRedirect(searchParams.get('redirect'))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (mismatch) return
    try {
      await signup({ email, password, name: name || undefined })
      clearAuthForm()
      navigate(redirectTo, { replace: true })
    } catch (_error) {
      // tracked in hook state
    }
  }

  return (
    <AuthShell
      eyebrow={t('signup.eyebrow', {}, { defaultValue: 'Become a member' })}
      heading={t('signup.heading', {}, { defaultValue: 'Begin your celebration with calm.' })}
      subtext={t(
        'signup.subtext',
        {},
        {
          defaultValue:
            'Start your planner free — guest list, RSVP code, budget, vendors, tasks, and seating.',
        },
      )}
      bottomLinkText={t(
        'auth.login.alreadyHaveAccount',
        {},
        { defaultValue: 'Already have an account?' },
      )}
      bottomLinkLabel={t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
      bottomLinkTo="/login"
    >
      <form onSubmit={handleSubmit} className={cm.stack(4)}>
        <label className={cm.stack(2)}>
          <span
            className={cm.cn('text-xs font-bold uppercase tracking-widest text-on-surface-variant')}
          >
            {t('form.displayName', {}, { defaultValue: 'Display name' })}
          </span>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 4),
              cm.sp('py', 3),
              'rounded-lg bg-surface-container-low border border-outline-variant focus-within:border-primary',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-on-surface-variant')}
              aria-hidden="true"
            >
              person
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('signup.namePlaceholder', {}, { defaultValue: 'Alex Rivera' })}
              className={cm.cn(
                'w-0 min-w-0 flex-1 bg-transparent border-none focus:outline-none text-sm font-medium text-on-surface placeholder:text-on-surface-variant',
              )}
            />
          </div>
        </label>
        <label className={cm.stack(2)}>
          <span
            className={cm.cn('text-xs font-bold uppercase tracking-widest text-on-surface-variant')}
          >
            {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          </span>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 4),
              cm.sp('py', 3),
              'rounded-lg bg-surface-container-low border border-outline-variant focus-within:border-primary',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-on-surface-variant')}
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
              placeholder={t(
                'auth.passwordPlaceholderEmail',
                {},
                { defaultValue: 'you@example.com' },
              )}
              className={cm.cn(
                'w-0 min-w-0 flex-1 bg-transparent border-none focus:outline-none text-sm font-medium text-on-surface placeholder:text-on-surface-variant',
              )}
            />
          </div>
        </label>
        <label className={cm.stack(2)}>
          <span
            className={cm.cn('text-xs font-bold uppercase tracking-widest text-on-surface-variant')}
          >
            {t('auth.login.password', {}, { defaultValue: 'Password' })}
          </span>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 4),
              cm.sp('py', 3),
              'rounded-lg bg-surface-container-low border border-outline-variant focus-within:border-primary',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-on-surface-variant')}
              aria-hidden="true"
            >
              lock
            </span>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t(
                'common.atLeast8Characters',
                {},
                { defaultValue: 'At least 8 characters' },
              )}
              className={cm.cn(
                'w-0 min-w-0 flex-1 bg-transparent border-none focus:outline-none text-sm font-medium text-on-surface placeholder:text-on-surface-variant',
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
              className={cm.cn('text-on-surface-variant hover:text-on-surface')}
            >
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </label>
        <label className={cm.stack(2)}>
          <span
            className={cm.cn('text-xs font-bold uppercase tracking-widest text-on-surface-variant')}
          >
            {t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
          </span>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 4),
              cm.sp('py', 3),
              'rounded-lg bg-surface-container-low border',
              mismatch ? 'border-error' : 'border-outline-variant focus-within:border-primary',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-on-surface-variant')}
              aria-hidden="true"
            >
              lock_reset
            </span>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={t(
                'signup.confirmPlaceholder',
                {},
                { defaultValue: 'Re-enter password' },
              )}
              className={cm.cn(
                'w-0 min-w-0 flex-1 bg-transparent border-none focus:outline-none text-sm font-medium text-on-surface placeholder:text-on-surface-variant',
              )}
            />
          </div>
          {mismatch ? (
            <span className={cm.cn(cm.textSize('xs'), 'text-error font-semibold')}>
              {t('signup.mismatch', {}, { defaultValue: 'Passwords don’t match.' })}
            </span>
          ) : null}
        </label>

        {error ? (
          <div
            role="alert"
            data-mol-id="signup-error"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              'text-sm text-center rounded-lg',
              'bg-error-container text-on-error-container',
            )}
          >
            {error.message}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSigningUp || mismatch}
          className={cm.cn(
            cm.sp('py', 3),
            cm.sp('mt', 2),
            'rounded-full text-base font-extrabold text-white shadow-md shadow-primary/30 hover:shadow-lg active:scale-95 transition-all disabled:opacity-60',
          )}
          style={{
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
          }}
        >
          {isSigningUp
            ? t('common.creatingAccountEllipsis', {}, { defaultValue: 'Creating account…' })
            : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
        </button>
      </form>

      <OAuthButtons />
    </AuthShell>
  )
}

export default Signup
