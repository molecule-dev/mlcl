import { LegalContentPage } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { LandingFooter } from '../components/LandingFooter.js'
import { LandingTopNav } from '../components/LandingTopNav.js'
import { loadContent } from '../config.js'

interface Tenet {
  id: string
  icon: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
}

/** The design's "Four Core Tenets of the Municipal Charter" cards. */
const TENETS: Tenet[] = [
  {
    id: 'walkComputation',
    icon: 'directions_walk',
    titleKey: 'privacy.tenets.walkComputation.title',
    titleDefault: 'Client-side "when to walk" computation',
    bodyKey: 'privacy.tenets.walkComputation.body',
    bodyDefault:
      'Walk-buffer alarms are computed in your browser from the published schedule — your position never has to reach a server for the math to work.',
  },
  {
    id: 'tapLedgers',
    icon: 'receipt_long',
    titleKey: 'privacy.tenets.tapLedgers.title',
    titleDefault: 'Turnstile cryptographic tap ledgers',
    bodyKey: 'privacy.tenets.tapLedgers.body',
    bodyDefault:
      'Fare taps are recorded as cryptographic ledger entries for revenue reconciliation only — they are never linked to browsing, alerts, or planner history.',
  },
  {
    id: 'transponders',
    icon: 'sensors',
    titleKey: 'privacy.tenets.transponders.title',
    titleDefault: 'Deterministic open vehicle transponders',
    bodyKey: 'privacy.tenets.transponders.body',
    bodyDefault:
      'Vehicles broadcast positions through the open GTFS-RT feed as anonymous units — a tram is a point on a line, never a rider.',
  },
  {
    id: 'publicDomain',
    icon: 'public',
    titleKey: 'privacy.tenets.publicDomain.title',
    titleDefault: 'Public domain feeds & zero monetization',
    bodyKey: 'privacy.tenets.publicDomain.body',
    bodyDefault:
      'The timetable and telemetry underneath the app are public-domain civic data. Nothing you ride, search, or save is sold, ranked, or resold to anyone.',
  },
]

/** The design's "Data Retention & Lifecycle Matrix" — kept factual to what
 * the product actually stores. */
const RETENTION_ROWS = [
  {
    id: 'session',
    whatKey: 'privacy.retention.session.what',
    whatDefault: 'Sign-in session',
    whereKey: 'privacy.retention.session.where',
    whereDefault: 'This device (auth token storage)',
    lifeKey: 'privacy.retention.session.life',
    lifeDefault: 'Until you sign out or the token expires',
  },
  {
    id: 'prefs',
    whatKey: 'privacy.retention.prefs.what',
    whatDefault: 'Rider preferences (home stop, currency, notification toggles)',
    whereKey: 'privacy.retention.prefs.where',
    whereDefault: 'Your account profile',
    lifeKey: 'privacy.retention.prefs.life',
    lifeDefault: 'Until you change or delete them',
  },
  {
    id: 'savedStops',
    whatKey: 'privacy.retention.savedStops.what',
    whatDefault: 'Saved stops and planned trips',
    whereKey: 'privacy.retention.savedStops.where',
    whereDefault: 'Your account profile',
    lifeKey: 'privacy.retention.savedStops.life',
    lifeDefault: 'Until you remove them or delete the account',
  },
  {
    id: 'tracking',
    whatKey: 'privacy.retention.tracking.what',
    whatDefault: 'Ad identifiers, location history, riding patterns',
    whereKey: 'privacy.retention.tracking.where',
    whereDefault: 'Nowhere — not collected, not stored, not sold',
    lifeKey: 'privacy.retention.tracking.life',
    lifeDefault: 'Never exists',
  },
]

/**
 * Standalone privacy page: the bonded legal document (same copy as the
 * footer modal), followed by the Stitch design's rider-facing privacy
 * supplement — the municipal-charter tenets and the data-retention matrix.
 */
export function Privacy() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <>
      <LegalContentPage
        kind="privacy"
        appName={APP_NAME}
        loadContent={loadContent}
        header={<LandingTopNav />}
      />

      {/* Rider-facing privacy supplement (design: charter tenets + retention
          matrix) — sits under the legal document, above the footer. */}
      <section
        data-mol-id="privacy-practices"
        className={cm.cn(cm.mxAuto, 'max-w-3xl', cm.sp('px', 6), cm.sp('pb', 20))}
      >
        <p
          data-mol-id="privacy-charter-lead"
          className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant leading-relaxed')}
        >
          {t(
            'privacy.charterLead',
            { app: APP_NAME },
            {
              defaultValue:
                'Civic transit architecture built on zero rider surveillance: {{app}} treats the timetable as a public asset and your movements as your own business — never a data point, including for us.',
            },
          )}
        </p>

        <h2
          className={cm.cn(
            cm.textSize('2xl'),
            cm.fontWeight('bold'),
            cm.sp('mt', 12),
            cm.sp('mb', 6),
            'tracking-tight',
          )}
        >
          {t(
            'privacy.tenetsHeading',
            {},
            { defaultValue: 'Four core tenets of the municipal charter' },
          )}
        </h2>
        <ul className={cm.cn('grid grid-cols-1 sm:grid-cols-2 gap-4')}>
          {TENETS.map((tenet) => (
            <li
              key={tenet.id}
              data-mol-id={`privacy-tenet-${tenet.id}`}
              className={cm.cn(
                cm.sp('p', 5),
                'bg-surface-container-low rounded-2xl ring-1 ring-outline-variant/40',
              )}
            >
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.w(10),
                  cm.h(10),
                  'rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20',
                )}
                aria-hidden="true"
              >
                <span className="material-symbols-outlined text-xl">{tenet.icon}</span>
              </span>
              <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'), cm.sp('mt', 3))}>
                {t(tenet.titleKey, {}, { defaultValue: tenet.titleDefault })}
              </h3>
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.sp('mt', 1),
                  'text-on-surface-variant leading-relaxed',
                )}
              >
                {t(tenet.bodyKey, {}, { defaultValue: tenet.bodyDefault })}
              </p>
            </li>
          ))}
        </ul>

        <h2
          className={cm.cn(
            cm.textSize('2xl'),
            cm.fontWeight('bold'),
            cm.sp('mt', 12),
            cm.sp('mb', 3),
            'tracking-tight',
          )}
        >
          {t('privacy.retentionHeading', {}, { defaultValue: 'Data retention & lifecycle matrix' })}
        </h2>
        <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant leading-relaxed')}>
          {t(
            'privacy.retentionIntro',
            { app: APP_NAME },
            {
              defaultValue:
                'Everything {{app}} can store about you, and how long it lives. The full legal policy above governs wherever the two ever differ.',
            },
          )}
        </p>
        <div className={cm.cn('overflow-x-auto', cm.sp('mt', 4))}>
          <table data-mol-id="privacy-retention-table" className={cm.cn(cm.w('full'))}>
            <thead>
              <tr>
                <th
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-on-surface-variant text-left',
                    cm.sp('py', 2),
                    cm.sp('pr', 4),
                  )}
                  scope="col"
                >
                  {t('privacy.retention.colWhat', {}, { defaultValue: 'Data' })}
                </th>
                <th
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-on-surface-variant text-left',
                    cm.sp('py', 2),
                    cm.sp('pr', 4),
                  )}
                  scope="col"
                >
                  {t('privacy.retention.colWhere', {}, { defaultValue: 'Where it lives' })}
                </th>
                <th
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-on-surface-variant text-left',
                    cm.sp('py', 2),
                  )}
                  scope="col"
                >
                  {t('privacy.retention.colLife', {}, { defaultValue: 'Lifetime' })}
                </th>
              </tr>
            </thead>
            <tbody>
              {RETENTION_ROWS.map((row) => (
                <tr
                  key={row.id}
                  data-mol-id={`privacy-retention-${row.id}`}
                  className="border-t border-outline-variant/40"
                >
                  <td
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      cm.sp('py', 3),
                      cm.sp('pr', 4),
                    )}
                  >
                    {t(row.whatKey, {}, { defaultValue: row.whatDefault })}
                  </td>
                  <td
                    className={cm.cn(
                      cm.textSize('sm'),
                      'text-on-surface-variant',
                      cm.sp('py', 3),
                      cm.sp('pr', 4),
                    )}
                  >
                    {t(row.whereKey, {}, { defaultValue: row.whereDefault })}
                  </td>
                  <td
                    className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('py', 3))}
                  >
                    {t(row.lifeKey, {}, { defaultValue: row.lifeDefault })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <LandingFooter />
    </>
  )
}

export default Privacy
export { Privacy as PrivacyPage }
