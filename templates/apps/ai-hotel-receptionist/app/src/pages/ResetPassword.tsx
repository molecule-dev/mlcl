import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthStatusPill, SwitchboardAuthShell } from '../components/SwitchboardAuthShell.js'

/**
 * Credential update — the Stitch reset-password design: the security form
 * card (new password + live strength checklist + confirm) on the left and
 * the credential-protocol rail on the right. Spec-pinned copy is kept
 * verbatim: #password/#confirmPassword ids, the disabled-without-token
 * /Reset password/i submit, the "Passwords do not match" inline flag, and
 * the "Back to sign in" link.
 */
export function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const {
    confirmStatus: status,
    confirmError: error,
    confirmReset: resetPassword,
  } = usePasswordReset()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [mismatch, setMismatch] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const token = searchParams.get('token') ?? ''
  const isResetting = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setMismatch(true)
      return
    }
    setMismatch(false)
    try {
      await resetPassword({ token, password })
      navigate('/login', { replace: true })
    } catch (_error) {
      /* Error tracked in hook state */
    }
  }

  // Live strength checklist — the design's entropy-assessment card, wired to
  // the actual field value instead of a static mock.
  const criteria = [
    {
      key: 'length',
      label: 'Minimum 12 characters',
      met: password.length >= 12,
    },
    {
      key: 'case',
      label: 'Uppercase & lowercase glyphs',
      met: /[a-z]/.test(password) && /[A-Z]/.test(password),
    },
    {
      key: 'numeric',
      label: 'Numeric or acoustic sequence',
      met: /\d/.test(password) || /[^A-Za-z0-9]/.test(password),
    },
    {
      key: 'match',
      label: 'Both entries match',
      met: password.length > 0 && password === confirm,
    },
  ]
  const metCount = criteria.filter((c) => c.met).length

  const PROTOCOL_STEPS = [
    {
      key: 'rotation',
      title: 'Key Rotation Handshake',
      body: 'Instant synchronization with active Opera Cloud, Mews, or Cloudbeds ledger locks without disrupting ongoing reservations.',
    },
    {
      key: 'verification',
      title: 'Telephony Line Verification',
      body: 'Hardware 2FA ring sent to desk extension to acknowledge shift credential change before guest caller transfer activation.',
    },
    {
      key: 'ledger',
      title: 'Immutable Audit Ledger',
      body: 'Cryptographically logged under PCI-DSS Level 1 hotel compliance with operator IP, device fingerprint, and physical timestamp.',
    },
  ] as const

  const STANDARDS = [
    {
      icon: 'policy',
      key: 'pci',
      title: 'PCI-DSS Level 1 (Tokenized)',
      body: 'Cardholder vault stays sealed during reset',
    },
    {
      icon: 'key_off',
      key: 'zeroMaster',
      title: 'Zero Master Storage Policy',
      body: 'No central admin plaintext access',
    },
    {
      icon: 'ring_volume',
      key: 'twoFa',
      title: 'Hardware 2FA (PBX Ring Ready)',
      body: 'Desk phone audible confirmation token',
    },
  ] as const

  const TRUST_TAGS = [
    { icon: 'lock_reset', key: 'rotation', label: '256-Bit Token Rotation' },
    { icon: 'timer', key: 'invalidation', label: 'Session Invalidation: 12m' },
    { icon: 'fingerprint', key: 'footprint', label: 'Zero Master Footprint' },
  ] as const

  const fieldClass =
    'w-full bg-surface-container-lowest border border-outline-variant rounded text-primary text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-secondary/30'

  return (
    <SwitchboardAuthShell
      eyebrow={t('resetPassword.eyebrow', {}, { defaultValue: 'Account recovery' })}
      heading={t(
        'resetPassword.heading',
        {},
        { defaultValue: 'Set new operator security password.' },
      )}
      subheading={t(
        'resetPassword.subheading',
        {},
        {
          defaultValue:
            'Establish a new high-trust passkey for your front desk workstation and PMS integration folio.',
        },
      )}
      badge={
        <span
          className={cm.cn(
            'inline-flex items-center gap-2 px-2.5 py-1 rounded bg-secondary-fixed/30 border border-secondary/20 text-on-secondary-fixed',
          )}
        >
          <span
            className={cm.cn('sb-icon flex h-4 w-4 items-center justify-center')}
            aria-hidden="true"
          >
            <span className="material-symbols-outlined">verified_user</span>
          </span>
          <span className={cm.cn('text-[11px] font-semibold tracking-wider uppercase')}>
            {t(
              'resetPassword.badge',
              {},
              { defaultValue: 'Credential update · Hardware 2FA authorized' },
            )}
          </span>
        </span>
      }
      headerAside={
        <>
          <AuthStatusPill />
          <Link
            to="/login"
            className={cm.cn(
              'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface border border-secondary text-primary text-[13px] font-semibold hover:bg-secondary/10 transition-colors duration-150',
            )}
          >
            <span
              className={cm.cn('sb-icon flex h-4 w-4 items-center justify-center')}
              aria-hidden="true"
            >
              <span className="material-symbols-outlined">shield_person</span>
            </span>
            <span>
              {t('resetPassword.operatorPortal', {}, { defaultValue: 'Operator Portal' })}
            </span>
          </Link>
        </>
      }
      footer={
        <Link
          to="/login"
          className={'-my-2 inline-block py-2 text-primary font-bold hover:underline'}
          data-mol-id="reset-back-link"
        >
          {t('forgotPassword.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
        </Link>
      }
      aside={
        <>
          {/* Credential security protocol timeline */}
          <div
            className={cm.cn(
              'bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-6 lg:p-7 sb-card-shadow',
            )}
          >
            <div
              className={cm.cn(
                'flex items-center gap-2 mb-4 pb-3 border-b border-outline-variant/40',
              )}
            >
              <span
                className={cm.cn('sb-icon flex h-5 w-5 items-center justify-center text-secondary')}
                aria-hidden="true"
              >
                <span className="material-symbols-outlined">shield</span>
              </span>
              <h2 className={cm.cn('sb-serif text-xl text-primary')}>
                {t(
                  'resetPassword.protocolTitle',
                  {},
                  { defaultValue: 'Credential Security Protocol' },
                )}
              </h2>
            </div>
            <p className={cm.cn('text-[13px] text-on-surface-variant mb-6')}>
              {t(
                'resetPassword.protocolBody',
                {},
                {
                  defaultValue:
                    'Switchboard guarantees zero-downtime receptionist continuity during operator credential rollouts.',
                },
              )}
            </p>
            <div className={cm.cn('space-y-6')}>
              {PROTOCOL_STEPS.map((step, i) => (
                <div key={step.key} className={cm.cn('flex items-start gap-4')}>
                  <div
                    className={cm.cn(
                      'w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 border',
                      i === 0
                        ? 'bg-primary text-on-primary border-primary'
                        : i === 1
                          ? 'bg-secondary text-on-secondary border-secondary'
                          : 'bg-surface-container-high text-primary border-outline-variant/60',
                    )}
                    aria-hidden="true"
                  >
                    {i + 1}
                  </div>
                  <div className={cm.cn('space-y-1')}>
                    <h3 className={cm.cn('text-sm font-semibold text-primary')}>
                      {t(`resetPassword.steps.${step.key}.title`, {}, { defaultValue: step.title })}
                    </h3>
                    <p className={cm.cn('text-[13px] text-on-surface-variant')}>
                      {t(`resetPassword.steps.${step.key}.body`, {}, { defaultValue: step.body })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hospitality standards */}
          <div
            className={cm.cn(
              'bg-surface-container-low border border-outline-variant/60 rounded-xl p-6',
            )}
          >
            <h3 className={cm.cn('sb-serif text-xl text-primary mb-2')}>
              {t('resetPassword.standardsTitle', {}, { defaultValue: 'Hospitality Standards' })}
            </h3>
            <p className={cm.cn('text-[13px] text-on-surface-variant mb-5')}>
              {t(
                'resetPassword.standardsBody',
                {},
                {
                  defaultValue:
                    'Designed for independently owned boutique assets demanding uncompromising luxury discretion.',
                },
              )}
            </p>
            <div className={cm.cn('grid grid-cols-1 gap-3.5')}>
              {STANDARDS.map((item) => (
                <div
                  key={item.key}
                  className={cm.cn(
                    'p-3 bg-surface-container-lowest rounded border border-outline-variant/40 flex items-center gap-3',
                  )}
                >
                  <div
                    className={cm.cn(
                      'sb-icon flex h-9 w-9 items-center justify-center rounded bg-secondary-fixed/30 text-secondary shrink-0',
                    )}
                    aria-hidden="true"
                  >
                    <span className="material-symbols-outlined">{item.icon}</span>
                  </div>
                  <div>
                    <p className={cm.cn('text-[13px] font-medium text-primary')}>
                      {t(
                        `resetPassword.standards.${item.key}.title`,
                        {},
                        { defaultValue: item.title },
                      )}
                    </p>
                    <p className={cm.cn('text-xs text-on-surface-variant')}>
                      {t(
                        `resetPassword.standards.${item.key}.body`,
                        {},
                        { defaultValue: item.body },
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Duty auditor support */}
          <div
            className={cm.cn(
              'bg-primary text-surface rounded-xl p-6 lg:p-7 sb-card-shadow-lg relative overflow-hidden',
            )}
          >
            <div
              className={cm.cn(
                'absolute -right-6 -bottom-6 w-32 h-32 bg-secondary/10 rounded-full blur-2xl pointer-events-none',
              )}
              aria-hidden="true"
            />
            <div className={cm.cn('flex items-center gap-3 mb-3')}>
              <div
                className={cm.cn(
                  'sb-icon flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-on-secondary',
                )}
                aria-hidden="true"
              >
                <span className="material-symbols-outlined">support_agent</span>
              </div>
              <h3 className={cm.cn('sb-serif text-xl text-surface font-medium')}>
                {t('resetPassword.supportTitle', {}, { defaultValue: 'Duty Auditor Support' })}
              </h3>
            </div>
            <p className={cm.cn('text-[13px] text-on-primary mb-6 leading-relaxed')}>
              {t(
                'resetPassword.supportBody',
                {},
                {
                  defaultValue:
                    'Locked out of the front desk workstation mid-shift? Our dedicated night engineer dispatch is on standby 24/7 for supervisor telephone bypass.',
                },
              )}
            </p>
            <div
              className={cm.cn(
                'flex items-center justify-between gap-4 pt-2 border-t border-surface/20',
              )}
            >
              <div>
                <p className={cm.cn('text-[11px] text-on-primary uppercase tracking-wide')}>
                  {t('resetPassword.emergencyLine', {}, { defaultValue: 'Emergency Line' })}
                </p>
                <p className={cm.cn('font-mono text-sm text-surface font-semibold')}>
                  +33 (0)1 89 40 22 10
                </p>
              </div>
              <Link
                to="/#demo-simulator"
                className={cm.cn(
                  'px-3.5 py-2 rounded bg-surface text-primary text-[13px] font-semibold hover:bg-surface-container-high transition-colors',
                )}
              >
                {t('forgotPassword.contactDispatch', {}, { defaultValue: 'Contact Dispatch' })}
              </Link>
            </div>
          </div>
        </>
      }
    >
      <form
        onSubmit={handleSubmit}
        className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}
        aria-label={t('resetPassword.formLabel', {}, { defaultValue: 'Set new password form' })}
      >
        <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('resetPassword.passwordLabel', {}, { defaultValue: 'New Security Password' })}
          </span>
          <div className={cm.cn('relative')}>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
              data-mol-id="reset-password"
              placeholder={t(
                'resetPassword.newPlaceholder',
                {},
                { defaultValue: 'Enter 12+ characters…' },
              )}
              className={cm.cn(fieldClass, 'px-3.5 pr-10 py-3')}
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
          <span className={cm.cn('text-xs text-on-surface-variant')}>
            {t(
              'resetPassword.passwordHint',
              {},
              {
                defaultValue:
                  'Avoid public shift passphrases; this key encrypts room folio overrides and guest vault tokens.',
              },
            )}
          </span>
        </label>

        {/* Strength checklist */}
        <div
          className={cm.cn('p-4 rounded-lg bg-surface border border-outline-variant/50 space-y-3')}
          data-mol-id="reset-strength"
        >
          <div className={cm.cn('flex items-center justify-between')}>
            <span
              className={cm.cn(
                'text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant',
              )}
            >
              {t('resetPassword.entropyLabel', {}, { defaultValue: 'Entropy Assessment' })}
            </span>
            <span className={cm.cn('text-[11px] text-on-surface-variant font-mono')}>
              {metCount}/4
            </span>
          </div>
          <div className={cm.cn('grid grid-cols-4 gap-1.5 h-1.5')} aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={cm.cn(
                  'rounded-full',
                  i < metCount ? 'bg-secondary' : 'bg-surface-container-high',
                )}
              />
            ))}
          </div>
          <ul className={cm.cn('grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[13px]')}>
            {criteria.map((c) => (
              <li
                key={c.key}
                className={cm.cn(
                  'flex items-center gap-2',
                  c.met ? 'text-success' : 'text-on-surface-variant',
                )}
              >
                <span
                  className={cm.cn('sb-icon flex h-4 w-4 items-center justify-center shrink-0')}
                  aria-hidden="true"
                >
                  <span className="material-symbols-outlined">
                    {c.met ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                </span>
                <span>{t(`resetPassword.criteria.${c.key}`, {}, { defaultValue: c.label })}</span>
              </li>
            ))}
          </ul>
        </div>

        <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('resetPassword.confirmLabel', {}, { defaultValue: 'Confirm New Security Password' })}
          </span>
          <div className={cm.cn('relative')}>
            <input
              id="confirmPassword"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
              data-mol-id="reset-confirm-password"
              placeholder={t(
                'resetPassword.confirmPlaceholder',
                {},
                { defaultValue: 'Re-enter security password…' },
              )}
              className={cm.cn(fieldClass, 'px-3.5 pr-10 py-3')}
            />
            {confirm.length > 0 ? (
              <span
                className={cm.cn(
                  'absolute right-3 top-1/2 -translate-y-1/2 sb-icon flex h-4 w-4 items-center justify-center',
                  password === confirm ? 'text-success' : 'text-on-surface-variant',
                )}
                aria-hidden="true"
              >
                <span className="material-symbols-outlined">
                  {password === confirm ? 'verified' : 'rule'}
                </span>
              </span>
            ) : null}
          </div>
        </label>

        {mismatch ? (
          <p
            data-mol-id="reset-mismatch"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'rounded-xl bg-error/10 text-error border border-error/30',
            )}
          >
            {t('auth.signup.passwordMismatch', {}, { defaultValue: 'Passwords do not match' })}
          </p>
        ) : null}

        {error ? (
          <p
            data-mol-id="reset-error"
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
          disabled={isResetting || token === ''}
          data-mol-id="reset-submit"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('semibold'),
            cm.flex({ align: 'center', gap: 'sm', justify: 'center' }),
            'w-full rounded-lg bg-primary text-surface-bright hover:bg-primary-container transition-all duration-150 border border-primary shadow-sm disabled:opacity-60',
          )}
        >
          {isResetting
            ? t('resetPassword.resettingEllipsis', {}, { defaultValue: 'Resetting…' })
            : t('resetPassword.resetButton', {}, { defaultValue: 'Reset password' })}
          <span
            className={cm.cn('sb-icon flex h-4 w-4 items-center justify-center')}
            aria-hidden="true"
          >
            <span className="material-symbols-outlined">arrow_forward</span>
          </span>
        </button>

        {/* Trust anchor tags */}
        <div className={cm.cn('grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2')}>
          {TRUST_TAGS.map((tag) => (
            <div
              key={tag.key}
              className={cm.cn(
                'px-3 py-2.5 rounded bg-surface-container-low border border-outline-variant/40 flex items-center gap-2',
              )}
            >
              <span
                className={cm.cn(
                  'sb-icon flex h-4 w-4 items-center justify-center text-secondary shrink-0',
                )}
                aria-hidden="true"
              >
                <span className="material-symbols-outlined">{tag.icon}</span>
              </span>
              <span className={cm.cn('text-[11px] text-on-surface-variant')}>
                {t(`resetPassword.trust.${tag.key}`, {}, { defaultValue: tag.label })}
              </span>
            </div>
          ))}
        </div>
      </form>
    </SwitchboardAuthShell>
  )
}
