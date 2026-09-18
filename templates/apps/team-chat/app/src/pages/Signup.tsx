// Phase 1 — derived copy from Login (same stitch: design-team-chat-login.html).
// Phase 4 wires it to this screen's own auth flow.
// Do not hand-edit; Phase 2 will extract sections one at a time.
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import SSOButton from '../components/SSOButton.js'
import { loadContent } from '../config.js'
function Signup() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { register } = useAuth()
  const navigate = useNavigate()
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
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      if (password !== confirmPassword) {
        throw new Error(
          t(
            'auth.signup.passwordsDoNotMatchNoPeriod',
            {},
            { defaultValue: 'Passwords do not match' },
          ),
        )
      }
      await register({ name, email, password })
      clearAuthForm()
      navigate('/')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('signup.failed', {}, { defaultValue: 'Signup failed' }),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.minH('screen'),
        cm.w('full'),
        cm.sp('p', 6),
      )}
    >
      <div className={cm.cn('login-card', cm.mxAuto)}>
        {/* Logo Section */}
        <div className={cm.cn('logo')}>
          {t('app.name', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
        </div>
        {/* Header Section */}
        <h1 className={cm.cn('header-title')}>
          {t('auth.signup.createYourAccount', {}, { defaultValue: 'Create your account' })}
        </h1>
        <p className={cm.cn('subtitle')}>
          {t(
            'signup.subtitle',
            { appName: APP_NAME },
            { defaultValue: 'Get started with {{appName}}' },
          )}
        </p>
        {/* Form Section */}
        <form className={cm.cn('form-container')} onSubmit={handleSubmit}>
          {error && (
            <div
              data-mol-id="signup-error"
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.sp('mb', 5),
                cm.textCenter,
                cm.textSize('sm'),
                'rounded-lg',
                'box-border bg-error-light text-error',
              )}
            >
              {error}
            </div>
          )}
          <div className={cm.cn('input-group')}>
            <input
              className={cm.cn('input-field')}
              placeholder={t('form.fullName', {}, { defaultValue: 'Full name' })}
              required={true}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className={cm.cn('input-group')}>
            <input
              className={cm.cn('input-field')}
              placeholder={t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
              required={true}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className={cm.cn('input-group')}>
            <input
              className={cm.cn('input-field')}
              placeholder={t('auth.login.password', {}, { defaultValue: 'Password' })}
              required={true}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className={cm.cn('input-group')}>
            <input
              className={cm.cn('input-field')}
              placeholder={t(
                'auth.signup.confirmPassword',
                {},
                { defaultValue: 'Confirm password' },
              )}
              required={true}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <button
            className={cm.cn('cta-button', loading ? 'cursor-wait opacity-70' : cm.cursorPointer)}
            type="submit"
            disabled={loading}
          >
            {loading
              ? t('signup.creating', {}, { defaultValue: 'Creating account...' })
              : t('auth.login.signUp', {}, { defaultValue: 'Sign up' })}
          </button>
        </form>
        {/* Divider */}
        <div className={cm.cn('divider')}>
          <span>{t('common.or', {}, { defaultValue: 'or' })}</span>
        </div>
        <SSOButton />
        {/* Footer Section */}
        <div className={cm.cn(cm.sp('mt', 10))}>
          <p className={cm.cn('footer-text')}>
            {t('auth.login.alreadyHaveAccount', {}, { defaultValue: 'Already have an account?' })}{' '}
            <Link to="/login">{t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}</Link>
          </p>
        </div>
      </div>
      {/* Minimalistic Decorative Elements for "Chromatic Architect" Feel */}
      <div
        className={cm.cn(
          'pointer-events-none fixed right-[5%] top-[10%] z-[-1] h-[300px] w-[300px] rounded-full',
        )}
        style={{
          background:
            'radial-gradient(circle, color-mix(in srgb, var(--color-secondary) 8%, transparent) 0%, transparent 70%)',
        }}
      />
      <div
        className={cm.cn(
          'pointer-events-none fixed bottom-[10%] left-[5%] z-[-1] h-[400px] w-[400px] rounded-full',
        )}
        style={{
          background:
            'radial-gradient(circle, color-mix(in srgb, var(--color-primary) 8%, transparent) 0%, transparent 70%)',
        }}
      />
      <div className={cm.cn('pointer-events-none fixed inset-0 z-[-2] opacity-40')}>
        <img
          alt={t('signup.backgroundAlt', {}, { defaultValue: 'Design Aesthetic Background' })}
          data-alt="abstract flowing background with deep purple and violet gradients creating a sense of professional depth and corporate sophistication"
          src="https://picsum.photos/seed/Signup-1/1200/800"
          className={cm.cn('h-full w-full object-cover')}
        />
      </div>
      {/* Mandatory Footer from Shared Components */}
      <footer
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', gap: 4 }),
          cm.sp('pb', 8),
          cm.sp('px', 6),
          'fixed bottom-0 left-0 w-full',
        )}
      >
        <p className={cm.cn('font-inter text-[11px] uppercase tracking-widest text-fuchsia-700')}>
          {t(
            'common.copyright',
            { year: new Date().getFullYear(), appName: APP_NAME },
            { defaultValue: '© {{year}} {{appName}}. All rights reserved.' },
          )}
        </p>
        <div className={cm.flex({ gap: 6 })}>
          <LegalModalLinks
            linkClassName={cm.cn(
              'font-inter text-[11px] uppercase tracking-widest text-fuchsia-700 hover:text-cyan-400 transition-colors',
            )}
            appName={APP_NAME}
            loadContent={loadContent}
            privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
            termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
          />
          <Link
            className={cm.cn(
              'font-inter text-[11px] uppercase tracking-widest text-fuchsia-700 hover:text-cyan-400 transition-colors',
            )}
            to="/pricing"
          >
            {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
          </Link>
        </div>
      </footer>
    </div>
  )
}

export default Signup
export { Signup, Signup as SignupPage }
