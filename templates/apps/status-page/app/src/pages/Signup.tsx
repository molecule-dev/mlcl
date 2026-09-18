import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE, BRAND_COLOR } from '../branding.js'
import { OAuthButtons } from '../components/OAuthButtons.js'

export function Signup() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { status, error, signup } = useSignup()
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
  const company = authFormFields.company ?? ''
  const setCompany = (value: string): void => setAuthFormField('company', value)
  const firstName = authFormFields.firstName ?? ''
  const setFirstName = (value: string): void => setAuthFormField('firstName', value)
  const lastName = authFormFields.lastName ?? ''
  const setLastName = (value: string): void => setAuthFormField('lastName', value)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const isSubmitting = status === 'pending'
  const passwordsMatch = !confirm || confirm === password

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordsMatch) return
    try {
      await signup({ email, password, firstName, lastName, company } as Parameters<
        typeof signup
      >[0])
      clearAuthForm()
      navigate('/dashboard')
    } catch (_error) {
      // signup rejection is surfaced via the hook's error state
    }
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'relative font-body overflow-hidden',
      )}
      style={{ backgroundColor: 'var(--color-auth-bg)', color: 'var(--mol-color-text)' }}
      data-mol-id="page-signup"
    >
      <div
        className={cm.cn('absolute inset-0 -z-10 pointer-events-none')}
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
        aria-hidden="true"
      />
      <div
        className={cm.cn(
          'absolute top-1/4 left-1/2 -translate-x-1/2 -z-10 w-[60rem] h-[60rem] rounded-full pointer-events-none',
        )}
        style={{ background: BRAND_COLOR, filter: 'blur(140px)', opacity: 0.1 }}
        aria-hidden="true"
      />

      <main
        className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.flex1, cm.sp('p', 6))}
      >
        <div className={cm.cn(cm.w('full'), 'max-w-[440px]')}>
          <header className={cm.cn('text-center mb-6')}>
            <div className={cm.cn('mb-4')}>
              <div
                className={cm.cn('inline-flex items-center gap-2 px-3 py-1 rounded-full')}
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.10)',
                  border: '1px solid rgba(16, 185, 129, 0.30)',
                }}
              >
                <span
                  className={cm.cn('h-1.5 w-1.5 rounded-full animate-pulse')}
                  style={{ backgroundColor: BRAND_COLOR }}
                  aria-hidden="true"
                />
                <span
                  className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest')}
                  style={{ color: BRAND_COLOR }}
                >
                  {t('signup.eyebrow', {}, { defaultValue: 'access · invite-only beta' })}
                </span>
              </div>
            </div>
            <h1 className={cm.cn('text-3xl font-extrabold tracking-tight')}>
              {t('signup.title', { app: APP_NAME }, { defaultValue: 'Request access to {{app}}' })}
            </h1>
            <p className={cm.cn('mt-1 font-mono text-xs text-on-surface-variant')}>{APP_TAGLINE}</p>
          </header>

          <div
            className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }), cm.sp('p', 8), 'rounded-xl')}
            style={{
              backgroundColor: 'var(--color-auth-panel)',
              border: '1px solid var(--color-auth-border)',
              boxShadow: '0 30px 80px -30px rgba(0, 0, 0, 0.7)',
            }}
          >
            <form className={cm.cn(cm.flex({ direction: 'col' }), 'gap-5')} onSubmit={handleSubmit}>
              <div className={cm.cn('grid grid-cols-2 gap-3')}>
                <div>
                  <label
                    className={cm.cn(
                      'block text-[10px] font-black uppercase tracking-widest mb-2 font-mono',
                    )}
                    style={{ color: 'var(--color-text-muted)' }}
                    htmlFor="first-name"
                  >
                    {t('form.firstName', {}, { defaultValue: 'First name' })}
                  </label>
                  <input
                    id="first-name"
                    autoComplete="given-name"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={cm.cn(
                      cm.w('full'),
                      cm.sp('py', 3),
                      cm.sp('px', 4),
                      cm.textSize('sm'),
                      'rounded-md font-mono',
                    )}
                    style={{
                      backgroundColor: 'var(--color-auth-input-bg)',
                      border: '1px solid var(--color-auth-border)',
                      color: 'var(--mol-color-text)',
                    }}
                  />
                </div>
                <div>
                  <label
                    className={cm.cn(
                      'block text-[10px] font-black uppercase tracking-widest mb-2 font-mono',
                    )}
                    style={{ color: 'var(--color-text-muted)' }}
                    htmlFor="last-name"
                  >
                    {t('form.lastName', {}, { defaultValue: 'Last name' })}
                  </label>
                  <input
                    id="last-name"
                    autoComplete="family-name"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className={cm.cn(
                      cm.w('full'),
                      cm.sp('py', 3),
                      cm.sp('px', 4),
                      cm.textSize('sm'),
                      'rounded-md font-mono',
                    )}
                    style={{
                      backgroundColor: 'var(--color-auth-input-bg)',
                      border: '1px solid var(--color-auth-border)',
                      color: 'var(--mol-color-text)',
                    }}
                  />
                </div>
              </div>

              <div>
                <label
                  className={cm.cn(
                    'block text-[10px] font-black uppercase tracking-widest mb-2 font-mono',
                  )}
                  style={{ color: 'var(--color-text-muted)' }}
                  htmlFor="company"
                >
                  {t('signup.company', {}, { defaultValue: 'Company / workspace' })}
                </label>
                <input
                  id="company"
                  required
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('py', 3),
                    cm.sp('px', 4),
                    cm.textSize('sm'),
                    'rounded-md font-mono',
                  )}
                  style={{
                    backgroundColor: 'var(--color-auth-input-bg)',
                    border: '1px solid var(--color-auth-border)',
                    color: 'var(--mol-color-text)',
                  }}
                />
              </div>

              <div>
                <label
                  className={cm.cn(
                    'block text-[10px] font-black uppercase tracking-widest mb-2 font-mono',
                  )}
                  style={{ color: 'var(--color-text-muted)' }}
                  htmlFor="signup-email"
                >
                  {t('auth.workEmail', {}, { defaultValue: 'Work email' })}
                </label>
                <input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('py', 3),
                    cm.sp('px', 4),
                    cm.textSize('sm'),
                    'rounded-md font-mono',
                  )}
                  style={{
                    backgroundColor: 'var(--color-auth-input-bg)',
                    border: '1px solid var(--color-auth-border)',
                    color: 'var(--mol-color-text)',
                  }}
                />
              </div>

              <div>
                <label
                  className={cm.cn(
                    'block text-[10px] font-black uppercase tracking-widest mb-2 font-mono',
                  )}
                  style={{ color: 'var(--color-text-muted)' }}
                  htmlFor="signup-password"
                >
                  {t('auth.login.password', {}, { defaultValue: 'Password' })}
                </label>
                <div className={cm.cn('relative')}>
                  <input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={cm.cn(
                      cm.w('full'),
                      cm.sp('py', 3),
                      cm.sp('px', 4),
                      cm.textSize('sm'),
                      'rounded-md font-mono pr-12',
                    )}
                    style={{
                      backgroundColor: 'var(--color-auth-input-bg)',
                      border: '1px solid var(--color-auth-border)',
                      color: 'var(--mol-color-text)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className={cm.cn(
                      'absolute right-3 top-1/2 -translate-y-1/2 transition-colors hover:opacity-80',
                    )}
                    style={{ color: 'var(--color-text-muted)' }}
                    aria-label={
                      showPassword
                        ? t('signup.hidePassword', {}, { defaultValue: 'Hide password' })
                        : t('signup.showPassword', {}, { defaultValue: 'Show password' })
                    }
                  >
                    <span className={cm.cn('material-symbols-outlined text-base')}>
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label
                  className={cm.cn(
                    'block text-[10px] font-black uppercase tracking-widest mb-2 font-mono',
                  )}
                  style={{ color: 'var(--color-text-muted)' }}
                  htmlFor="signup-confirm"
                >
                  {t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
                </label>
                <input
                  id="signup-confirm"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('py', 3),
                    cm.sp('px', 4),
                    cm.textSize('sm'),
                    'rounded-md font-mono',
                  )}
                  style={{
                    backgroundColor: 'var(--color-auth-input-bg)',
                    border: `1px solid ${passwordsMatch ? 'var(--color-auth-border)' : 'rgba(239, 68, 68, 0.5)'}`,
                    color: 'var(--mol-color-text)',
                  }}
                />
                {!passwordsMatch ? (
                  <p
                    className={cm.cn('mt-1 font-mono text-[10px]')}
                    style={{ color: 'var(--color-auth-error-text)' }}
                  >
                    {t(
                      'auth.signup.passwordsDoNotMatchNoPeriod',
                      {},
                      { defaultValue: 'Passwords do not match' },
                    )}
                  </p>
                ) : null}
              </div>

              {error && (
                <div
                  role="alert"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.textSize('sm'),
                    'rounded-md text-center',
                  )}
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.10)',
                    border: '1px solid rgba(239, 68, 68, 0.40)',
                    color: 'var(--color-auth-error-text)',
                  }}
                >
                  {error.message}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !passwordsMatch}
                className={cm.cn(
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  'rounded-md font-mono font-bold transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-60',
                )}
                style={{
                  backgroundColor: BRAND_COLOR,
                  color: 'var(--color-auth-on-primary)',
                  boxShadow: '0 12px 28px -12px rgba(16, 185, 129, 0.6)',
                }}
              >
                {isSubmitting
                  ? t('signup.submitting', {}, { defaultValue: 'Requesting access…' })
                  : t('signup.submit', {}, { defaultValue: 'Request access' })}
              </button>
            </form>

            <OAuthButtons />
          </div>

          <footer
            className={cm.cn('mt-6 text-center text-sm')}
            style={{ color: 'var(--color-text-muted)' }}
          >
            <p>
              {t('auth.login.alreadyHaveAccount', {}, { defaultValue: 'Already have an account?' })}{' '}
              <Link
                to="/login"
                className={cm.cn('font-bold hover:underline ml-1')}
                style={{ color: BRAND_COLOR }}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
            </p>
          </footer>
        </div>
      </main>
    </div>
  )
}
