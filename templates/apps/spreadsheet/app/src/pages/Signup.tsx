import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { CalciteAuthHeader } from '../components/CalciteAuthHeader.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { ThemeToggle } from '../components/ThemeToggle.js'

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

  const isSigningUp = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await signup({ email, password, name: name || undefined })
      clearAuthForm()
      navigate('/workbooks', { replace: true })
    } catch (_error) {
      // error is tracked in error state by useSignup; nothing to do here
    }
  }

  const benefits = [
    t('signup.benefit1', {}, { defaultValue: 'Real-time collaboration · cell-level presence' }),
    t('signup.benefit2', {}, { defaultValue: 'Formula library with 400+ functions and lambdas' }),
    t('signup.benefit3', {}, { defaultValue: 'Native automations · webhook & cron triggers' }),
  ]

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.sp('p', 6),
        'bg-surface-container-low text-on-surface relative',
      )}
    >
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(37,99,235,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.06) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
        aria-hidden="true"
      />
      <div className="absolute top-6 right-6 z-10">
        <ThemeToggle />
      </div>
      <main className={cm.cn(cm.w('full'), cm.maxW('md'), 'relative z-10')}>
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'xl' }),
            cm.sp('p', 10),
            'bg-surface-container-lowest rounded-2xl shadow-xl shadow-primary/5 border border-outline-variant/40',
          )}
        >
          <CalciteAuthHeader
            tagline={t(
              'signup.tagline',
              {},
              { defaultValue: 'Spin up your first workbook in 30 seconds' },
            )}
            title={t(
              'auth.signup.createYourWorkspace',
              {},
              { defaultValue: 'Create your workspace' },
            )}
            subtitle={t(
              'signup.subtitle',
              {},
              { defaultValue: 'A 30-second sign-up. No credit card.' },
            )}
          />
          <ul className={cm.stack(2)}>
            {benefits.map((benefit) => (
              <li
                key={benefit}
                className={cm.cn(
                  cm.flex({ align: 'start', gap: 'sm' }),
                  'text-sm text-on-surface-variant',
                )}
              >
                <span
                  className={'material-symbols-outlined text-base text-secondary mt-0.5'}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  aria-hidden="true"
                >
                  check_circle
                </span>
                <span>{benefit}</span>
              </li>
            ))}
          </ul>

          <form className={cm.cn(cm.w('full'), cm.stack(5))} onSubmit={handleSubmit}>
            {error && (
              <div
                role="alert"
                className={'px-4 py-3 text-sm text-error bg-error-container/40 rounded-xl'}
              >
                {error.message}
              </div>
            )}
            <div className={cm.stack(2)}>
              <label
                htmlFor="signup-name"
                className={'text-xs font-bold uppercase tracking-widest text-on-surface-variant'}
              >
                {t('form.fullName', {}, { defaultValue: 'Full name' })}
              </label>
              <input
                id="signup-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                placeholder={t('signup.namePlaceholder', {}, { defaultValue: 'Avery Chen' })}
                disabled={isSigningUp}
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'bg-surface-container-low rounded-xl border-0 focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/30 outline-none text-on-surface placeholder:text-on-surface-variant transition-all',
                )}
              />
            </div>
            <div className={cm.stack(2)}>
              <label
                htmlFor="signup-email"
                className={'text-xs font-bold uppercase tracking-widest text-on-surface-variant'}
              >
                {t('auth.workEmail', {}, { defaultValue: 'Work email' })}
              </label>
              <input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                placeholder={t(
                  'auth.passwordPlaceholderNameCompany',
                  {},
                  { defaultValue: 'name@company.com' },
                )}
                disabled={isSigningUp}
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'bg-surface-container-low rounded-xl border-0 focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/30 outline-none text-on-surface placeholder:text-on-surface-variant transition-all',
                )}
              />
            </div>
            <div className={cm.stack(2)}>
              <label
                htmlFor="signup-password"
                className={'text-xs font-bold uppercase tracking-widest text-on-surface-variant'}
              >
                {t('auth.login.password', {}, { defaultValue: 'Password' })}
              </label>
              <input
                id="signup-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                placeholder="••••••••"
                disabled={isSigningUp}
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'bg-surface-container-low rounded-xl border-0 focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/30 outline-none text-on-surface placeholder:text-on-surface-variant transition-all',
                )}
              />
            </div>
            <button
              type="submit"
              disabled={isSigningUp}
              className={
                'w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold text-on-primary rounded-xl bg-gradient-to-br from-primary to-primary-dark shadow-lg shadow-primary/25 hover:scale-[1.01] active:scale-[0.99] transition-transform disabled:opacity-60 disabled:cursor-not-allowed'
              }
            >
              {isSigningUp
                ? t('signup.creating', {}, { defaultValue: 'Provisioning workspace…' })
                : t('signup.cta', {}, { defaultValue: 'Create my workspace' })}
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                arrow_forward
              </span>
            </button>
          </form>
          <OAuthButtons />
        </div>
        <p
          className={cm.cn(
            cm.sp('mt', 8),
            cm.textCenter,
            cm.textSize('sm'),
            'text-on-surface-variant',
          )}
        >
          {t('signup.haveAccount', { name: APP_NAME }, { defaultValue: 'Already on {{name}}?' })}{' '}
          <Link
            to="/login"
            className={'text-primary font-bold hover:underline decoration-2 underline-offset-4'}
          >
            {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </Link>
        </p>
      </main>
    </div>
  )
}

export default Signup
