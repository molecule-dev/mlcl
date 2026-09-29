import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import LoginDivider from '../components/LoginDivider.js'
import LoginEmailField from '../components/LoginEmailField.js'
import LoginFooter from '../components/LoginFooter.js'
import LoginOAuthButtons from '../components/LoginOAuthButtons.js'
import LoginPasswordField from '../components/LoginPasswordField.js'
import LoginTopNavBar from '../components/LoginTopNavBar.js'

/** The signup-side guarantees (design: The Dispatch Guarantees panel). */
const GUARANTEES = [
  {
    id: 'cut',
    icon: 'percent',
    title: '0% Platform Cut on Direct Subscriptions',
    body: 'Keep 100% of reader patronage flowing straight to your connected payment account.',
  },
  {
    id: 'sovereignty',
    icon: 'lock_open',
    title: 'Cryptographic Subscriber Sovereignty',
    body: 'Instant 1-click full CSV & JSON export anytime. Your audience is forever yours.',
  },
  {
    id: 'typography',
    icon: 'menu_book',
    title: 'Bespoke Typography & 680px Reading Measure',
    body: 'Optical serifs, custom footnote marginalia, and zero banner distraction.',
  },
  {
    id: 'delivery',
    icon: 'verified',
    title: 'Dedicated Warm IP Delivery',
    body: 'High primary-inbox delivery with authenticated custom DKIM and DMARC keys.',
  },
]

function Signup() {
  const cm = getClassMap()
  const { t } = useTranslation()
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
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({})
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  function validate() {
    const next: typeof errors = {}
    if (!email.trim()) {
      next.email = t('signup.errors.emailRequired', {}, { defaultValue: 'Email is required' })
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      next.email = t(
        'signup.errors.emailInvalid',
        {},
        { defaultValue: 'Please enter a valid email' },
      )
    }
    if (!password) {
      next.password = t(
        'signup.errors.passwordRequired',
        {},
        { defaultValue: 'Password is required' },
      )
    } else if (password.length < 8) {
      next.password = t(
        'signup.errors.passwordLength',
        {},
        { defaultValue: 'Password must be at least 8 characters' },
      )
    }
    return next
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const v = validate()
    setErrors(v)
    if (Object.keys(v).length > 0) return

    setLoading(true)
    setErrors({})
    try {
      await register({ email, password })
      clearAuthForm()
      navigate('/dashboard')
    } catch (err) {
      setErrors({
        form:
          err instanceof Error
            ? err.message
            : t('signup.error', {}, { defaultValue: 'Signup failed' }),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <LoginTopNavBar />
      <main
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.sp('pb', 12),
          cm.sp('px', 6),
          cm.flex1,
          'pt-24',
        )}
      >
        <div
          className={cm.cn(
            'max-w-[440px]',
            cm.w('full'),
            'animate-in fade-in slide-in-from-bottom-4 duration-700',
          )}
        >
          <div className={cm.cn(cm.textCenter, cm.sp('mb', 10))}>
            <h1
              className={cm.cn(
                cm.sp('mb', 2),
                'font-headline text-[2.5rem] leading-tight tracking-tight text-on-surface',
              )}
            >
              {t('signup.title', {}, { defaultValue: 'Begin your sovereign publication.' })}
            </h1>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                'font-sans-ui text-on-surface-variant tracking-wide',
              )}
            >
              {t('auth.signup.createYourAccount', {}, { defaultValue: 'Create your account' })}
            </p>
          </div>
          <form className={cm.stack(6)} onSubmit={onSubmit}>
            {errors.form && (
              <p
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.textSize('xs'),
                  'font-sans-ui text-error',
                )}
                role="alert"
                aria-live="polite"
              >
                <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>error</span>
                {errors.form}
              </p>
            )}
            <LoginEmailField
              email={email}
              setEmail={(v) => {
                setEmail(v)
                if (errors.email) setErrors((e) => ({ ...e, email: undefined }))
              }}
              error={errors.email || null}
              formContext="signup"
            />
            <LoginPasswordField
              password={password}
              setPassword={(v) => {
                setPassword(v)
                if (errors.password) setErrors((e) => ({ ...e, password: undefined }))
              }}
              error={errors.password || null}
              showForgot={false}
              formContext="signup"
            />
            <div className={cm.sp('pt', 4)}>
              <button
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
                  cm.roundedFull,
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  cm.w('full'),
                  cm.h(12),
                  'bg-gradient-to-br from-primary to-primary-container text-on-primary font-sans-ui tracking-wide shadow-lg shadow-primary/10 transition-transform active:scale-95',
                  loading ? 'opacity-80 cursor-not-allowed' : 'hover:brightness-110',
                )}
                data-mol-id="button-signup-submit"
                disabled={loading}
                type="submit"
              >
                {loading && (
                  <svg
                    className={cm.cn(cm.h(4), cm.w(4), 'animate-spin text-on-primary')}
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className={cm.fv54eab745}
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className={cm.fv54eab7e0}
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      fill="currentColor"
                    ></path>
                  </svg>
                )}
                {loading
                  ? t('auth.signup.signingUp', {}, { defaultValue: 'Signing up...' })
                  : t('auth.login.signUp', {}, { defaultValue: 'Sign up' })}
              </button>
            </div>
            <LoginDivider />
            <LoginOAuthButtons />
            <div className={cm.cn(cm.textCenter, cm.sp('pt', 6))}>
              <p className={cm.cn(cm.textSize('sm'), 'font-sans-ui text-on-surface-variant')}>
                {t(
                  'auth.login.alreadyHaveAccount',
                  {},
                  { defaultValue: 'Already have an account?' },
                )}
                <Link className={cm.fv93c68d50} data-mol-id="link-signin" to="/login">
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
              </p>
            </div>
          </form>
          {/* The Dispatch Guarantees (design: the side panel beside the form) */}
          <section
            data-mol-id="signup-guarantees"
            aria-label={t(
              'signup.guarantees.title',
              {},
              { defaultValue: 'The Dispatch Guarantees' },
            )}
            className={cm.cn(
              cm.sp('mt', 10),
              cm.sp('p', 6),
              'rounded-xl bg-surface-container-lowest border border-surface-container-highest',
            )}
          >
            <h2
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'uppercase tracking-widest text-primary',
                cm.sp('mb', 4),
              )}
            >
              {t('signup.guarantees.title', {}, { defaultValue: 'The Dispatch Guarantees' })}
            </h2>
            <ul className={cm.stack(4)}>
              {GUARANTEES.map((g) => (
                <li key={g.id} className={cm.cn(cm.flex({ align: 'start', gap: 'sm' }))}>
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      'w-8 h-8 shrink-0 rounded-sm bg-primary-fixed text-primary',
                    )}
                  >
                    <span className={cm.fv5b245ffa} aria-hidden>
                      {g.icon}
                    </span>
                  </span>
                  <div>
                    <h3
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        'text-on-surface',
                      )}
                    >
                      {t(`signup.guarantees.${g.id}.title`, {}, { defaultValue: g.title })}
                    </h3>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {t(`signup.guarantees.${g.id}.body`, {}, { defaultValue: g.body })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
      <LoginFooter />
    </>
  )
}

export default Signup
export { Signup, Signup as SignupPage }
