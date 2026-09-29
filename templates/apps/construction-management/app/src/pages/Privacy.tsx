import { useEffect } from 'react'

import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * Jobsite Privacy & Field Data Governance Policy — the design-shaped privacy
 * page for the construction-management app.
 *
 * The wrapper keeps `ContentPageShell` (hero + document title) and renders
 * the design's full structure: a section directory, the four field privacy
 * commitments, articles 00-10 (preamble through legal dispatch contact), and
 * finally the canonical bonded legal copy the footer modal shows, so the
 * short policy and the full document never diverge.
 *
 * i18n keys are app-scoped (`privacyField.*`) — none of them exist in
 * `@molecule/app-locales-common`, so the inline `defaultValue`s are the
 * single source of the English copy (no catalog shadowing).
 *
 * @returns The rendered privacy page.
 */
export function Privacy() {
  const cm = getClassMap()
  const { t } = useTranslation()

  useEffect(() => {
    document.title = t(
      'privacyField.docTitle',
      {},
      { defaultValue: 'Jobsite Privacy & Field Data Governance Policy' },
    )
  }, [t])

  const h2 = cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'tracking-tight')
  const body = cm.cn(cm.textSize('sm'), 'text-on-surface-variant', 'leading-relaxed')
  const chip = cm.cn(
    cm.sp('px', 2),
    cm.sp('py', 1),
    cm.textSize('xs'),
    cm.fontWeight('semibold'),
    'rounded-full border border-outline-variant bg-surface-container',
  )
  const card = cm.cn(cm.card(), cm.sp('p', 6))

  const articles: Array<{ id: string; num: string; key: string; def: string }> = [
    {
      id: 'privacy-preamble',
      num: '00',
      key: 'privacyField.art00',
      def: 'Preamble & Scope of Field Operations',
    },
    {
      id: 'privacy-blueprint',
      num: '01',
      key: 'privacyField.art01',
      def: 'Blueprint & Model Sovereignty (No Model Training)',
    },
    {
      id: 'privacy-geolocation',
      num: '02',
      key: 'privacyField.art02',
      def: 'Field Subcontractor Telemetry & Geolocation',
    },
    {
      id: 'privacy-biometric',
      num: '03',
      key: 'privacyField.art03',
      def: 'Biometric & Facial Scan Policy (Jobsite Kiosks)',
    },
    {
      id: 'privacy-drone',
      num: '04',
      key: 'privacyField.art04',
      def: 'Drone Photogrammetry, 360 Site Cameras & Sensor Streams',
    },
    {
      id: 'privacy-offline',
      num: '05',
      key: 'privacyField.art05',
      def: 'Offline Sub-Basement Local Encryption & Remote Wipe',
    },
    {
      id: 'privacy-sharing',
      num: '06',
      key: 'privacyField.art06',
      def: 'Field Data Sharing & Access Control Matrix',
    },
    {
      id: 'privacy-retainage',
      num: '07',
      key: 'privacyField.art07',
      def: '10-Year Statutory Retainage & Cold Archive',
    },
    {
      id: 'privacy-rights',
      num: '08',
      key: 'privacyField.art08',
      def: 'Data Subject Rights & Subcontractor Requests',
    },
    {
      id: 'privacy-security',
      num: '09',
      key: 'privacyField.art09',
      def: 'Security & Incident Notification SLA',
    },
    {
      id: 'privacy-contact',
      num: '10',
      key: 'privacyField.art10',
      def: 'Legal & Field Privacy Dispatch Contact',
    },
  ]

  const commitments = [
    {
      icon: 'architecture',
      tone: 'text-primary',
      key: 'privacyField.commit.vector.title',
      def: '100% Vector Ownership',
      bodyKey: 'privacyField.commit.vector.body',
      bodyDef:
        'You own every drawing layer, revision, redline, and calculation. We claim zero IP rights in your project records.',
    },
    {
      icon: 'share_location',
      tone: 'text-secondary',
      key: 'privacyField.commit.geofence.title',
      def: 'Strict Jobsite Geofences',
      bodyKey: 'privacyField.commit.geofence.body',
      bodyDef:
        'Worker GPS pings occur solely inside the jobsite perimeter during active check-in hours. Zero travel tracking.',
    },
    {
      icon: 'no_photography',
      tone: 'text-tertiary',
      key: 'privacyField.commit.biometric.title',
      def: 'No Raw Biometric Storage',
      bodyKey: 'privacyField.commit.biometric.body',
      bodyDef:
        'Kiosk check-ins compute a one-way template hash on device; the captured frame is purged immediately after.',
    },
    {
      icon: 'model_training',
      tone: 'text-error',
      key: 'privacyField.commit.training.title',
      def: 'Zero Foundation AI Training',
      bodyKey: 'privacyField.commit.training.body',
      bodyDef:
        'Drawings and trade submittals are never fed to external models or multi-tenant generative training engines.',
    },
  ]

  return (
    <ContentPageShell
      dataMolId="page-privacy"
      eyebrow={t('nav.legal', {}, { defaultValue: 'Legal' })}
      title={t(
        'privacyField.heroTitle',
        {},
        { defaultValue: 'Jobsite Privacy & Field Data Governance Policy' },
      )}
      subtitle={t(
        'privacyField.heroSubtitle',
        { appName: APP_NAME },
        {
          defaultValue:
            'The {{appName}} privacy policy for high-cadence jobsite telemetry, vector blueprints, biometric clock-ins, drone photogrammetry, and specialty-trade subcontractor records — zero data selling, zero advertising monetization, zero training of third-party models on your drawings.',
        },
      )}
      bare
      containerSize="lg"
    >
      <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'lg:grid-cols-3')}>
        {/* Left rail — section directory + commitments digest */}
        <aside className={cm.cn('space-y-6 lg:sticky lg:top-8 lg:self-start')}>
          <nav
            aria-label={t('privacyField.directoryLabel', {}, { defaultValue: 'Section Directory' })}
            className={card}
          >
            <h2 className={cm.cn(h2, cm.sp('mb', 3), cm.textSize('base'))}>
              {t('privacyField.directory', {}, { defaultValue: 'Section Directory' })}
            </h2>
            <ol className={cm.cn('space-y-1', cm.textSize('sm'))}>
              {articles.map((a) => (
                <li key={a.id}>
                  <a
                    href={`#${a.id}`}
                    className={cm.cn(
                      'flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors',
                    )}
                  >
                    <span className="truncate">
                      {a.num}. {t(a.key, {}, { defaultValue: a.def })}
                    </span>
                    <span aria-hidden="true">→</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className={card}>
            <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'), cm.sp('mb', 4))}>
              {t('privacyField.commitments', {}, { defaultValue: 'Field Privacy Commitments' })}
            </h3>
            <div className="space-y-4">
              {commitments.map((c) => (
                <div key={c.key} className={cm.cn('flex gap-3 items-start')}>
                  <span
                    aria-hidden="true"
                    className={cm.cn(
                      c.tone,
                      'shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-lg bg-surface-container',
                    )}
                  >
                    <span className={cm.cn('material-symbols-outlined', cm.textSize('base'))}>
                      {c.icon}
                    </span>
                  </span>
                  <div>
                    <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                      {t(c.key, {}, { defaultValue: c.def })}
                    </p>
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.sp('mt', 1),
                        'text-on-surface-variant',
                      )}
                    >
                      {t(c.bodyKey, {}, { defaultValue: c.bodyDef })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Main policy body */}
        <div className={cm.cn('lg:col-span-2 space-y-10')}>
          {/* 00 — preamble */}
          <section id="privacy-preamble" className="space-y-3 scroll-mt-8">
            <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
              <span className={chip}>SECTION 00</span>
              <h2 className={h2}>
                {t(
                  'privacyField.art00',
                  {},
                  { defaultValue: 'Preamble & Scope of Field Operations' },
                )}
              </h2>
            </div>
            <p className={body}>
              {t(
                'privacyField.art00.p1',
                {},
                {
                  defaultValue:
                    'This policy governs all information processed through the Groundwork desktop engine, mobile field application, jobsite trailer kiosks, and IoT edge gateways across active commercial jobsites, civil infrastructure parcels, and industrial plants.',
                },
              )}
            </p>
            <p className={body}>
              {t(
                'privacyField.art00.p2',
                {},
                {
                  defaultValue:
                    'We operate primarily as a data processor on behalf of general contractors, construction managers, and project owners. Specialty trade subcontractors interact with the platform under the supervisory authority of the designated project controller.',
                },
              )}
            </p>
          </section>

          {/* 01 — blueprint sovereignty */}
          <section id="privacy-blueprint" className="space-y-3 scroll-mt-8">
            <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
              <span className={chip}>SECTION 01</span>
              <h2 className={h2}>
                {t(
                  'privacyField.art01',
                  {},
                  { defaultValue: 'Blueprint & Model Sovereignty (No Model Training)' },
                )}
              </h2>
            </div>
            <p className={body}>
              {t(
                'privacyField.art01.p1',
                {},
                {
                  defaultValue:
                    'All 2D drawings, building information models, structural calculations, shop submittals, and coordination overlays remain the sole and exclusive intellectual property of the customer and its designated design professionals.',
                },
              )}
            </p>
            <div
              className={cm.cn(
                cm.sp('p', 4),
                'rounded-lg border border-outline-variant bg-primary-container text-on-primary-container',
              )}
            >
              <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
                {t(
                  'privacyField.art01.covenant',
                  {},
                  { defaultValue: 'No AI model training covenant' },
                )}
              </p>
              <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1))}>
                {t(
                  'privacyField.art01.covenantBody',
                  {},
                  {
                    defaultValue:
                      'Customer vector sheets, CAD drawings, RFIs, change-order estimates, and photographic field logs will never be used to train, fine-tune, calibrate, or evaluate third-party foundation models or public generative systems.',
                  },
                )}
              </p>
            </div>
          </section>

          {/* 02 — telemetry & geolocation */}
          <section id="privacy-geolocation" className="space-y-3 scroll-mt-8">
            <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
              <span className={chip}>SECTION 02</span>
              <h2 className={h2}>
                {t(
                  'privacyField.art02',
                  {},
                  { defaultValue: 'Field Subcontractor Telemetry & Geolocation' },
                )}
              </h2>
            </div>
            <p className={body}>
              {t(
                'privacyField.art02.p1',
                {},
                {
                  defaultValue:
                    'Automated geofence monitoring exists to satisfy muster logs, safety stand-down headcounts, and certified payroll records — never to track tradespeople. Arrivals and departures are recorded only inside the surveyed parcel during active hours; vehicular routes, commuting corridors, and personal device sensors are never logged.',
                },
              )}
            </p>
          </section>

          {/* 03 — biometric */}
          <section id="privacy-biometric" className="space-y-3 scroll-mt-8">
            <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
              <span className={chip}>SECTION 03</span>
              <h2 className={h2}>
                {t(
                  'privacyField.art03',
                  {},
                  { defaultValue: 'Biometric & Facial Scan Policy (Jobsite Kiosks)' },
                )}
              </h2>
            </div>
            <p className={body}>
              {t(
                'privacyField.art03.p1',
                {},
                {
                  defaultValue:
                    'Where trailer kiosks are deployed for touchless timecard verification, the kiosk extracts a one-way mathematical template hash on device and deletes the captured frame from memory within moments. Raw facial photographs are never transmitted to or stored in central databases.',
                },
              )}
            </p>
          </section>

          {/* 04 — drones & sensors */}
          <section id="privacy-drone" className="space-y-3 scroll-mt-8">
            <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
              <span className={chip}>SECTION 04</span>
              <h2 className={h2}>
                {t(
                  'privacyField.art04',
                  {},
                  { defaultValue: 'Drone Photogrammetry, 360 Site Cameras & Sensor Streams' },
                )}
              </h2>
            </div>
            <p className={body}>
              {t(
                'privacyField.art04.p1',
                {},
                {
                  defaultValue:
                    'Orthomosaic drone flights, rover scans, 360 site cameras, and concrete maturity sensors generate high-density spatial streams processed solely for progress verification and variance comparison against the master schedule. Routine orthomosaics run through an automatic edge filter that blurs worker faces and license plates before ingestion.',
                },
              )}
            </p>
          </section>

          {/* 05 — offline encryption */}
          <section id="privacy-offline" className="space-y-3 scroll-mt-8">
            <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
              <span className={chip}>SECTION 05</span>
              <h2 className={h2}>
                {t(
                  'privacyField.art05',
                  {},
                  { defaultValue: 'Offline Sub-Basement Local Encryption & Remote Wipe' },
                )}
              </h2>
            </div>
            <p className={body}>
              {t(
                'privacyField.art05.p1',
                {},
                {
                  defaultValue:
                    'Work inside concrete shear walls, underground utilities, and subterranean structures happens where cellular coverage drops to zero. The offline local store is page-level encrypted on ruggedized field tablets, reconciles over end-to-end encrypted tunnels when the device re-enters the trailer network, and can be zeroized remotely the moment a device is marked missing.',
                },
              )}
            </p>
          </section>

          {/* 06 — sharing matrix */}
          <section id="privacy-sharing" className="space-y-3 scroll-mt-8">
            <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
              <span className={chip}>SECTION 06</span>
              <h2 className={h2}>
                {t(
                  'privacyField.art06',
                  {},
                  { defaultValue: 'Field Data Sharing & Access Control Matrix' },
                )}
              </h2>
            </div>
            <p className={body}>
              {t(
                'privacyField.art06.p1',
                {},
                {
                  defaultValue:
                    'Role-based access control is configured at project inception: subcontractors see their own firm’s labor and assigned sheets, general contractors see aggregated site totals and the full audit log, and municipal inspectors receive read-only permitted sets with restricted personal data.',
                },
              )}
            </p>
          </section>

          {/* 07 — retainage */}
          <section id="privacy-retainage" className="space-y-3 scroll-mt-8">
            <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
              <span className={chip}>SECTION 07</span>
              <h2 className={h2}>
                {t(
                  'privacyField.art07',
                  {},
                  { defaultValue: '10-Year Statutory Retainage & Cold Archive' },
                )}
              </h2>
            </div>
            <p className={body}>
              {t(
                'privacyField.art07.p1',
                {},
                {
                  defaultValue:
                    'Construction litigation and latent-defect claims operate under state-specific statutes of repose typically spanning six to twelve years. After substantial completion, project instances transfer to an immutable write-once cold storage tier and are retained for ten calendar years, after which an automated cryptographic purge certificate is issued.',
                },
              )}
            </p>
          </section>

          {/* 08 — data subject rights */}
          <section id="privacy-rights" className="space-y-3 scroll-mt-8">
            <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
              <span className={chip}>SECTION 08</span>
              <h2 className={h2}>
                {t(
                  'privacyField.art08',
                  {},
                  { defaultValue: 'Data Subject Rights & Subcontractor Requests' },
                )}
              </h2>
            </div>
            <p className={body}>
              {t(
                'privacyField.art08.p1',
                {},
                {
                  defaultValue:
                    'Individual tradespeople maintain direct rights over their personal telemetry: requests to access or correct records are verified against dispatch records, punch-list attributions can be disputed within fourteen calendar days, and erasure applies except where certified payroll or OSHA injury records must be retained by law.',
                },
              )}
            </p>
          </section>

          {/* 09 — security SLA */}
          <section id="privacy-security" className="space-y-3 scroll-mt-8">
            <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
              <span className={chip}>SECTION 09</span>
              <h2 className={h2}>
                {t(
                  'privacyField.art09',
                  {},
                  { defaultValue: 'Security & Incident Notification SLA' },
                )}
              </h2>
            </div>
            <p className={body}>
              {t(
                'privacyField.art09.p1',
                {},
                {
                  defaultValue:
                    'We maintain a formal, audited incident response program. In the event of confirmed unauthorized access affecting customer project assets, we guarantee electronic and telephonic notice to the customer’s designated project director within twenty-four continuous hours.',
                },
              )}
            </p>
          </section>

          {/* 10 — contact */}
          <section id="privacy-contact" className="space-y-3 scroll-mt-8">
            <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
              <span className={chip}>SECTION 10</span>
              <h2 className={h2}>
                {t(
                  'privacyField.art10',
                  {},
                  { defaultValue: 'Legal & Field Privacy Dispatch Contact' },
                )}
              </h2>
            </div>
            <p className={body}>
              {t(
                'privacyField.art10.p1',
                {},
                {
                  defaultValue:
                    'For inquiries about our data governance practices, to execute a data protection addendum, or to reach the incident forensics team, contact the Office of Field Data Privacy — the dispatch desk answers around the clock.',
                },
              )}
            </p>
          </section>

          {/* Canonical bonded policy — same copy the footer modal shows */}
          <section
            data-mol-id="privacy-full-policy"
            className={cm.cn(card, 'bg-surface-container-low')}
          >
            <h2 className={cm.cn(h2, cm.sp('mb', 3))}>
              {t('privacyField.fullPolicy', {}, { defaultValue: 'Full privacy policy' })}
            </h2>
            <p className={body}>
              {t(
                'privacyField.fullPolicyBody',
                { appName: APP_NAME },
                {
                  defaultValue:
                    'This Jobsite Privacy & Field Data Governance Policy is the {{appName}} Privacy Policy of record. The commitments above summarize it; the footer’s Privacy Policy link opens the complete legal document at any time.',
                },
              )}
            </p>
          </section>
        </div>
      </div>
    </ContentPageShell>
  )
}

export default Privacy
