import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Read-only security summary.
 *
 * The original design had three interactive controls (Enable 2FA,
 * per-session Revoke buttons, Sign-out-all-other-sessions) that all
 * pointed at API routes that did not exist in this scaffold —
 * `POST /api/auth/2fa/enable`, `DELETE /api/sessions/:id`,
 * `POST /api/sessions/revoke-all`. Wiring real session-tracking and a
 * 2FA enrollment flow is out of scope for the helpdesk flagship; until
 * a Molecule-bond-backed implementation exists we render a security
 * summary instead of buttons that 404 and pretend to do work.
 *
 * The auth bond already enforces a strong password policy, the JWT is
 * stored in localStorage and rotated on logout, and password reset
 * flows are wired through Mailgun — so the page accurately reflects
 * the security posture of a freshly-scaffolded helpdesk.
 */
function SettingsSecuritySection() {
  const { t } = useTranslation()
  const cm = getClassMap()

  return (
    <section
      data-mol-id="settings-security"
      className={cm.cn(
        cm.sp('p', 8),
        'bg-surface-container-lowest rounded-xl shadow-[0_4px_20px_-2px_rgba(19,27,46,0.04),0_12px_40px_-8px_rgba(19,27,46,0.08)]',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 8))}>
        <h3 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('settingsSecurity.title', {}, { defaultValue: 'Security & Access' })}
        </h3>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.roundedFull,
            'bg-success-light text-success',
          )}
        >
          {t('settingsSecurity.secureConnection', {}, { defaultValue: 'Secure Connection' })}
        </span>
      </div>
      <ul className={cm.stack(4)}>
        <li
          className={cm.cn(
            cm.flex({ align: 'start', gap: 4 }),
            cm.sp('p', 4),
            'rounded-lg bg-surface-container-low/40',
          )}
          data-mol-id="security-summary-password"
        >
          <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined text-primary')}>
            lock
          </span>
          <div>
            <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
              {t(
                'settingsSecurity.passwordSummaryTitle',
                {},
                { defaultValue: 'Password authentication' },
              )}
            </p>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'settingsSecurity.passwordSummaryBody',
                {},
                {
                  defaultValue:
                    'Reset your password from /forgot-password — a single-use link arrives via Mailgun.',
                },
              )}
            </p>
          </div>
        </li>
        <li
          className={cm.cn(
            cm.flex({ align: 'start', gap: 4 }),
            cm.sp('p', 4),
            'rounded-lg bg-surface-container-low/40',
          )}
          data-mol-id="security-summary-session"
        >
          <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined text-primary')}>
            shield
          </span>
          <div>
            <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
              {t(
                'settingsSecurity.sessionSummaryTitle',
                {},
                { defaultValue: 'Session management' },
              )}
            </p>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'settingsSecurity.sessionSummaryBody',
                {},
                {
                  defaultValue:
                    'Sign-out from this device clears the JWT locally; a server-side session list is on the roadmap.',
                },
              )}
            </p>
          </div>
        </li>
      </ul>
    </section>
  )
}

export default SettingsSecuritySection
export { SettingsSecuritySection }
