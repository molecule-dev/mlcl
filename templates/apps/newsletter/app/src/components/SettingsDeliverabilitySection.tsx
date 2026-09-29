import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface Guardrail {
  id: string
  icon: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
}

/** The reader-privacy guardrails (design: Reader Privacy & Ethical Guardrails). */
const GUARDRAILS: Guardrail[] = [
  {
    id: 'pixels',
    icon: 'visibility_off',
    titleKey: 'settings.guardrails.pixels.title',
    titleDefault: 'Zero Open-Tracking Pixels',
    bodyKey: 'settings.guardrails.pixels.body',
    bodyDefault:
      'No invisible 1×1 GIF beacons in your dispatches. Open rates are estimated from pseudonymous, per-send records instead of intrusive client telemetry.',
  },
  {
    id: 'relay',
    icon: 'link_off',
    titleKey: 'settings.guardrails.relay.title',
    titleDefault: 'Clean Link Relay',
    bodyKey: 'settings.guardrails.relay.body',
    bodyDefault:
      'The links you publish reach readers exactly as you wrote them — no UTM tags, click IDs, or tracking parameters are injected on the way through.',
  },
  {
    id: 'unsubscribe',
    icon: 'unsubscribe',
    titleKey: 'settings.guardrails.unsubscribe.title',
    titleDefault: '1-Click Native Unsubscribe',
    bodyKey: 'settings.guardrails.unsubscribe.body',
    bodyDefault:
      'Every dispatch carries the one-click unsubscribe header (RFC 8058). Prevents spam reports and respects subscriber autonomy immediately.',
  },
  {
    id: 'archive',
    icon: 'public',
    titleKey: 'settings.guardrails.archive.title',
    titleDefault: 'Public Web Archive & Clean Permalinks',
    bodyKey: 'settings.guardrails.archive.body',
    bodyDefault:
      'Every published edition also lives on your public archive as a permanent, reader-mode-friendly page — no login walls, no interstitials.',
  },
]

interface DnsRow {
  id: string
  recordKey: string
  recordDefault: string
  valueKey: string
  valueDefault: string
  statusKey: string
  statusDefault: string
}

/** The sending-identity records (design: Active DNS Handshakes). */
const DNS_ROWS: DnsRow[] = [
  {
    id: 'dkim',
    recordKey: 'settings.deliverability.dkim.record',
    recordDefault: 'DKIM',
    valueKey: 'settings.deliverability.dkim.value',
    valueDefault: 'Cryptographic signing on every outbound dispatch',
    statusKey: 'settings.deliverability.dkim.status',
    statusDefault: 'Platform-managed',
  },
  {
    id: 'spf',
    recordKey: 'settings.deliverability.spf.record',
    recordDefault: 'SPF',
    valueKey: 'settings.deliverability.spf.value',
    valueDefault: 'Authorized sending infrastructure for your publication',
    statusKey: 'settings.deliverability.spf.status',
    statusDefault: 'Platform-managed',
  },
  {
    id: 'dmarc',
    recordKey: 'settings.deliverability.dmarc.record',
    recordDefault: 'DMARC',
    valueKey: 'settings.deliverability.dmarc.value',
    valueDefault: 'Alignment policy shielding your byline against spoofing',
    statusKey: 'settings.deliverability.dmarc.status',
    statusDefault: 'Platform-managed',
  },
]

/**
 * Settings — sending identity + reader-privacy panels (design: "Sending
 * Domain & DKIM / DMARC" and "Reader Privacy & Ethical Guardrails").
 *
 * Both panels are informational: in this template the sending identity is
 * provisioned by the platform (custom root domains attach via the billing
 * tier), and the guardrails are architecture, not toggles — so there is
 * deliberately nothing to save here.
 */
export function SettingsDeliverabilitySection() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <>
      {/* Sending Domain & DKIM / DMARC */}
      <section
        data-mol-id="settings-deliverability-section"
        className={cm.cn(
          cm.grid({ cols: 1, gap: 'none' }),
          'md:grid-cols-12 items-start gap-x-10 gap-y-6',
        )}
      >
        <div className={cm.cn('md:col-span-4')}>
          <h3 className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'), 'font-headline')}>
            {t(
              'settings.deliverability.title',
              {},
              { defaultValue: 'Sending Domain & DKIM / DMARC' },
            )}
          </h3>
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('mt', 2),
              'text-on-surface-variant font-label',
            )}
          >
            {t(
              'settings.deliverability.subhead',
              {},
              {
                defaultValue:
                  'Cryptographic signing ensures maximum inbox deliverability and shields your byline against spoofing.',
              },
            )}
          </p>
        </div>
        <div
          className={cm.cn(
            cm.sp('p', 8),
            'md:col-span-8 bg-surface-container-lowest rounded-xl editorial-shadow',
          )}
        >
          <div className={cm.cn(cm.flex({ justify: 'between', align: 'center' }), cm.sp('mb', 5))}>
            <span
              className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}
            >
              {t(
                'settings.deliverability.status',
                {},
                { defaultValue: 'Authenticated & DKIM validated' },
              )}
            </span>
            <span
              className={cm.cn(
                'inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-fixed text-primary',
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
              )}
            >
              <span className={cm.fv5b245ffa} aria-hidden>
                verified
              </span>
              {t('settings.deliverability.active', {}, { defaultValue: 'Active' })}
            </span>
          </div>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mb', 5), 'text-on-surface-variant')}>
            {t(
              'settings.deliverability.body',
              {},
              {
                defaultValue:
                  'Every dispatch leaves through the platform’s warmed sending infrastructure. Custom root domains with their own DKIM / DMARC keys attach from the Independent tier upward — the records below are provisioned for you.',
              },
            )}
          </p>
          <ul className={cm.stack(3)}>
            {DNS_ROWS.map((row) => (
              <li
                key={row.id}
                data-mol-id={`settings-dns-${row.id}`}
                className={cm.cn(
                  cm.flex({ justify: 'between', align: 'center' }),
                  cm.textSize('sm'),
                  cm.sp('p', 3),
                  'rounded-lg bg-surface-container',
                )}
              >
                <span className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
                  {t(row.recordKey, {}, { defaultValue: row.recordDefault })}
                </span>
                <span className={cm.cn(cm.flex1, 'px-3 text-on-surface-variant')}>
                  {t(row.valueKey, {}, { defaultValue: row.valueDefault })}
                </span>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    'text-primary font-semibold whitespace-nowrap',
                  )}
                >
                  {t(row.statusKey, {}, { defaultValue: row.statusDefault })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Reader Privacy & Ethical Guardrails */}
      <section
        data-mol-id="settings-guardrails-section"
        className={cm.cn(
          cm.grid({ cols: 1, gap: 'none' }),
          'md:grid-cols-12 items-start gap-x-10 gap-y-6',
        )}
      >
        <div className={cm.cn('md:col-span-4')}>
          <h3 className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'), 'font-headline')}>
            {t(
              'settings.guardrails.title',
              {},
              { defaultValue: 'Reader Privacy & Ethical Guardrails' },
            )}
          </h3>
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('mt', 2),
              'text-on-surface-variant font-label',
            )}
          >
            {t(
              'settings.guardrails.subhead',
              {},
              {
                defaultValue:
                  'Built for deep trust between reader and author — these are architecture, not preferences.',
              },
            )}
          </p>
        </div>
        <div
          className={cm.cn(
            cm.sp('p', 8),
            'md:col-span-8 bg-surface-container-lowest rounded-xl editorial-shadow',
          )}
        >
          <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'sm:grid-cols-2')}>
            {GUARDRAILS.map((g) => (
              <div
                key={g.id}
                data-mol-id={`settings-guardrail-${g.id}`}
                className={cm.cn(cm.stack(2), cm.sp('p', 4), 'rounded-lg bg-surface-container')}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    'w-8 h-8 rounded-sm bg-primary-fixed text-primary justify-center',
                  )}
                >
                  <span className={cm.fv5b245ffa} aria-hidden>
                    {g.icon}
                  </span>
                </div>
                <h4
                  className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}
                >
                  {t(g.titleKey, {}, { defaultValue: g.titleDefault })}
                </h4>
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {t(g.bodyKey, {}, { defaultValue: g.bodyDefault })}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

export default SettingsDeliverabilitySection
