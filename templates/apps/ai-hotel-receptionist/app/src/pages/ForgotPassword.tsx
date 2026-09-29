import { useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthStatusPill, SwitchboardAuthShell } from '../components/SwitchboardAuthShell.js'

/**
 * Credential restoration — the Stitch forgot-password design: the reset form
 * card on the left (with the assurance bar beneath) and the operational
 * security rail on the right (duty protocol, high-trust testimonial,
 * acoustic & credential protocol, duty-desk support). Spec-pinned copy is
 * kept verbatim: #email, the /Send reset link/i submit that POSTs
 * /api/users/forgot-password, the "reset link is on its way" notice, and the
 * "Back to sign in" link.
 */
export function ForgotPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const {
    requestStatus: status,
    requestError: error,
    requestReset: forgotPassword,
  } = usePasswordReset()
  const {
    fields: authFormFields,
    setField: setAuthFormField,
    clear: clearAuthForm,
  } = useAuthFormState()
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const [sent, setSent] = useState(false)

  const isSending = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await forgotPassword({ email })
      clearAuthForm()
      setSent(true)
    } catch (_error) {
      /* Error tracked in hook state */
    }
  }

  const PROTOCOL_STEPS = [
    {
      key: 'dispatch',
      title: 'Encrypted Dispatch',
      body: '12-minute expiring cryptographic magic link sent to registered general manager contact and secondary audit mailbox.',
    },
    {
      key: 'handshake',
      title: 'Telephony Handshake',
      body: 'Optional voice verification code read by the autonomous night concierge to the desk phone extension.',
    },
    {
      key: 'ledger',
      title: 'Audit Ledger Logged',
      body: 'Zero-downtime key rotation recorded in your property\u2019s PCI-DSS compliant security folio with timestamped IP.',
    },
  ] as const

  const SECURITY_TRIO = [
    { icon: 'shield', key: 'pci', title: 'PCI-DSS Level 1', body: 'Tokenized' },
    { icon: 'password', key: 'zeroMaster', title: 'Zero Master', body: 'Storage Policy' },
    { icon: 'phonelink_ring', key: 'twoFa', title: 'Hardware 2FA', body: 'PBX Ring Ready' },
  ] as const

  const ASSURANCES = [
    { icon: 'verified_user', key: 'token', label: '256-Bit Hardware Token Rotation' },
    { icon: 'history_toggle_off', key: 'session', label: 'Session Invalidation: 12 Minutes' },
    { icon: 'key', key: 'footprint', label: 'Zero Master Password Footprint' },
  ] as const

  const fieldClass =
    'w-full bg-surface-container-lowest border border-outline-variant rounded-lg text-primary text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-secondary/30'

  return (
    <SwitchboardAuthShell
      eyebrow={t('forgotPassword.eyebrow', {}, { defaultValue: 'Account recovery' })}
      heading={t(
        'forgotPassword.heading',
        {},
        { defaultValue: 'Restore access to your front desk switchboard.' },
      )}
      subheading={t(
        'forgotPassword.subheading',
        {},
        {
          defaultValue:
            'Enter your registered property work email or operator ID. We will dispatch an encrypted reset token and direct SMS verification to your property duty line.',
        },
      )}
      badge={
        <span
          className={cm.cn(
            'inline-flex items-center gap-2 px-3 py-1 rounded bg-surface-container-low border border-outline-variant/60 text-secondary',
          )}
        >
          <span
            className={cm.cn('sb-icon flex h-4 w-4 items-center justify-center')}
            aria-hidden="true"
          >
            <span className="material-symbols-outlined">lock_reset</span>
          </span>
          <span className={cm.cn('text-[11px] font-semibold tracking-wider uppercase')}>
            {t(
              'forgotPassword.badge',
              {},
              { defaultValue: 'Credential restoration · Hardware 2FA verified' },
            )}
          </span>
        </span>
      }
      headerAside={
        <>
          <AuthStatusPill />
          <span className={cm.cn('hidden md:flex items-center gap-1')}>
            <span className={cm.cn('hidden sm:inline text-[13px] text-on-surface-variant')}>
              {t('forgotPassword.rememberPrompt', {}, { defaultValue: 'Remember your password?' })}
            </span>
            <Link
              to="/login"
              className={cm.cn(
                'text-sm font-semibold text-primary hover:text-secondary underline decoration-outline-variant underline-offset-4 transition-colors',
              )}
            >
              {t('forgotPassword.signInLink', {}, { defaultValue: 'Sign In' })}
            </Link>
          </span>
        </>
      }
      footer={
        <Link
          to="/login"
          className={'-my-2 inline-block py-2 text-primary font-bold hover:underline'}
          data-mol-id="forgot-back-link"
        >
          {t('forgotPassword.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
        </Link>
      }
      aside={
        <>
          {/* Immediate duty protocol */}
          <div
            className={cm.cn(
              'bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-6 md:p-8 sb-card-shadow',
            )}
          >
            <div
              className={cm.cn(
                'flex items-center justify-between pb-4 mb-5 border-b border-outline-variant/40 gap-2',
              )}
            >
              <h2 className={cm.cn('sb-serif text-xl text-primary')}>
                {t('forgotPassword.protocolTitle', {}, { defaultValue: 'Immediate Duty Protocol' })}
              </h2>
              <span
                className={cm.cn(
                  'text-[11px] bg-surface-container px-2 py-0.5 rounded text-on-surface-variant whitespace-nowrap',
                )}
              >
                {t('forgotPassword.sla', {}, { defaultValue: 'SLA < 90s' })}
              </span>
            </div>
            <ol className={cm.cn('relative border-l border-outline-variant/60 ml-2 space-y-6')}>
              {PROTOCOL_STEPS.map((step, i) => (
                <li key={step.key} className={cm.cn('ml-6')}>
                  <span
                    className={cm.cn(
                      'absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full bg-surface-container-lowest border border-secondary text-secondary text-[11px] font-semibold',
                    )}
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                  <h3 className={cm.cn('text-sm font-semibold text-primary mb-1')}>
                    {t(`forgotPassword.steps.${step.key}.title`, {}, { defaultValue: step.title })}
                  </h3>
                  <p className={cm.cn('text-[13px] text-on-surface-variant')}>
                    {t(`forgotPassword.steps.${step.key}.body`, {}, { defaultValue: step.body })}
                  </p>
                </li>
              ))}
            </ol>
          </div>

          {/* High-trust testimonial */}
          <div
            className={cm.cn(
              'bg-surface-container-low border border-outline-variant/60 rounded-xl p-6 md:p-7 relative overflow-hidden',
            )}
          >
            <span
              className={cm.cn(
                'sb-icon flex h-16 w-16 items-center justify-center absolute -right-3 -bottom-3 text-surface-container-high text-6xl pointer-events-none select-none',
              )}
              aria-hidden="true"
            >
              <span className="material-symbols-outlined">format_quote</span>
            </span>
            <div className={cm.cn('relative z-10')}>
              <p className={cm.cn('sb-serif text-lg italic text-primary leading-relaxed mb-4')}>
                {t(
                  'forgotPassword.quote',
                  {},
                  {
                    defaultValue:
                      '“During a midnight front desk handover, Switchboard emergency recovery restored our ledger link in under two minutes without waking the general manager.”',
                  },
                )}
              </p>
              <div
                className={cm.cn('flex items-center gap-3 pt-3 border-t border-outline-variant/40')}
              >
                <div
                  className={cm.cn(
                    'w-8 h-8 rounded-full bg-primary-container text-surface-bright flex items-center justify-center text-[11px] font-semibold',
                  )}
                  aria-hidden="true"
                >
                  AG
                </div>
                <div>
                  <p className={cm.cn('text-sm font-semibold text-primary')}>
                    {t('forgotPassword.quoteName', {}, { defaultValue: 'Antoine Giraud' })}
                  </p>
                  <p className={cm.cn('text-[13px] text-on-surface-variant')}>
                    {t(
                      'forgotPassword.quoteRole',
                      {},
                      {
                        defaultValue:
                          'General Manager, Hôtel Saint-Germain Grand (68 rooms, Paris)',
                      },
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Acoustic & credential protocol */}
          <div
            className={cm.cn(
              'bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-6 sb-card-shadow',
            )}
          >
            <h3
              className={cm.cn('text-xs font-semibold text-primary tracking-wider uppercase mb-3')}
            >
              {t(
                'forgotPassword.securityTitle',
                {},
                { defaultValue: 'Acoustic & Credential Protocol' },
              )}
            </h3>
            <div className={cm.cn('grid grid-cols-1 sm:grid-cols-3 gap-2.5')}>
              {SECURITY_TRIO.map((item) => (
                <div
                  key={item.key}
                  className={cm.cn(
                    'p-3 bg-surface-container-low rounded border border-outline-variant/60 text-center',
                  )}
                >
                  <span
                    className={cm.cn(
                      'sb-icon flex h-5 w-5 items-center justify-center text-secondary mx-auto mb-1',
                    )}
                    aria-hidden="true"
                  >
                    <span className="material-symbols-outlined">{item.icon}</span>
                  </span>
                  <span
                    className={cm.cn('block text-[11px] font-semibold text-primary leading-tight')}
                  >
                    {t(
                      `forgotPassword.security.${item.key}.title`,
                      {},
                      { defaultValue: item.title },
                    )}
                  </span>
                  <span className={cm.cn('block text-[11px] text-on-surface-variant')}>
                    {t(`forgotPassword.security.${item.key}.body`, {}, { defaultValue: item.body })}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Duty desk support */}
          <div
            className={cm.cn(
              'p-5 rounded-xl border border-secondary/30 bg-surface-container-low sb-card-shadow flex items-center justify-between gap-4',
            )}
          >
            <div className={cm.cn('flex items-start gap-3')}>
              <div
                className={cm.cn(
                  'sb-icon flex h-10 w-10 items-center justify-center rounded bg-secondary/10 text-secondary shrink-0',
                )}
                aria-hidden="true"
              >
                <span className="material-symbols-outlined">headset_mic</span>
              </div>
              <div>
                <h4 className={cm.cn('text-sm font-semibold text-primary')}>
                  {t(
                    'forgotPassword.supportTitle',
                    {},
                    { defaultValue: 'Duty Auditor Support Hotline' },
                  )}
                </h4>
                <p className={cm.cn('text-[13px] text-on-surface-variant')}>
                  {t(
                    'forgotPassword.supportBody',
                    {},
                    {
                      defaultValue:
                        'Available 24/7 for shift supervisor emergency phone bypass authorization.',
                    },
                  )}
                </p>
              </div>
            </div>
            <Link
              to="/#demo-simulator"
              className={cm.cn(
                'shrink-0 px-3.5 py-2 rounded-lg border border-secondary text-primary text-[13px] font-semibold hover:bg-secondary/10 transition-colors',
              )}
            >
              {t('forgotPassword.contactDispatch', {}, { defaultValue: 'Contact Dispatch' })}
            </Link>
          </div>
        </>
      }
    >
      {sent ? (
        <p
          data-mol-id="forgot-sent-notice"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.textSize('sm'),
            'rounded-xl bg-success/10 text-success border border-success/30',
          )}
        >
          {t(
            'forgotPassword.sentNotice',
            {},
            { defaultValue: 'If that address has an account, a reset link is on its way.' },
          )}
        </p>
      ) : (
        <form
          onSubmit={handleSubmit}
          className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}
          aria-label={t(
            'forgotPassword.formLabel',
            {},
            { defaultValue: 'Request reset link form' },
          )}
        >
          <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('forgotPassword.emailLabel', {}, { defaultValue: 'Work Email or Operator ID' })}
            </span>
            <div className={cm.cn('relative')}>
              <span
                className={cm.cn(
                  'absolute left-3 top-1/2 -translate-y-1/2 sb-icon flex h-4 w-4 items-center justify-center text-on-surface-variant pointer-events-none',
                )}
                aria-hidden="true"
              >
                <span className="material-symbols-outlined">mail</span>
              </span>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                data-mol-id="forgot-email"
                placeholder={t(
                  'auth.passwordPlaceholderEmail',
                  {},
                  { defaultValue: 'you@example.com' },
                )}
                className={cm.cn(fieldClass, 'pl-10 pr-4 py-3')}
              />
            </div>
          </label>

          {error ? (
            <p
              data-mol-id="forgot-error"
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
            disabled={isSending}
            data-mol-id="forgot-submit"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              cm.flex({ align: 'center', gap: 'sm', justify: 'center' }),
              'w-full rounded-lg bg-primary text-surface-bright hover:bg-primary-container transition-all duration-150 border border-primary shadow-sm disabled:opacity-60 active:scale-[0.99]',
            )}
          >
            {isSending
              ? t('forgotPassword.sendingEllipsis', {}, { defaultValue: 'Sending…' })
              : t(
                  'forgotPassword.sendResetLink',
                  {},
                  { defaultValue: 'Send reset link & security PIN' },
                )}
            <span
              className={cm.cn('sb-icon flex h-4 w-4 items-center justify-center')}
              aria-hidden="true"
            >
              <span className="material-symbols-outlined">arrow_forward</span>
            </span>
          </button>

          {/* Micro assurance bar */}
          <div
            className={cm.cn(
              'pt-4 border-t border-outline-variant/40 flex flex-wrap items-center justify-between gap-3 text-on-surface-variant',
            )}
          >
            {ASSURANCES.map((a) => (
              <span key={a.key} className={cm.cn('flex items-center gap-2 text-[11px]')}>
                <span
                  className={cm.cn(
                    'sb-icon flex h-4 w-4 items-center justify-center text-secondary',
                  )}
                  aria-hidden="true"
                >
                  <span className="material-symbols-outlined">{a.icon}</span>
                </span>
                {t(`forgotPassword.assurances.${a.key}`, {}, { defaultValue: a.label })}
              </span>
            ))}
          </div>
        </form>
      )}
    </SwitchboardAuthShell>
  )
}
