import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BRAND_COLOR } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { LoginFooter } from '../components/LoginFooter.js'
import { OAuthButtons } from '../components/OAuthButtons.js'

const submitGradient = `linear-gradient(135deg, var(--color-primary), var(--mol-color-success))`

const gridBackground = {
  backgroundImage:
    'linear-gradient(color-mix(in srgb, var(--mol-color-text) 3%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--mol-color-text) 3%, transparent) 1px, transparent 1px)',
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
      navigate('/docs', { replace: true })
    } catch (_error) {
      // Error tracked in hook state; UI renders error from useSignup()
    }
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'relative font-body overflow-hidden',
      )}
      style={{ backgroundColor: 'var(--mol-color-background)', color: 'var(--mol-color-text)' }}
    >
      <div className="absolute inset-0 -z-10 pointer-events-none" style={gridBackground} />
      <div
        className={cm.cn(
          'absolute top-1/3 left-1/2 -translate-x-1/2 -z-10 w-[60rem] h-[60rem] rounded-full pointer-events-none',
        )}
        style={{ background: BRAND_COLOR, filter: 'blur(120px)', opacity: 0.12 }}
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
              backgroundColor: 'var(--mol-color-surface)',
              border: '1px solid var(--mol-color-border)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <AuthBrandHeader
              subtitle={t('signup.subtitle', {}, { defaultValue: 'Create your API workspace' })}
            />

            <form className={cm.cn(cm.flex({ direction: 'col' }), 'gap-5')} onSubmit={handleSubmit}>
              <div>
                <label
                  className={cm.cn(
                    cm.fontWeight('semibold'),
                    cm.sp('mb', 2),
                    'block text-[0.6875rem] tracking-[0.05em] font-label',
                  )}
                  style={{ color: 'var(--mol-color-text-tertiary)' }}
                  htmlFor="name"
                >
                  {t('signup.nameLabel', {}, { defaultValue: 'NAME' })}
                </label>
                <input
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('py', 4),
                    cm.sp('px', 5),
                    cm.textSize('sm'),
                    'rounded-lg transition-all',
                  )}
                  style={{
                    backgroundColor: 'var(--mol-color-background)',
                    border: '1px solid var(--mol-color-border)',
                    color: 'var(--mol-color-text)',
                  }}
                  id="name"
                  type="text"
                  autoComplete="name"
                  placeholder={t(
                    'signup.fullNameHint',
                    {},
                    { defaultValue: 'How should we address you?' },
                  )}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <label
                  className={cm.cn(
                    cm.fontWeight('semibold'),
                    cm.sp('mb', 2),
                    'block text-[0.6875rem] tracking-[0.05em] font-label',
                  )}
                  style={{ color: 'var(--mol-color-text-tertiary)' }}
                  htmlFor="email"
                >
                  {t('signup.emailLabel', {}, { defaultValue: 'EMAIL' })}
                </label>
                <input
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('py', 4),
                    cm.sp('px', 5),
                    cm.textSize('sm'),
                    'rounded-lg transition-all',
                  )}
                  style={{
                    backgroundColor: 'var(--mol-color-background)',
                    border: '1px solid var(--mol-color-border)',
                    color: 'var(--mol-color-text)',
                  }}
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
                  className={cm.cn(
                    cm.fontWeight('semibold'),
                    cm.sp('mb', 2),
                    'block text-[0.6875rem] tracking-[0.05em] font-label',
                  )}
                  style={{ color: 'var(--mol-color-text-tertiary)' }}
                  htmlFor="password"
                >
                  {t('signup.passwordLabel', {}, { defaultValue: 'PASSWORD' })}
                </label>
                <div className="relative">
                  <input
                    className={cm.cn(
                      cm.w('full'),
                      cm.sp('py', 4),
                      cm.sp('px', 5),
                      cm.textSize('sm'),
                      'rounded-lg transition-all pr-12',
                    )}
                    style={{
                      backgroundColor: 'var(--mol-color-background)',
                      border: '1px solid var(--mol-color-border)',
                      color: 'var(--mol-color-text)',
                    }}
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
                    style={{ color: 'var(--mol-color-text-tertiary)' }}
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
                    backgroundColor: 'color-mix(in srgb, var(--mol-color-error) 15%, transparent)',
                    color: 'var(--mol-color-error)',
                    border: '1px solid color-mix(in srgb, var(--mol-color-error) 40%, transparent)',
                  }}
                >
                  {error.message}
                </div>
              )}

              <button
                type="submit"
                disabled={isSigningUp}
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
              style={{ color: 'var(--mol-color-text-tertiary)' }}
            >
              {t('auth.login.alreadyHaveAccount', {}, { defaultValue: 'Already have an account?' })}{' '}
              <Link
                to="/login"
                className={cm.cn('font-bold hover:underline decoration-2 underline-offset-4 ml-1')}
                style={{ color: 'var(--color-brand-text)' }}
              >
                {t('signup.signIn', {}, { defaultValue: 'Sign In' })}
              </Link>
            </p>
          </footer>
        </div>
      </main>
      <LoginFooter />
    </div>
  )
}
