import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { PasswordStrengthMeter } from '../components/PasswordStrengthMeter.js'
import { SigilBrandHeader } from '../components/SigilBrandHeader.js'
import { loadContent } from '../config.js'

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
  const firstName = authFormFields.firstName ?? ''
  const setFirstName = (value: string): void => setAuthFormField('firstName', value)
  const lastName = authFormFields.lastName ?? ''
  const setLastName = (value: string): void => setAuthFormField('lastName', value)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [mismatchError, setMismatchError] = useState<string | null>(null)

  const isSigningUp = status === 'pending'

  const segments: 1 | 2 | 3 | 4 | null = !password
    ? null
    : password.length >= 16
      ? 4
      : password.length >= 12
        ? 3
        : password.length >= 8
          ? 2
          : 1

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setMismatchError(
        t('auth.signup.passwordsDoNotMatch', {}, { defaultValue: 'Passwords do not match.' }),
      )
      return
    }
    setMismatchError(null)
    try {
      const name = `${firstName} ${lastName}`.trim() || undefined
      await signup({ email, password, name })
      clearAuthForm()
      navigate('/vault', { replace: true })
    } catch (_error) {
      // error surfaced via error from useSignup hook state
    }
  }

  const inputClass = cm.cn(
    cm.w('full'),
    cm.sp('px', 4),
    cm.sp('py', 3),
    cm.textSize('sm'),
    'rounded-lg border border-primary-light/40 bg-surface text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all',
  )

  const legalLinkClass = cm.cn(
    cm.textSize('xs'),
    cm.fontWeight('semibold'),
    'text-on-surface-variant hover:text-primary transition-colors',
  )

  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'center' }),
        cm.sp('p', 6),
        cm.minH('screen'),
        'bg-surface-container-low/40 font-body text-on-surface',
      )}
    >
      <main className={cm.cn(cm.w('full'), cm.maxW('md'))}>
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'lg' }),
            cm.sp('p', 8),
            'bg-surface rounded-2xl shadow-lg shadow-primary-light/40 border border-primary-light/30',
          )}
        >
          <SigilBrandHeader
            heading={t('signup.heading', {}, { defaultValue: 'Create your vault' })}
            subhead={t(
              'signup.subhead',
              { appName: APP_NAME },
              {
                defaultValue:
                  'Your master password derives the encryption key locally — {{appName}} can never read your vault.',
              },
            )}
          />

          <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
            <div className={cm.cn(cm.grid({ gap: 'sm' }), 'grid-cols-2')}>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder={t('form.firstName', {}, { defaultValue: 'First name' })}
                autoComplete="given-name"
                required
                className={inputClass}
              />
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder={t('form.lastName', {}, { defaultValue: 'Last name' })}
                autoComplete="family-name"
                required
                className={inputClass}
              />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
              autoComplete="email"
              required
              className={inputClass}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('signup.password', {}, { defaultValue: 'Master password' })}
              autoComplete="new-password"
              required
              className={cm.cn(inputClass, 'font-mono tracking-[0.08em]')}
            />
            {segments && <PasswordStrengthMeter segments={segments} width="full" />}
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={t('signup.confirm', {}, { defaultValue: 'Confirm master password' })}
              autoComplete="new-password"
              required
              className={cm.cn(inputClass, 'font-mono tracking-[0.08em]')}
            />
            <p
              className={cm.cn(
                cm.flex({ align: 'start', gap: 'xs' }),
                cm.sp('p', 3),
                cm.textSize('xs'),
                'rounded-lg bg-warning-light text-warning border border-amber-200/80 leading-relaxed',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-[16px] mt-0.5')}
                aria-hidden="true"
              >
                warning
              </span>
              {t(
                'signup.warning',
                {},
                { defaultValue: "Your master password can't be recovered — choose carefully." },
              )}
            </p>

            <button
              type="submit"
              disabled={isSigningUp}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                cm.w('full'),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-lg bg-primary hover:bg-primary-hover text-white shadow-md shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed mt-2',
              )}
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                {isSigningUp ? 'progress_activity' : 'shield_lock'}
              </span>
              {isSigningUp
                ? t('signup.sealing', {}, { defaultValue: 'Sealing vault...' })
                : t('signup.submit', {}, { defaultValue: 'Seal my vault' })}
            </button>
            {(mismatchError || error) && (
              <p className={cm.cn(cm.textSize('xs'), 'text-error text-center')}>
                {mismatchError ?? error?.message}
              </p>
            )}
          </form>

          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.sp('py', 1),
              'relative',
            )}
          >
            <div className={cm.cn('absolute inset-0', cm.flex({ align: 'center' }))}>
              <span className={cm.cn(cm.w('full'), 'h-px bg-primary-light/50')} />
            </div>
            <span
              className={cm.cn(
                cm.sp('px', 4),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'relative bg-surface text-on-surface-variant uppercase tracking-widest',
              )}
            >
              {t('login.orContinue', {}, { defaultValue: 'or continue with' })}
            </span>
          </div>

          <OAuthButtons />
        </div>

        <footer
          className={cm.cn(
            cm.sp('mt', 6),
            cm.textCenter,
            cm.textSize('sm'),
            'text-on-surface-variant',
          )}
        >
          <span>
            {t('auth.login.alreadyHaveAccount', {}, { defaultValue: 'Already have an account?' })}{' '}
            <Link to="/login" className={cm.cn('text-primary-dark font-bold hover:underline')}>
              {t('signup.signIn', {}, { defaultValue: 'Sign In' })}
            </Link>
          </span>
          <nav
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center', gap: 'md' }),
              cm.sp('mt', 3),
            )}
          >
            <LegalModalLinks
              linkClassName={legalLinkClass}
              appName={APP_NAME}
              loadContent={loadContent}
              privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
              termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
            />
          </nav>
        </footer>
      </main>
    </div>
  )
}

export default Signup
