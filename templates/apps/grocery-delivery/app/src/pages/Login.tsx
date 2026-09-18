import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, BRAND_COLOR } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'
import { OAuthButtons } from '../components/OAuthButtons.js'

const submitGradient = `linear-gradient(135deg, ${BRAND_COLOR}, var(--color-gradient-end))`

export function Login() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/shop'
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login({ email, password })
      clearAuthForm()
      navigate(from, { replace: true })
    } catch (_error) {
      // Error tracked in hook state
    }
  }

  const isLoggingIn = status === 'pending'

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'relative bg-surface-container-low font-body text-on-surface overflow-hidden',
      )}
    >
      <div
        className={
          'fixed top-[-10%] left-[-10%] -z-10 w-[40rem] h-[40rem] rounded-full pointer-events-none'
        }
        style={{ background: BRAND_COLOR, filter: 'blur(80px)', opacity: 0.18 }}
      />
      <div
        className={
          'fixed bottom-[-10%] right-[-10%] -z-10 w-[35rem] h-[35rem] rounded-full pointer-events-none'
        }
        style={{ background: 'var(--color-gradient-end)', filter: 'blur(80px)', opacity: 0.16 }}
      />

      <main
        className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.flex1, cm.sp('p', 6))}
      >
        <div className={cm.cn(cm.w('full'), cm.maxW('md'))}>
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'xl' }),
              cm.sp('p', 10),
              'rounded-3xl backdrop-blur-xl border border-surface/40',
            )}
            style={{
              background: 'color-mix(in srgb, var(--color-surface) 82%, transparent)',
              boxShadow: '0 20px 40px color-mix(in srgb, var(--color-primary) 15%, transparent)',
            }}
          >
            <AuthBrandHeader />

            <div className="text-center">
              <h2
                className={cm.cn(cm.textSize('2xl'), 'font-black tracking-tight')}
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                {t('auth.login.signInTitle', {}, { defaultValue: 'Welcome back' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
                {t('login.body', {}, { defaultValue: 'Sign in to schedule your next delivery.' })}
              </p>
            </div>

            <form className={cm.cn(cm.flex({ direction: 'col' }), 'gap-5')} onSubmit={handleSubmit}>
              <Field
                id="email"
                icon="mail"
                type="email"
                value={email}
                onChange={setEmail}
                label={t('login.emailLabel', {}, { defaultValue: 'Email Address' })}
                placeholder={t(
                  'login.emailPlaceholder',
                  {},
                  { defaultValue: 'shopper@bushel.fresh' },
                )}
                autoComplete="email"
                required
              />

              <PasswordField
                id="password"
                value={password}
                onChange={setPassword}
                show={showPassword}
                toggleShow={() => setShowPassword((v) => !v)}
                label={t('auth.login.password', {}, { defaultValue: 'Password' })}
                placeholder={t('login.passwordPlaceholder', {}, { defaultValue: 'Your password' })}
              />

              {error && (
                <div
                  data-mol-id="login-error"
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
                disabled={isLoggingIn}
                className={cm.cn(
                  cm.sp('py', 4),
                  cm.roundedFull,
                  cm.textSize('lg'),
                  cm.sp('mt', 2),
                  cm.fontWeight('bold'),
                  'text-white hover:shadow-lg active:scale-95 transition-all disabled:opacity-60',
                )}
                style={{ background: submitGradient }}
              >
                {isLoggingIn
                  ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
                  : t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </button>
            </form>

            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
              <OAuthButtons />
            </div>
          </div>

          <footer
            className={cm.cn(
              cm.sp('mt', 8),
              cm.textCenter,
              cm.flex({ direction: 'col', gap: 'sm' }),
            )}
          >
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant',
              )}
            >
              <Link
                to="/forgot-password"
                className={'font-bold hover:underline decoration-2 underline-offset-4'}
                style={{ color: 'var(--mol-color-primary-dark)' }}
              >
                {t('auth.login.forgotPassword', {}, { defaultValue: 'Forgot password?' })}
              </Link>
            </p>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant',
              )}
            >
              {t('login.noAccount', { appName: APP_NAME }, { defaultValue: 'New to {{appName}}?' })}{' '}
              <Link
                to="/signup"
                className={'font-bold hover:underline decoration-2 underline-offset-4'}
                style={{ color: 'var(--mol-color-primary-dark)' }}
              >
                {t('auth.signup.createAnAccount', {}, { defaultValue: 'Create an account' })}
              </Link>
            </p>
          </footer>
        </div>
      </main>
      <Footer />
    </div>
  )
}

interface FieldProps {
  id: string
  icon: string
  type: string
  value: string
  onChange: (v: string) => void
  label: string
  placeholder: string
  autoComplete?: string
  required?: boolean
}

function Field({
  id,
  icon,
  type,
  value,
  onChange,
  label,
  placeholder,
  autoComplete,
  required,
}: FieldProps) {
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
          'relative bg-surface/60 rounded-t-lg py-3.5 input-focus-border',
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
            'bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-outline/60',
          )}
          id={id}
          type={type}
          autoComplete={autoComplete}
          required={required}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  )
}

interface PasswordFieldProps {
  id: string
  value: string
  onChange: (v: string) => void
  show: boolean
  toggleShow: () => void
  label: string
  placeholder: string
}

function PasswordField({
  id,
  value,
  onChange,
  show,
  toggleShow,
  label,
  placeholder,
}: PasswordFieldProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
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
          'relative bg-surface/60 rounded-t-lg py-3.5 input-focus-border',
        )}
      >
        <span
          className={cm.cn(
            cm.sp('mr', 3),
            cm.textSize('xl'),
            'material-symbols-outlined text-outline',
          )}
        >
          lock
        </span>
        <input
          className={cm.cn(
            cm.w('full'),
            cm.sp('p', 0),
            cm.fontWeight('medium'),
            'bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-outline/60',
          )}
          id={id}
          type={show ? 'text' : 'password'}
          autoComplete="current-password"
          required
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          onClick={toggleShow}
          aria-label={
            show
              ? t('login.hidePassword', {}, { defaultValue: 'Hide password' })
              : t('login.showPassword', {}, { defaultValue: 'Show password' })
          }
          className={cm.cn(cm.sp('ml', 2), 'text-outline hover:text-primary transition-colors')}
        >
          <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>
            {show ? 'visibility_off' : 'visibility'}
          </span>
        </button>
      </div>
    </div>
  )
}
