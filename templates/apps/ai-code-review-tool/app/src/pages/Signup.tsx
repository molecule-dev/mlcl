// Refract signup — POLISHED-PATTERN-CATALOG §13 (auth).
// Pattern source: api-documentation Signup, recoloured to Refract palette.
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ACCENT_COLOR, BRAND_COLOR } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { OAuthButtons } from '../components/OAuthButtons.js'

const submitGradient = `linear-gradient(135deg, ${BRAND_COLOR}, ${ACCENT_COLOR})`

const gridBackground = {
  backgroundImage:
    'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
  backgroundSize: '32px 32px',
}

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
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // Error tracked in hook state; the useSignup hook surfaces it via `error`
    }
  }

  const inputBase = cm.cn(
    cm.w('full'),
    cm.sp('py', 4),
    cm.sp('px', 5),
    cm.textSize('sm'),
    'rounded-lg transition-all font-mono',
  )
  const inputStyle = {
    backgroundColor: 'var(--color-auth-input)',
    border: '1px solid var(--color-auth-border)',
    color: 'var(--color-auth-text)',
  }
  const labelClass = cm.cn(
    cm.fontWeight('semibold'),
    cm.sp('mb', 2),
    'block text-[0.6875rem] tracking-[0.05em] font-mono uppercase',
  )

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'relative font-body overflow-hidden',
      )}
      style={{ backgroundColor: 'var(--color-auth-dark)', color: 'var(--color-auth-text)' }}
    >
      <div className="absolute inset-0 -z-10 pointer-events-none" style={gridBackground} />
      <div
        className={cm.cn(
          'absolute top-1/3 left-1/2 -translate-x-1/2 -z-10 w-[60rem] h-[60rem] rounded-full pointer-events-none',
        )}
        style={{ background: BRAND_COLOR, filter: 'blur(140px)', opacity: 0.16 }}
      />

      <main
        className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.flex1, cm.sp('p', 6))}
      >
        <div className={cm.cn(cm.w('full'), cm.maxW('md'))}>
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'xl' }),
              cm.sp('p', 10),
              'rounded-xl',
            )}
            style={{
              backgroundColor: 'var(--color-auth-panel)',
              border: '1px solid var(--color-auth-border)',
              boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.6)',
            }}
          >
            <AuthBrandHeader
              subtitle={t('signup.subtitle', {}, { defaultValue: 'Create your review workspace' })}
            />

            <form className={cm.cn(cm.flex({ direction: 'col' }), 'gap-5')} onSubmit={handleSubmit}>
              <div>
                <label
                  className={labelClass}
                  style={{ color: 'var(--color-auth-muted)' }}
                  htmlFor="name"
                >
                  {t('signup.nameLabel', {}, { defaultValue: 'NAME' })}
                </label>
                <input
                  className={inputBase}
                  style={inputStyle}
                  id="name"
                  type="text"
                  autoComplete="name"
                  placeholder={t('signup.handleHint', {}, { defaultValue: 'Your handle' })}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <label
                  className={labelClass}
                  style={{ color: 'var(--color-auth-muted)' }}
                  htmlFor="email"
                >
                  {t('signup.emailLabel', {}, { defaultValue: 'EMAIL' })}
                </label>
                <input
                  className={inputBase}
                  style={inputStyle}
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder={t(
                    'signup.emailPlaceholder',
                    {},
                    { defaultValue: 'developer@example.com' },
                  )}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label
                  className={labelClass}
                  style={{ color: 'var(--color-auth-muted)' }}
                  htmlFor="password"
                >
                  {t('signup.passwordLabel', {}, { defaultValue: 'PASSWORD' })}
                </label>
                <div className="relative">
                  <input
                    className={cm.cn(inputBase, 'pr-12')}
                    style={inputStyle}
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
                    className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: 'var(--color-auth-muted)' }}
                  >
                    <span className="material-symbols-outlined">
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
                    'rounded-lg',
                  )}
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--color-error) 15%, transparent)',
                    color: 'var(--color-on-error-container)',
                    border: '1px solid color-mix(in srgb, var(--color-error) 40%, transparent)',
                  }}
                >
                  {error.message}
                </div>
              )}

              <button
                type="submit"
                disabled={isSigningUp}
                data-mol-id="signup-submit"
                className={cm.cn(
                  cm.sp('py', 4),
                  cm.sp('mt', 2),
                  cm.textSize('base'),
                  cm.fontWeight('bold'),
                  'rounded-lg text-white hover:shadow-lg active:scale-95 transition-all disabled:opacity-60',
                )}
                style={{ background: submitGradient }}
              >
                {isSigningUp
                  ? t('common.creatingAccountEllipsis', {}, { defaultValue: 'Creating account…' })
                  : t('signup.submit', {}, { defaultValue: 'Create Account' })}
              </button>
            </form>

            <OAuthButtons />
          </div>

          <footer className={cm.cn(cm.sp('mt', 8), cm.textCenter)}>
            <p
              className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}
              style={{ color: 'var(--color-auth-muted)' }}
            >
              {t('auth.login.alreadyHaveAccount', {}, { defaultValue: 'Already have an account?' })}{' '}
              <Link
                to="/login"
                className={cm.cn('font-bold hover:underline decoration-2 underline-offset-4 ml-1')}
                style={{ color: 'var(--color-auth-link)' }}
              >
                {t('signup.signIn', {}, { defaultValue: 'Sign In' })}
              </Link>
            </p>
          </footer>
        </div>
      </main>
    </div>
  )
}

export default Signup
export { Signup as SignupPage }
