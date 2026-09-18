import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useHttpClient, useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BRAND_ACCENT_COLOR, BRAND_COLOR, BRAND_LINK_COLOR } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'
import { OAuthButtons } from '../components/OAuthButtons.js'

const SUBMIT_GRADIENT = `linear-gradient(135deg, ${BRAND_COLOR}, ${BRAND_ACCENT_COLOR})`

export function Signup() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
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
  const handleName = authFormFields.handleName ?? ''
  const setHandleName = (value: string): void => setAuthFormField('handleName', value)
  const firstName = authFormFields.firstName ?? ''
  const setFirstName = (value: string): void => setAuthFormField('firstName', value)
  const lastName = authFormFields.lastName ?? ''
  const setLastName = (value: string): void => setAuthFormField('lastName', value)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [mismatch, setMismatch] = useState(false)

  const isSigningUp = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setMismatch(true)
      return
    }
    setMismatch(false)
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim()
    try {
      await signup({ email, password, name: fullName || handleName || undefined })
      clearAuthForm()
      const handle = handleName.trim()
      if (handle) {
        try {
          await http.put('/api/preferences', { data: { handle } })
        } catch (_error) {
          // Non-fatal — user can set their handle later in Settings.
        }
      }
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // Error tracked in hook state — the hook surfaces it via its own error field.
    }
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'relative bg-surface-container-low font-body text-on-surface overflow-hidden',
      )}
    >
      <div
        className={cm.cn(
          'fixed top-0 right-0 -z-10 w-1/3 h-1/3 rounded-full blur-[120px] translate-x-1/3 -translate-y-1/3 pointer-events-none',
        )}
        style={{ background: `${BRAND_COLOR}33` }}
        aria-hidden="true"
      />
      <div
        className={cm.cn(
          'fixed bottom-0 left-0 -z-10 w-1/4 h-1/4 rounded-full blur-[100px] -translate-x-1/3 translate-y-1/3 pointer-events-none',
        )}
        style={{ background: `${BRAND_ACCENT_COLOR}26` }}
        aria-hidden="true"
      />

      <main
        className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.flex1, cm.sp('p', 6))}
      >
        <div className={cm.cn(cm.w('full'), cm.maxW('md'))}>
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'xl' }),
              cm.sp('p', 10),
              'bg-surface-container-lowest rounded-2xl shadow-2xl shadow-on-surface/10 border border-outline-variant/40',
            )}
          >
            <AuthBrandHeader />

            <form className={cm.cn(cm.flex({ direction: 'col' }), 'gap-5')} onSubmit={handleSubmit}>
              <div className={cm.cn('grid grid-cols-2 gap-3')}>
                <FieldInput
                  id="signup-first"
                  type="text"
                  label={t('form.firstName', {}, { defaultValue: 'First name' })}
                  icon="badge"
                  autoComplete="given-name"
                  required
                  value={firstName}
                  onChange={setFirstName}
                />
                <FieldInput
                  id="signup-last"
                  type="text"
                  label={t('form.lastName', {}, { defaultValue: 'Last name' })}
                  icon="badge"
                  autoComplete="family-name"
                  required
                  value={lastName}
                  onChange={setLastName}
                />
              </div>

              <FieldInput
                id="signup-handle"
                type="text"
                label={t('signup.handle', {}, { defaultValue: 'Producer handle' })}
                icon="alternate_email"
                placeholder={t('signup.handlePlaceholder', {}, { defaultValue: 'aria-vega' })}
                value={handleName}
                onChange={setHandleName}
              />

              <FieldInput
                id="signup-email"
                type="email"
                label={t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
                icon="mail"
                placeholder={t(
                  'signup.emailPlaceholder',
                  {},
                  { defaultValue: 'producer@fugue.studio' },
                )}
                autoComplete="email"
                required
                value={email}
                onChange={setEmail}
              />

              <div className={cm.cn('grid grid-cols-1 sm:grid-cols-2 gap-3')}>
                <FieldInput
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  label={t('auth.login.password', {}, { defaultValue: 'Password' })}
                  icon="lock"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={setPassword}
                  trailing={
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={
                        showPassword
                          ? t('signup.hidePassword', {}, { defaultValue: 'Hide password' })
                          : t('signup.showPassword', {}, { defaultValue: 'Show password' })
                      }
                      className={cm.cn('text-outline hover:text-primary transition-colors')}
                    >
                      <span className={cm.cn('text-xl material-symbols-outlined')}>
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  }
                />
                <FieldInput
                  id="signup-confirm"
                  type={showPassword ? 'text' : 'password'}
                  label={t('signup.confirmLabel', {}, { defaultValue: 'Confirm' })}
                  icon="lock_reset"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                />
              </div>

              {mismatch && (
                <p role="alert" className={cm.cn('text-xs font-semibold text-error')}>
                  {t(
                    'auth.signup.passwordsDontMatchPeriod',
                    {},
                    { defaultValue: "Passwords don't match." },
                  )}
                </p>
              )}

              {error && (
                <div
                  role="alert"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.textSize('sm'),
                    cm.textCenter,
                    'bg-error-container text-on-error-container rounded-xl',
                  )}
                >
                  {error.message}
                </div>
              )}

              <button
                type="submit"
                disabled={isSigningUp}
                className={cm.cn(
                  cm.sp('py', 4),
                  cm.roundedFull,
                  cm.textSize('lg'),
                  cm.sp('mt', 2),
                  cm.fontWeight('bold'),
                  'text-white hover:shadow-lg active:scale-95 transition-all disabled:opacity-60',
                )}
                style={{ background: SUBMIT_GRADIENT, boxShadow: `0 12px 32px ${BRAND_COLOR}40` }}
              >
                {isSigningUp
                  ? t('common.creatingAccountEllipsis', {}, { defaultValue: 'Creating account…' })
                  : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
              </button>
            </form>

            <OAuthButtons />
          </div>

          <footer className={cm.cn(cm.sp('mt', 8), cm.textCenter)}>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant',
              )}
            >
              {t('signup.haveAccount', {}, { defaultValue: 'Already jamming with us?' })}{' '}
              <Link
                to="/login"
                className={cm.cn('font-bold hover:underline decoration-2 underline-offset-4 ml-1')}
                style={{ color: BRAND_LINK_COLOR }}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
            </p>
          </footer>
        </div>
      </main>
      <Footer />
    </div>
  )
}

function FieldInput({
  id,
  type,
  label,
  icon,
  placeholder,
  autoComplete,
  required,
  value,
  onChange,
  trailing,
}: {
  id: string
  type: string
  label: string
  icon: string
  placeholder?: string
  autoComplete?: string
  required?: boolean
  value: string
  onChange: (v: string) => void
  trailing?: React.ReactNode
}) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
      <label
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('semibold'),
          cm.sp('ml', 1),
          'uppercase tracking-widest text-on-surface-variant',
        )}
        htmlFor={id}
      >
        {label}
      </label>
      <div
        className={cm.cn(
          cm.flex({ align: 'center' }),
          cm.sp('px', 4),
          'bg-surface-container-low rounded-t-lg py-3.5 border-b-2 border-outline focus-within:border-primary transition-colors',
        )}
      >
        <span
          className={cm.cn(
            cm.sp('mr', 3),
            cm.textSize('xl'),
            'material-symbols-outlined text-outline',
          )}
        >
          {icon}
        </span>
        <input
          className={cm.cn(
            cm.w('full'),
            cm.sp('p', 0),
            cm.fontWeight('medium'),
            'bg-transparent border-none focus:ring-0 outline-none text-on-surface placeholder:text-outline/60',
          )}
          id={id}
          type={type}
          autoComplete={autoComplete}
          required={required}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {trailing}
      </div>
    </div>
  )
}
