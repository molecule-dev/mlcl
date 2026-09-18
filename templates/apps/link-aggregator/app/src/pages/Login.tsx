import type { ReactElement } from 'react'
import { cloneElement, isValidElement, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLegalModals } from '@molecule/app-legal-pages-react'
import { useLogin, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { ThemeToggle } from '../components/ThemeToggle.js'
import { loadContent } from '../config.js'

export function Login() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/feed'
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
  // In-place Privacy/Terms modals (the standalone /privacy and /terms routes
  // still exist for deep links) — shared @molecule legal-modal hook.
  const {
    openPrivacy,
    openTerms,
    modals: legalModals,
  } = useLegalModals({
    appName: APP_NAME,
    loadContent,
  })
  const legalLinkClass = cm.cn(
    cm.fontWeight('bold'),
    'text-primary hover:underline decoration-2 underline-offset-2',
  )

  const isLoggingIn = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login({ email, password })
      clearAuthForm()
      navigate(from, { replace: true })
    } catch (_error) {
      // error is displayed via the error state from useLogin
    }
  }

  return (
    <AuthShell>
      <BrandHeader />
      <header className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), cm.textCenter)}>
        <h2
          className={cm.cn(
            cm.textSize('2xl'),
            cm.fontWeight('bold'),
            'tracking-tight text-on-surface',
          )}
        >
          {t('login.welcome', {}, { defaultValue: 'Welcome back to the cairn.' })}
        </h2>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('login.subtitle', { tagline: APP_TAGLINE }, { defaultValue: '{{tagline}}' })}
        </p>
      </header>

      <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
        <Field
          label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          icon="alternate_email"
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            placeholder={t(
              'auth.passwordPlaceholderEmail',
              {},
              { defaultValue: 'you@example.com' },
            )}
            className={cm.cn(
              cm.sp('py', 3),
              cm.textSize('base'),
              'flex-1 bg-transparent outline-none text-on-surface placeholder:text-on-surface-variant',
            )}
          />
        </Field>
        <Field
          label={t('auth.login.password', {}, { defaultValue: 'Password' })}
          icon="lock"
          trailing={
            <Link
              to="/forgot-password"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-primary hover:underline',
              )}
            >
              {t('auth.login.forgotShort', {}, { defaultValue: 'Forgot?' })}
            </Link>
          }
        >
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            placeholder={'\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
            className={cm.cn(
              cm.sp('py', 3),
              cm.textSize('base'),
              'flex-1 bg-transparent outline-none text-on-surface placeholder:text-on-surface-variant',
            )}
          />
        </Field>

        {error && (
          <p
            role="alert"
            className={cm.cn(cm.sp('p', 3), cm.textSize('sm'), 'rounded-lg bg-error/10 text-error')}
          >
            {error.message}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoggingIn}
          className={cm.cn(
            cm.sp('py', 3),
            cm.roundedFull,
            cm.textSize('base'),
            cm.fontWeight('bold'),
            'bg-primary text-on-primary hover:bg-primary-hover disabled:opacity-60 transition-colors shadow-md',
          )}
        >
          {isLoggingIn
            ? t('login.signingIn', {}, { defaultValue: 'Signing in\u2026' })
            : t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
        </button>
      </form>

      <Divider label={t('login.orContinue', {}, { defaultValue: 'or continue with' })} />
      <OAuthButtons />

      <footer className={cm.cn(cm.textCenter, cm.textSize('sm'))}>
        <span className="text-on-surface-variant">
          {t(
            'login.noAccount',
            { appName: APP_NAME },
            { defaultValue: 'New to {{appName}}?' },
          )}{' '}
        </span>
        <Link
          to="/signup"
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-primary hover:underline decoration-2 underline-offset-2',
          )}
        >
          {t('auth.signup.createYourAccount', {}, { defaultValue: 'Create your account' })}
        </Link>
      </footer>

      <p
        className={cm.cn(
          cm.textCenter,
          cm.textSize('xs'),
          'leading-relaxed text-on-surface-variant',
        )}
      >
        {t(
          'auth.legalConsent.prefix',
          { appName: APP_NAME },
          { defaultValue: 'By continuing, you agree to {{appName}}’s' },
        )}{' '}
        <button type="button" onClick={openPrivacy} className={legalLinkClass}>
          {t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
        </button>{' '}
        {t('common.and', {}, { defaultValue: 'and' })}{' '}
        <button type="button" onClick={openTerms} className={legalLinkClass}>
          {t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
        </button>
        {'.'}
      </p>
      {legalModals}
    </AuthShell>
  )
}

export function AuthShell({ children }: { children: React.ReactNode }) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.minH('screen'),
        cm.sp('p', 6),
        'bg-gradient-to-br from-background via-primary/5 to-secondary/5 relative overflow-hidden',
      )}
    >
      <header className={'absolute top-0 right-0 p-6 z-20'}>
        <ThemeToggle />
      </header>
      <div
        className={cm.cn(
          cm.w(80),
          cm.h(80),
          cm.roundedFull,
          'absolute -left-32 -top-32 bg-primary/15 blur-3xl pointer-events-none',
        )}
      />
      <div
        className={cm.cn(
          cm.w(80),
          cm.h(80),
          cm.roundedFull,
          'absolute -right-32 -bottom-32 bg-secondary/15 blur-3xl pointer-events-none',
        )}
      />
      <main
        className={cm.cn(
          cm.w('full'),
          cm.maxW('md'),
          cm.flex({ direction: 'col', gap: 'lg' }),
          cm.sp('p', 8),
          'relative z-10 rounded-3xl bg-surface-container-lowest/95 backdrop-blur-md shadow-xl border border-outline-variant/30',
        )}
      >
        {children}
      </main>
    </div>
  )
}

export function BrandHeader() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(cm.flex({ direction: 'col', align: 'center', gap: 'xs' }), cm.textCenter)}
    >
      <span
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.w(14),
          cm.h(14),
          cm.roundedFull,
          cm.sp('mb', 2),
          'bg-gradient-to-br from-primary to-[var(--color-primary-deep)] text-white shadow-lg',
        )}
        aria-hidden="true"
      >
        <span
          className="material-symbols-outlined text-3xl"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          terrain
        </span>
      </span>
      <h1
        className={cm.cn(
          cm.textSize('3xl'),
          cm.fontWeight('bold'),
          'tracking-tighter text-on-surface',
        )}
      >
        {APP_NAME}
      </h1>
      <p
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          'uppercase tracking-widest text-primary',
        )}
      >
        {t('brandHeader.tagline', { tagline: APP_TAGLINE }, { defaultValue: '{{tagline}}' })}
      </p>
    </div>
  )
}

export function Field({
  label,
  icon,
  trailing,
  children,
}: {
  label: string
  icon: string
  trailing?: React.ReactNode
  children: React.ReactNode
}) {
  const cm = getClassMap()
  // Forward `label` as `aria-label` to the underlying form control so
  // screen readers (and Playwright's getByLabel) can resolve the field
  // by its visible text rather than the material-icon name.
  const labelled = isValidElement(children)
    ? cloneElement(children as ReactElement<{ 'aria-label'?: string }>, { 'aria-label': label })
    : children
  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
      <div className={cm.cn(cm.flex({ align: 'baseline', justify: 'between' }))}>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('xs'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {label}
        </span>
        {trailing}
      </div>
      <label
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.sp('px', 4),
          'rounded-xl border border-outline-variant/40 bg-surface focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-colors',
        )}
      >
        <span
          aria-hidden="true"
          className={'material-symbols-outlined text-base text-on-surface-variant'}
        >
          {icon}
        </span>
        {labelled}
      </label>
    </div>
  )
}

export function Divider({ label }: { label: string }) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
      <span className={'flex-1 h-px bg-outline-variant/40'} />
      <span
        className={cm.cn(
          cm.fontWeight('bold'),
          cm.textSize('xs'),
          'uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </span>
      <span className={'flex-1 h-px bg-outline-variant/40'} />
    </div>
  )
}

export default Login
