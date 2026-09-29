import { useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthShell } from '../components/AuthShell.js'
import { OAuthButtons } from '../components/OAuthButtons.js'

/**
 * Returns a same-origin path safe to navigate to after login. Strips
 * any external URLs to defeat open-redirect attacks.
 */
function safeRedirect(target: string | null): string | null {
  if (!target) return null
  if (!target.startsWith('/') || target.startsWith('//')) return null
  return target
}

export function Login() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const queryRedirect = safeRedirect(searchParams.get('redirect'))
  const from =
    queryRedirect ||
    (location.state as { from?: { pathname: string } })?.from?.pathname ||
    '/dashboard'
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
  const [showPassword, setShowPassword] = useState(false)
  // Guest invitation lookup (the design's "Lookup Your Wedding Invitation"
  // card): a code typed here jumps straight to the public RSVP page.
  const [inviteCode, setInviteCode] = useState('')

  const isLoggingIn = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login({ email, password })
      clearAuthForm()
      navigate(from, { replace: true })
    } catch (_error) {
      // tracked in hook state
    }
  }

  function goToInvitation(e: React.FormEvent) {
    e.preventDefault()
    const code = inviteCode.trim().toUpperCase()
    if (code) navigate(`/rsvp/${encodeURIComponent(code)}`)
  }

  return (
    <AuthShell
      eyebrow={t('auth.login.signInTitle', {}, { defaultValue: 'Welcome back' })}
      heading={t('login.heading', {}, { defaultValue: 'Welcome back to your celebration' })}
      subtext={t(
        'login.subtext',
        {},
        {
          defaultValue:
            'Pick up where you left off — guests, RSVPs, budget, and the seating chart are waiting.',
        },
      )}
      bottomLinkText={t(
        'login.noAccount',
        { appName: APP_NAME },
        { defaultValue: 'New to {{appName}}?' },
      )}
      bottomLinkLabel={t('auth.signup.createAnAccount', {}, { defaultValue: 'Create an account' })}
      bottomLinkTo="/signup"
    >
      <form onSubmit={handleSubmit} className={cm.stack(4)}>
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
          <div className={cm.flex({ align: 'center', justify: 'between' })}>
            <span
              className={cm.cn(
                'text-xs font-bold uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('auth.login.password', {}, { defaultValue: 'Password' })}
            </span>
            <Link
              to="/forgot-password"
              className={cm.cn('text-xs font-bold text-primary hover:underline')}
            >
              {t('auth.login.forgotShort', {}, { defaultValue: 'Forgot?' })}
            </Link>
          </div>
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
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
              className={cm.cn(
                'w-0 min-w-0 flex-1 bg-transparent border-none focus:outline-none text-sm font-medium text-on-surface placeholder:text-on-surface-variant',
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={
                showPassword
                  ? t('login.hidePassword', {}, { defaultValue: 'Hide password' })
                  : t('login.showPassword', {}, { defaultValue: 'Show password' })
              }
              className={cm.cn('text-on-surface-variant hover:text-on-surface')}
            >
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </label>

        {error ? (
          <div
            role="alert"
            data-mol-id="login-error"
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
          disabled={isLoggingIn}
          className={cm.cn(
            cm.sp('py', 3),
            cm.sp('mt', 2),
            'rounded-full text-base font-extrabold text-white shadow-md shadow-primary/30 hover:shadow-lg active:scale-95 transition-all disabled:opacity-60',
          )}
          style={{
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
          }}
        >
          {isLoggingIn
            ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
            : t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
        </button>
      </form>

      <OAuthButtons />

      {/* Guest invitation lookup — you may be a guest, not the couple */}
      <section
        className={cm.cn(
          cm.sp('p', 5),
          'rounded-2xl bg-surface-container-low border border-outline-variant/40',
        )}
        data-mol-id="login-invitation-lookup"
      >
        <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'), 'mb-1')}>
          {t('login.invitation.heading', {}, { defaultValue: 'Lookup Your Wedding Invitation' })}
        </h3>
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant mb-3')}>
          {t(
            'login.invitation.body',
            {},
            {
              defaultValue:
                'Enter the 6-character code found on your paper invitation envelope or wedding card.',
            },
          )}
        </p>
        <form onSubmit={goToInvitation} className={cm.flex({ align: 'center', gap: 'sm' })}>
          <input
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder={t('login.invitation.placeholder', {}, { defaultValue: 'WEDD1NG202' })}
            aria-label={t('login.invitation.aria', {}, { defaultValue: 'Invitation RSVP code' })}
            data-mol-id="login-invitation-code"
            className={cm.cn(
              'min-w-0 flex-1 px-3 py-2.5 rounded-lg bg-surface border border-outline-variant/60',
              'focus:outline-none focus:border-primary font-mono uppercase tracking-widest text-sm',
            )}
          />
          <button
            type="submit"
            data-mol-id="login-invitation-submit"
            className={cm.cn(
              'px-4 py-2.5 rounded-lg text-sm font-bold border border-outline-variant/60',
              'hover:border-primary hover:text-primary transition-colors whitespace-nowrap',
            )}
          >
            {t('login.invitation.submit', {}, { defaultValue: 'Enter Code' })}
            <span
              className="material-symbols-outlined text-sm align-middle ml-1"
              aria-hidden="true"
            >
              arrow_forward
            </span>
          </button>
        </form>
      </section>
    </AuthShell>
  )
}

export default Login
