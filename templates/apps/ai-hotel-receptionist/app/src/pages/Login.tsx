import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { AuthStatusPill, SwitchboardAuthShell } from '../components/SwitchboardAuthShell.js'

/**
 * Operator sign-in — the Stitch login design: a high-trust terminal card on
 * the left (credential form + real OAuth entry points) and a live
 * telephony/security proof rail on the right. Spec-pinned copy is kept
 * verbatim: #email/#password ids, the Forgot link, the "Create an account"
 * link, and the /Sign in/i submit that POSTs /api/users/log-in.
 */
export function Login() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard'
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
      /* Error tracked in hook state */
    }
  }

  const isLoggingIn = status === 'pending'

  const fieldClass =
    'w-full bg-surface-container-lowest border border-outline-variant rounded-lg text-primary text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-secondary/30'

  return (
    <SwitchboardAuthShell
      eyebrow={t('login.eyebrow', {}, { defaultValue: 'Staff sign in' })}
      heading={t('login.heading', {}, { defaultValue: 'Welcome back to your front desk.' })}
      subheading={t(
        'login.subheading',
        {},
        {
          defaultValue:
            'Sign in to manage autonomous voice lines, PMS ledger sync, and overnight audio logs.',
        },
      )}
      badge={
        <span
          className={cm.cn(
            'inline-flex items-center gap-2 px-2.5 py-1 rounded bg-surface-container-low text-secondary border border-secondary/30',
          )}
        >
          <span
            className={cm.cn('sb-icon flex h-4 w-4 items-center justify-center')}
            aria-hidden="true"
          >
            <span className="material-symbols-outlined">verified_user</span>
          </span>
          <span className={cm.cn('text-[11px] tracking-wider uppercase font-semibold')}>
            {t('login.badge', {}, { defaultValue: 'High-Trust Terminal' })}
          </span>
        </span>
      }
      headerAside={
        <>
          <AuthStatusPill />
          <span className={cm.cn('hidden md:flex items-center gap-2')}>
            <span className={cm.cn('hidden md:inline text-[13px] text-on-surface-variant')}>
              {t(
                'login.needAccount',
                { appName: APP_NAME },
                { defaultValue: 'Need an operator account?' },
              )}
            </span>
            <Link
              to="/signup"
              className={cm.cn(
                'text-sm font-semibold text-primary hover:text-secondary underline underline-offset-4 transition-colors',
              )}
            >
              {t('login.requestAccess', {}, { defaultValue: 'Request Access' })}
            </Link>
          </span>
        </>
      }
      footer={
        <>
          <span className="text-on-surface-variant">
            {t(
              'login.noAccount',
              { appName: APP_NAME },
              { defaultValue: 'New to {{appName}}?' },
            )}{' '}
          </span>
          <Link
            to="/signup"
            className={'-my-2 inline-block py-2 text-primary font-bold hover:underline'}
            data-mol-id="login-signup-link"
          >
            {t('login.signupLink', {}, { defaultValue: 'Create an account' })}
          </Link>
        </>
      }
      aside={
        <>
          {/* Live autonomous telephony card */}
          <div
            className={cm.cn(
              'bg-surface-container-low border border-outline-variant/50 rounded-xl p-6 relative overflow-hidden',
            )}
            data-mol-id="login-live-telephony"
          >
            <div
              className={cm.cn(
                'flex items-center justify-between pb-4 mb-4 border-b border-outline-variant/40 gap-2',
              )}
            >
              <div className={cm.cn('flex items-center gap-2')}>
                <span
                  className={cm.cn(
                    'sb-icon flex h-4 w-4 items-center justify-center text-secondary',
                  )}
                  aria-hidden="true"
                >
                  <span className="material-symbols-outlined">ring_volume</span>
                </span>
                <span
                  className={cm.cn(
                    'text-[11px] font-semibold text-primary uppercase tracking-wide',
                  )}
                >
                  {t('login.liveTelephony', {}, { defaultValue: 'Live Autonomous Telephony' })}
                </span>
              </div>
              <span
                className={cm.cn(
                  'text-[11px] px-2 py-0.5 rounded bg-surface-container text-primary font-mono whitespace-nowrap',
                )}
              >
                {t('login.activeLines', {}, { defaultValue: '38 Active Lines' })}
              </span>
            </div>

            {/* Real-time night call widget */}
            <div
              className={cm.cn(
                'bg-surface-container-lowest rounded-lg border border-outline-variant/60 p-4 sb-card-shadow mb-4',
              )}
            >
              <div
                className={cm.cn(
                  'flex items-center justify-between text-on-surface-variant mb-2.5 gap-2',
                )}
              >
                <div className={cm.cn('flex items-center gap-2')}>
                  <span className={cm.cn('text-[13px] font-semibold text-primary')}>
                    {t('login.callHotel', {}, { defaultValue: 'Le Saint-Germain Grand' })}
                  </span>
                  <span
                    className={cm.cn(
                      'text-[10px] bg-surface-container px-1.5 py-0.5 rounded text-primary',
                    )}
                  >
                    FR
                  </span>
                </div>
                <span className={cm.cn('text-[11px] text-on-surface-variant whitespace-nowrap')}>
                  {t('login.callTime', {}, { defaultValue: '02:14 AM CEST' })}
                </span>
              </div>
              {/* Waveform activity */}
              <div
                className={cm.cn(
                  'flex items-center gap-1 my-3 px-2 py-1.5 bg-surface-container-low rounded',
                )}
                aria-hidden="true"
              >
                {[1, 2, 3, 4, 1, 2, 3, 4].map((variant, i) => (
                  <div
                    key={i}
                    className={cm.cn(
                      `sb-wave-bar sb-wave-bar-${variant} h-4 w-1 bg-secondary rounded-full`,
                    )}
                  />
                ))}
                <span className={cm.cn('text-[10px] text-on-surface-variant ml-2')}>
                  {t(
                    'login.audioChannel',
                    {},
                    { defaultValue: 'Audio Channel: French (Native Accent)' },
                  )}
                </span>
              </div>
              <p className={cm.cn('text-[13px] text-on-surface-variant leading-relaxed')}>
                <strong className={cm.cn('text-primary font-medium')}>
                  {t('login.resolutionLabel', {}, { defaultValue: 'Resolution:' })}
                </strong>{' '}
                {t(
                  'login.resolutionBody',
                  {},
                  {
                    defaultValue:
                      'Suite Couronne late check-in request handled autonomously. Keycode dispatched via SMS & Opera PMS room folio ledger updated.',
                  },
                )}
              </p>
              <div
                className={cm.cn(
                  'mt-3 pt-2.5 border-t border-outline-variant/30 flex items-center justify-between text-[11px] gap-2',
                )}
              >
                <span className={cm.cn('text-secondary font-medium')}>
                  {t('login.confidence', {}, { defaultValue: 'Confidence: 99.4%' })}
                </span>
                <span className={cm.cn('text-on-surface-variant text-right')}>
                  {t('login.noEscalation', {}, { defaultValue: 'Zero Human Escalation Required' })}
                </span>
              </div>
            </div>

            {/* Hotelier quote */}
            <div className={cm.cn('p-4 rounded-lg bg-surface border border-outline-variant/30')}>
              <p className={cm.cn('sb-serif text-lg italic text-primary leading-snug')}>
                {t(
                  'login.quote',
                  {},
                  {
                    defaultValue:
                      '“Switchboard gives our front desk their evenings back. Not a single overnight call is lost.”',
                  },
                )}
              </p>
              <div className={cm.cn('mt-3 flex items-center gap-3')}>
                <div
                  className={cm.cn(
                    'w-7 h-7 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-bold text-[11px]',
                  )}
                  aria-hidden="true"
                >
                  AG
                </div>
                <div>
                  <span
                    className={cm.cn('block text-[13px] font-semibold text-primary leading-tight')}
                  >
                    {t('login.quoteName', {}, { defaultValue: 'Antoine Giraud' })}
                  </span>
                  <span className={cm.cn('block text-[11px] text-on-surface-variant')}>
                    {t(
                      'login.quoteRole',
                      {},
                      { defaultValue: 'General Manager, Hôtel Marais Monceau' },
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Compliance & security badges */}
          <div
            className={cm.cn(
              'p-5 rounded-xl border border-outline-variant/40 bg-surface-container-lowest flex flex-col gap-3',
            )}
          >
            <div className={cm.cn('flex items-center gap-2 text-primary')}>
              <span
                className={cm.cn('sb-icon flex h-5 w-5 items-center justify-center text-secondary')}
                aria-hidden="true"
              >
                <span className="material-symbols-outlined">security</span>
              </span>
              <span className={cm.cn('text-[13px] font-semibold')}>
                {t(
                  'login.securityTitle',
                  {},
                  { defaultValue: 'Hospitality-Grade Security Protocol' },
                )}
              </span>
            </div>
            <p className={cm.cn('text-[13px] text-on-surface-variant')}>
              {t(
                'login.securityBody',
                {},
                {
                  defaultValue:
                    'All overnight guest voice streams are transcribed in RAM with zero unencrypted audio storage. Directly integrated with PMS keycard systems.',
                },
              )}
            </p>
            <div className={cm.cn('flex flex-wrap gap-2 pt-1')}>
              {['PCI-DSS Level 1', 'GDPR & CCPA Compliant', '256-bit AES Audio Vault'].map(
                (badge, i) => (
                  <span
                    key={badge}
                    className={cm.cn(
                      'text-[10px] px-2 py-1 rounded bg-surface-container text-on-surface-variant border border-outline-variant/30',
                    )}
                  >
                    {t(
                      `login.compliance.${i}`,
                      {},
                      {
                        defaultValue: badge,
                      },
                    )}
                  </span>
                ),
              )}
            </div>
          </div>

          {/* Need help box */}
          <div
            className={cm.cn(
              'p-4 rounded-lg bg-surface-container-low border border-outline-variant/40 flex items-center justify-between gap-3',
            )}
          >
            <div className={cm.cn('flex items-center gap-3')}>
              <span
                className={cm.cn(
                  'sb-icon flex h-5 w-5 items-center justify-center text-on-surface-variant',
                )}
                aria-hidden="true"
              >
                <span className="material-symbols-outlined">support_agent</span>
              </span>
              <div>
                <span
                  className={cm.cn('block text-[13px] font-semibold text-primary leading-snug')}
                >
                  {t('login.helpTitle', {}, { defaultValue: 'Night Auditor Duty Hotline' })}
                </span>
                <span className={cm.cn('block text-xs text-on-surface-variant')}>
                  {t('login.helpBody', {}, { defaultValue: '24/7 dedicated engineering support' })}
                </span>
              </div>
            </div>
            <Link
              to="/#demo-simulator"
              className={cm.cn(
                'shrink-0 text-[11px] px-3 py-1.5 rounded border border-outline-variant hover:border-primary text-primary bg-surface-container-lowest transition-colors',
              )}
            >
              {t('login.contactDesk', {}, { defaultValue: 'Contact Desk' })}
            </Link>
          </div>
        </>
      }
    >
      <form
        onSubmit={handleSubmit}
        className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}
        aria-label={t('login.formLabel', {}, { defaultValue: 'Sign in form' })}
      >
        <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('login.emailLabel', {}, { defaultValue: 'Work Email / Operator ID' })}
          </span>
          <div className={cm.cn('relative')}>
            <span
              className={cm.cn(
                'absolute left-3 top-1/2 -translate-y-1/2 sb-icon flex h-4 w-4 items-center justify-center text-on-surface-variant pointer-events-none',
              )}
              aria-hidden="true"
            >
              <span className="material-symbols-outlined">badge</span>
            </span>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              data-mol-id="login-email"
              placeholder={t(
                'auth.passwordPlaceholderEmail',
                {},
                { defaultValue: 'you@example.com' },
              )}
              className={cm.cn(fieldClass, 'pl-10 pr-4 py-2.5')}
            />
          </div>
        </label>
        <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <div className={cm.flex({ align: 'center', justify: 'between' })}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('login.passwordLabel', {}, { defaultValue: 'Operator Security Password' })}
            </span>
            <Link
              to="/forgot-password"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                '-my-2 inline-block py-2 text-secondary hover:underline',
              )}
              data-mol-id="login-forgot-link"
            >
              {t('login.forgotLink', {}, { defaultValue: 'Forgot password?' })}
            </Link>
          </div>
          <div className={cm.cn('relative')}>
            <span
              className={cm.cn(
                'absolute left-3 top-1/2 -translate-y-1/2 sb-icon flex h-4 w-4 items-center justify-center text-on-surface-variant pointer-events-none',
              )}
              aria-hidden="true"
            >
              <span className="material-symbols-outlined">lock</span>
            </span>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              data-mol-id="login-password"
              placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
              className={cm.cn(fieldClass, 'pl-10 pr-10 py-2.5')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={
                showPassword
                  ? t('login.hidePassword', {}, { defaultValue: 'Hide password' })
                  : t('login.showPassword', {}, { defaultValue: 'Show password' })
              }
              className={cm.cn(
                'absolute right-2 top-1/2 -translate-y-1/2 sb-icon flex h-8 w-8 items-center justify-center text-on-surface-variant hover:text-primary transition-colors',
              )}
            >
              <span className="material-symbols-outlined">
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </label>

        {error ? (
          <p
            data-mol-id="login-error"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'rounded-xl bg-error/10 text-error border border-error/30',
            )}
          >
            {error.message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isLoggingIn}
          data-mol-id="login-submit"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('semibold'),
            cm.flex({ align: 'center', gap: 'sm', justify: 'center' }),
            'w-full rounded-lg bg-primary-container text-on-primary-container hover:bg-primary hover:text-on-primary transition-colors border border-primary-container shadow-sm disabled:opacity-60',
          )}
        >
          {isLoggingIn
            ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
            : t('login.submit', {}, { defaultValue: 'Sign in to Switchboard' })}
          <span
            className={cm.cn('sb-icon flex h-4 w-4 items-center justify-center')}
            aria-hidden="true"
          >
            <span className="material-symbols-outlined">arrow_forward</span>
          </span>
        </button>
      </form>

      <OAuthButtons />
    </SwitchboardAuthShell>
  )
}
