import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, CITY_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'
import MiniMap from '../components/MiniMap.js'
import { useCategoryLabel, useStatusLabel } from '../lib/issues.js'

interface CommunityIssue {
  id: string
  category: string
  derived_address: string
  status: string
}

/** Status-pill tone for a ticket card (token-backed, both modes). */
function statusTone(status: string): { bg: string; text: string; dot: string } {
  switch (status) {
    case 'acknowledged':
      return {
        bg: 'bg-[var(--color-status-acknowledged)]/15',
        text: 'text-[var(--color-status-acknowledged)]',
        dot: 'bg-[var(--color-status-acknowledged)]',
      }
    case 'in_review':
      return {
        bg: 'bg-[var(--color-status-in-review)]/15',
        text: 'text-[var(--color-status-in-review)]',
        dot: 'bg-[var(--color-status-in-review)]',
      }
    case 'resolved':
      return {
        bg: 'bg-[var(--color-status-resolved)]/15',
        text: 'text-[var(--color-status-resolved)]',
        dot: 'bg-[var(--color-status-resolved)]',
      }
    case 'dismissed':
      return {
        bg: 'bg-[var(--color-status-dismissed)]/15',
        text: 'text-[var(--color-status-dismissed)]',
        dot: 'bg-[var(--color-status-dismissed)]',
      }
    default:
      return {
        bg: 'bg-[var(--color-status-submitted)]/15',
        text: 'text-[var(--color-status-submitted)]',
        dot: 'bg-[var(--color-status-submitted)]',
      }
  }
}

/**
 * Public landing page for CivicPulse (Stitch design: design-civic-311-landing).
 * Flow: emergency banner → hero narrative + intake card → city metrics bar →
 * live transparency radar (civic grid map + docket feed) → SLA workflow →
 * FOIA guarantee band. The map and feed read /api/issues when reachable; the
 * page is anonymous so the fetch degrades to the design's illustrative content.
 */
export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const categoryLabel = useCategoryLabel()
  const statusLabel = useStatusLabel()
  const [bannerOpen, setBannerOpen] = useState(true)
  const [recent, setRecent] = useState<CommunityIssue[]>([])

  useEffect(() => {
    document.title = t(
      'landing.pageTitle',
      { appName: APP_NAME, city: CITY_NAME },
      { defaultValue: '{{appName}} — report it, watch it, fix it' },
    )
  }, [t])

  useEffect(() => {
    let cancelled = false
    async function load() {
      // Best-effort: anonymous listing may 401 — the landing page stays
      // meaningful without it.
      try {
        const res = await http.get('/api/issues?limit=6')
        const raw = Array.isArray(res)
          ? (res as CommunityIssue[])
          : Array.isArray((res as { data?: unknown })?.data)
            ? (res as { data: CommunityIssue[] }).data
            : []
        if (cancelled || raw.length === 0) return
        setRecent(raw)
      } catch (_error) {
        // intentional noop — static hero remains
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [http])

  const intakeCategories = [
    { key: 'pothole', selected: false },
    { key: 'streetlight', selected: true },
    { key: 'graffiti', selected: false },
    { key: 'trash', selected: false },
    { key: 'tree', selected: false },
    { key: 'parking', selected: false },
  ]

  // Illustrative docket feed + map pins (the design's sample tickets) — used
  // until the live anonymous listing returns real rows.
  const sampleTickets = [
    {
      id: '#RIV-2025-8841',
      title: t(
        'landing.sample1Title',
        {},
        { defaultValue: 'Deep asphalt pothole obstructing cyclist path' },
      ),
      where: t('landing.sample1Where', {}, { defaultValue: 'Oak & 7th Ave' }),
      meta: t('landing.sample1Meta', {}, { defaultValue: 'DPW Crew Assigned' }),
      status: 'in_review',
    },
    {
      id: '#RIV-2025-8839',
      title: t(
        'landing.sample2Title',
        {},
        { defaultValue: 'Streetlight fixture flickering and ungrounded' },
      ),
      where: t('landing.sample2Where', {}, { defaultValue: 'Elm Bridge North Pier' }),
      meta: t('landing.sample2Meta', {}, { defaultValue: 'Logged 38m ago' }),
      status: 'acknowledged',
    },
    {
      id: '#RIV-2025-8820',
      title: t(
        'landing.sample3Title',
        {},
        { defaultValue: 'Public bench tagging & wall graffiti removal' },
      ),
      where: t('landing.sample3Where', {}, { defaultValue: 'Mill Plaza Fountain' }),
      meta: t('landing.sample3Meta', {}, { defaultValue: 'Proof Uploaded' }),
      status: 'resolved',
    },
    {
      id: '#RIV-2025-8814',
      title: t(
        'landing.sample4Title',
        {},
        { defaultValue: 'Fallen oak branch blocking pedestrian walkway' },
      ),
      where: t('landing.sample4Where', {}, { defaultValue: 'Riverbank Walk East' }),
      meta: t('landing.sample4Meta', {}, { defaultValue: 'Triage Pending' }),
      status: 'submitted',
    },
  ]

  const tickets =
    recent.length > 0
      ? recent.map((issue) => ({
          id: `#${issue.id.slice(-4).toUpperCase()}`,
          title: `${categoryLabel(issue.category)} — ${issue.derived_address}`,
          where: issue.derived_address,
          status: issue.status,
          meta: '',
        }))
      : sampleTickets

  const mapPins =
    recent.length > 0
      ? recent.map((i) => ({
          id: i.id,
          x: 20 + (hash(i.id) % 60),
          y: 20 + (hash(i.derived_address) % 60),
          color: `var(--color-status-${i.status === 'in_review' ? 'in-review' : i.status})`,
        }))
      : [
          { id: 's1', x: 63, y: 23, color: 'var(--color-status-in-review)' },
          { id: 's2', x: 23, y: 49, color: 'var(--color-status-acknowledged)' },
          { id: 's3', x: 37, y: 78, color: 'var(--color-status-resolved)' },
          { id: 's4', x: 28, y: 63, color: 'var(--color-status-submitted)' },
        ]

  const stages = [
    {
      stage: t('landing.stage1', {}, { defaultValue: 'STAGE 01' }),
      sla: t('landing.stage1Sla', {}, { defaultValue: 'SLA < 15 min' }),
      icon: 'inbox',
      color: 'var(--color-status-submitted)',
      title: t('landing.stage1Title', {}, { defaultValue: 'Submitted & Geocoded' }),
      body: t(
        'landing.stage1Body',
        {},
        {
          defaultValue:
            'Incident is logged with GPS coordinates and routed to the jurisdictional department.',
        },
      ),
    },
    {
      stage: t('landing.stage2', {}, { defaultValue: 'STAGE 02' }),
      sla: t('landing.stage2Sla', {}, { defaultValue: 'SLA < 2 hrs' }),
      icon: 'assignment_turned_in',
      color: 'var(--color-status-acknowledged)',
      title: t('landing.stage2Title', {}, { defaultValue: 'Acknowledged' }),
      body: t(
        'landing.stage2Body',
        {},
        {
          defaultValue:
            'Municipal supervisor validates validity, assigns a priority index, and notifies the ward council rep.',
        },
      ),
    },
    {
      stage: t('landing.stage3', {}, { defaultValue: 'STAGE 03' }),
      sla: t('landing.stage3Sla', {}, { defaultValue: 'SLA 24–72 hrs' }),
      icon: 'engineering',
      color: 'var(--color-status-in-review)',
      title: t('landing.stage3Title', {}, { defaultValue: 'In Review & Active' }),
      body: t(
        'landing.stage3Body',
        {},
        {
          defaultValue:
            'A physical crew or vehicle is deployed with active work-order status visible on the public map.',
        },
      ),
    },
    {
      stage: t('landing.stage4', {}, { defaultValue: 'STAGE 04' }),
      sla: t('landing.stage4Sla', {}, { defaultValue: 'Verified Proof' }),
      icon: 'task_alt',
      color: 'var(--color-status-resolved)',
      title: t('landing.stage4Title', {}, { defaultValue: 'Resolved & Sealed' }),
      body: t(
        'landing.stage4Body',
        {},
        {
          defaultValue:
            'Field completion photo is uploaded to the open ledger, the ticket is closed, and the reporter is notified.',
        },
      ),
    },
  ]

  const metrics = [
    {
      label: t('landing.metric1Label', {}, { defaultValue: 'Monthly Resolution' }),
      chip: t('landing.metric1Chip', {}, { defaultValue: '+12% YoY' }),
      chipTone: 'text-[var(--color-status-resolved)] bg-[var(--color-status-resolved)]/10',
      value: '1,842',
      unit: '',
      caption: t('landing.metric1Caption', {}, { defaultValue: 'Issues Resolved This Month' }),
    },
    {
      label: t('landing.metric2Label', {}, { defaultValue: 'Resolution Speed' }),
      chip: t('landing.metric2Chip', {}, { defaultValue: 'SLA Target < 3d' }),
      chipTone: 'text-primary bg-surface-container',
      value: '2.3',
      unit: t('landing.metric2Unit', {}, { defaultValue: 'Days' }),
      caption: t('landing.metric2Caption', {}, { defaultValue: 'Average Resolution Speed' }),
    },
    {
      label: t('landing.metric3Label', {}, { defaultValue: 'Response SLA' }),
      chip: t('landing.metric3Chip', {}, { defaultValue: 'Real-time' }),
      chipTone: 'text-[var(--color-status-acknowledged)] bg-[var(--color-status-acknowledged)]/10',
      value: '96.4%',
      unit: '',
      caption: t('landing.metric3Caption', {}, { defaultValue: 'Acknowledged Within 2 Hours' }),
    },
    {
      label: t('landing.metric4Label', {}, { defaultValue: 'Municipal Field Force' }),
      chip: '',
      chipTone: '',
      value: '28',
      unit: t('landing.metric4Unit', {}, { defaultValue: 'Crews' }),
      caption: t('landing.metric4Caption', {}, { defaultValue: 'DPW & Parks On Active Duty' }),
      live: true,
    },
  ]

  return (
    <div className={cm.cn(cm.surface, 'text-on-surface')}>
      {/* 1. Urgent notice / safety banner */}
      {bannerOpen && (
        <div className={cm.cn('bg-error-container text-on-error-container px-4 py-2.5')}>
          <div
            className={cm.cn(
              'w-full max-w-7xl mx-auto flex items-center justify-between gap-4 text-[13px]',
            )}
          >
            <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-2.5')}>
              <span
                className={cm.cn('material-symbols-outlined text-error shrink-0')}
                style={{ fontVariationSettings: "'FILL' 1" }}
                aria-hidden
              >
                warning
              </span>
              <span>
                <strong className={cm.cn(cm.fontWeight('semibold'), 'text-error')}>
                  {t(
                    'landing.bannerUrgent',
                    {},
                    {
                      defaultValue:
                        'Life Safety Emergency or Immediate Hazard? Call 911 immediately.',
                    },
                  )}
                </strong>{' '}
                {t(
                  'landing.bannerBody',
                  { appName: APP_NAME },
                  {
                    defaultValue:
                      '{{appName}} is monitored for non-emergencies during standard municipal hours (7 AM – 9 PM).',
                  },
                )}
              </span>
            </div>
            <button
              type="button"
              aria-label={t('landing.bannerDismiss', {}, { defaultValue: 'Dismiss banner' })}
              onClick={() => setBannerOpen(false)}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                'text-on-error-container hover:text-error p-1 rounded transition-colors',
              )}
            >
              <span className={cm.cn('material-symbols-outlined', 'text-[18px]')} aria-hidden>
                close
              </span>
            </button>
          </div>
        </div>
      )}

      <Header />

      <main
        className={cm.cn('w-full max-w-7xl mx-auto px-8 py-8 space-y-12')}
        data-mol-id="landing-page"
      >
        {/* 2. Hero: narrative left, quick intake card right */}
        <section
          className={cm.cn('grid grid-cols-1 lg:grid-cols-12 gap-8 items-start')}
          data-mol-id="landing-hero"
        >
          <div className={cm.cn('lg:col-span-6 space-y-6 pt-2')}>
            <p
              data-mol-id="landing-hero-tagline"
              className={cm.cn(
                cm.flex({ align: 'center' }),
                'inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container',
                'text-xs font-semibold border border-surface-variant',
              )}
            >
              <span
                className={cm.cn('w-2 h-2 rounded-full bg-primary-container animate-pulse')}
                aria-hidden
              />
              <span>
                {t(
                  'landing.heroKicker',
                  { city: CITY_NAME },
                  { defaultValue: 'Official {{city}} Public Docket System' },
                )}
              </span>
            </p>
            <h1
              data-mol-id="landing-hero-title"
              className={cm.cn('text-4xl md:text-5xl font-semibold tracking-tight text-on-surface')}
              style={{ fontFamily: 'var(--font-headline)' }}
            >
              {t(
                'landing.heroTitle',
                { city: CITY_NAME },
                {
                  defaultValue: 'A responsive, accountable {{city}} starts with your voice.',
                },
              )}
            </h1>
            <p className={cm.cn(cm.textSize('lg'), 'text-secondary max-w-xl')}>
              {t(
                'landing.heroSubtitle',
                { appName: APP_NAME, city: CITY_NAME },
                {
                  defaultValue:
                    '{{appName}} connects residents directly with the {{city}} Department of Public Works, Parks, and Transportation. Report non-emergency municipal issues in under 60 seconds with full open-data visibility.',
                },
              )}
            </p>

            {/* Trust badges */}
            <div className={cm.cn(cm.flex({ align: 'center' }), 'flex-wrap gap-4 pt-2')}>
              <span
                className={cm.cn(cm.flex({ align: 'center' }), 'gap-2 text-[13px] text-secondary')}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-[20px]')}
                  style={{
                    color: 'var(--color-status-resolved)',
                    fontVariationSettings: "'FILL' 1",
                  }}
                  aria-hidden
                >
                  check_circle
                </span>
                {t('landing.trust1', {}, { defaultValue: 'Charter SLA Guaranteed' })}
              </span>
              <span
                className={cm.cn(cm.flex({ align: 'center' }), 'gap-2 text-[13px] text-secondary')}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-[20px] text-primary-container')}
                  aria-hidden
                >
                  lock_open
                </span>
                {t('landing.trust2', {}, { defaultValue: 'Public FOIA Open Records' })}
              </span>
              <span
                className={cm.cn(cm.flex({ align: 'center' }), 'gap-2 text-[13px] text-secondary')}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-[20px] text-tertiary')}
                  aria-hidden
                >
                  pin_drop
                </span>
                {t('landing.trust3', {}, { defaultValue: 'Municipal Ward Geocoding' })}
              </span>
            </div>

            {/* Municipal authority seal card */}
            <div
              data-mol-id="landing-seal-card"
              className={cm.cn(
                cm.flex({ align: 'center' }),
                'p-4 rounded-xl bg-surface-container-low border border-surface-variant gap-4',
              )}
            >
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  'w-12 h-12 rounded-full border border-primary-container/30 bg-surface-container-lowest shrink-0',
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-primary-container')}
                  aria-hidden
                >
                  account_balance
                </span>
              </span>
              <div>
                <h4
                  className={cm.cn(
                    cm.textSize('base'),
                    cm.fontWeight('semibold'),
                    'text-on-surface',
                  )}
                >
                  {t(
                    'landing.sealTitle',
                    { city: CITY_NAME },
                    { defaultValue: '{{city}} City Charter § 4-112 Compliance' },
                  )}
                </h4>
                <p className={cm.cn(cm.textSize('sm'), 'text-secondary')}>
                  {t(
                    'landing.sealBody',
                    {},
                    {
                      defaultValue:
                        'Every submission creates a legally immutable municipal receipt viewable by all residents.',
                    },
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Quick incident intake card */}
          <div
            id="intake-card"
            data-mol-id="landing-intake-card"
            className={cm.cn(
              'lg:col-span-6 bg-surface-container-lowest rounded-2xl border border-surface-variant shadow-sm p-6 sm:p-8 space-y-6',
            )}
          >
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between' }),
                'border-b border-surface-variant pb-4',
              )}
            >
              <div>
                <h2
                  className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'), 'text-on-surface')}
                >
                  {t('landing.intakeTitle', {}, { defaultValue: 'Log a Municipal Issue' })}
                </h2>
                <p className={cm.cn(cm.textSize('sm'), 'text-secondary')}>
                  {t(
                    'landing.intakeSubtitle',
                    { city: CITY_NAME },
                    {
                      defaultValue: 'Direct intake to {{city}} Public Works & Municipal Services',
                    },
                  )}
                </p>
              </div>
              <span
                className={cm.cn(
                  'px-2.5 py-1 rounded bg-surface-container text-primary font-mono font-semibold text-xs whitespace-nowrap',
                )}
              >
                {t('landing.intakeFormNo', {}, { defaultValue: 'FORM 311-A' })}
              </span>
            </div>

            {/* Location field */}
            <div className="space-y-2">
              <label
                className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-on-surface')}
              >
                {t(
                  'landing.intakeLocationLabel',
                  { city: CITY_NAME },
                  { defaultValue: 'Where in {{city}} is the issue?' },
                )}
              </label>
              <div className={cm.cn('relative flex items-center')}>
                <span
                  className={cm.cn(
                    'material-symbols-outlined absolute left-3.5 text-secondary text-[20px] pointer-events-none',
                  )}
                  aria-hidden
                >
                  location_on
                </span>
                <input
                  readOnly
                  type="text"
                  value={t(
                    'landing.intakeLocationValue',
                    { city: CITY_NAME },
                    { defaultValue: '4th Ave & Elm St, {{city}}' },
                  )}
                  aria-label={t(
                    'landing.intakeLocationLabel',
                    { city: CITY_NAME },
                    { defaultValue: 'Where in {{city}} is the issue?' },
                  )}
                  className={cm.cn(
                    'w-full pl-10 pr-24 py-2.5 bg-surface-container-lowest border border-surface-variant rounded-lg text-sm text-on-surface cursor-default',
                  )}
                />
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center' }),
                    'absolute right-2 px-3 py-1 bg-surface-container text-on-surface text-xs rounded gap-1',
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-[16px]')} aria-hidden>
                    my_location
                  </span>
                  {t('landing.intakeGps', {}, { defaultValue: 'Use GPS' })}
                </span>
              </div>
              <p className={cm.cn(cm.textSize('sm'), 'text-secondary')}>
                {t('landing.intakeWardLabel', {}, { defaultValue: 'Detected Ward:' })}{' '}
                <strong className={cm.cn(cm.fontWeight('medium'), 'text-on-surface')}>
                  {t(
                    'landing.intakeWardValue',
                    { city: CITY_NAME },
                    { defaultValue: '{{city}} Ward 2 (Downtown & Waterfront District)' },
                  )}
                </strong>
              </p>
            </div>

            {/* Issue category selector */}
            <div className="space-y-2.5">
              <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                <label
                  className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-on-surface')}
                >
                  {t('landing.intakeCategoryLabel', {}, { defaultValue: 'Select Issue Category' })}
                </label>
                <span className={cm.cn(cm.textSize('xs'), 'text-secondary')}>
                  {t(
                    'landing.intakeCategoryHint',
                    {},
                    { defaultValue: '7 Standard Municipal Codes' },
                  )}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {intakeCategories.map((cat) => (
                  <span
                    key={cat.key}
                    data-mol-id="landing-intake-category"
                    data-category={cat.key}
                    data-selected={cat.selected || undefined}
                    className={cm.cn(
                      cm.flex({ align: 'center' }),
                      'gap-2 p-2.5 rounded-lg text-left',
                      cat.selected
                        ? 'border-2 border-primary-container bg-surface-container-low shadow-sm ring-1 ring-primary-container/30'
                        : 'border border-surface-variant bg-surface-container-lowest',
                    )}
                  >
                    <span
                      className={cm.cn('w-2.5 h-2.5 rounded-full shrink-0')}
                      style={{ background: `var(--color-cat-${cat.key})` }}
                      aria-hidden
                    />
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        cat.selected ? cm.fontWeight('semibold') : cm.fontWeight('normal'),
                        'text-on-surface truncate',
                      )}
                    >
                      {categoryLabel(cat.key)}
                    </span>
                  </span>
                ))}
              </div>
            </div>

            {/* Description note */}
            <div className="space-y-1.5">
              <label
                className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-on-surface')}
              >
                {t('landing.intakeDescLabel', {}, { defaultValue: 'Brief Description (Optional)' })}
              </label>
              <textarea
                readOnly
                rows={2}
                placeholder={t(
                  'landing.intakeDescPlaceholder',
                  {},
                  {
                    defaultValue:
                      'e.g. Streetlight pole near pedestrian crossing is flickering and buzzing continuously...',
                  },
                )}
                aria-label={t(
                  'landing.intakeDescLabel',
                  {},
                  { defaultValue: 'Brief Description (Optional)' },
                )}
                className={cm.cn(
                  'w-full p-2.5 bg-surface-container-lowest border border-surface-variant rounded-lg text-[13px] text-on-surface placeholder:text-outline resize-none cursor-default',
                )}
              />
            </div>

            {/* CTA cluster */}
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between' }),
                'pt-2 border-t border-surface-variant flex-col sm:flex-row gap-4',
              )}
            >
              <span
                className={cm.cn(cm.flex({ align: 'center' }), 'gap-2 text-[13px] text-secondary')}
              >
                <span className={cm.cn('material-symbols-outlined text-[18px]')} aria-hidden>
                  shield
                </span>
                {t(
                  'landing.intakeAnonymous',
                  {},
                  { defaultValue: 'Anonymous reporting available. No mandatory registration.' },
                )}
              </span>
              <Link
                data-mol-id="landing-cta-signup"
                to="/signup"
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  'w-full sm:w-auto px-6 py-3 bg-primary-container text-on-primary text-sm font-semibold rounded-lg',
                  'hover:bg-[var(--color-primary-hover)] shadow-sm transition-all items-center gap-2 shrink-0',
                )}
              >
                <span>{t('landing.ctaStartReport', {}, { defaultValue: 'Start Report' })}</span>
                <span className={cm.cn('material-symbols-outlined text-[18px]')} aria-hidden>
                  arrow_forward
                </span>
              </Link>
            </div>
          </div>
        </section>

        {/* 3. Key city metrics bar */}
        <section
          className={cm.cn('grid grid-cols-2 md:grid-cols-4 gap-4')}
          data-mol-id="landing-metrics"
        >
          {metrics.map((m) => (
            <div
              key={m.label}
              data-mol-id="landing-metric"
              className={cm.cn(
                'bg-surface-container-lowest p-5 rounded-xl border border-surface-variant shadow-sm space-y-1',
              )}
            >
              <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                <span
                  className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), 'text-secondary')}
                >
                  {m.label}
                </span>
                {m.chip && (
                  <span
                    className={cm.cn(
                      'text-[11px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap',
                      m.chipTone,
                    )}
                  >
                    {m.chip}
                  </span>
                )}
                {m.live && (
                  <span
                    className={cm.cn(
                      'w-2 h-2 rounded-full bg-[var(--color-status-resolved)] animate-pulse inline-block',
                    )}
                    aria-hidden
                  />
                )}
              </div>
              <div className={cm.cn('text-3xl font-semibold text-on-surface')}>
                {m.value}
                {m.unit && (
                  <span
                    className={cm.cn(
                      cm.textSize('base'),
                      cm.fontWeight('normal'),
                      'text-secondary',
                    )}
                  >
                    {' '}
                    {m.unit}
                  </span>
                )}
              </div>
              <p className={cm.cn(cm.textSize('sm'), 'text-secondary')}>{m.caption}</p>
            </div>
          ))}
        </section>

        {/* 4. Live transparency radar + activity stream */}
        <section className="space-y-6" data-mol-id="landing-radar">
          <div
            className={cm.cn(
              cm.flex({ justify: 'between' }),
              'flex-col sm:flex-row sm:items-end gap-4',
            )}
          >
            <div>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center' }),
                  'gap-2 text-xs font-semibold text-primary uppercase tracking-wider',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[16px]')} aria-hidden>
                  radar
                </span>
                <span>
                  {t('landing.radarKicker', {}, { defaultValue: 'Real-time City Health' })}
                </span>
              </div>
              <h2
                className={cm.cn('text-3xl font-semibold text-on-surface mt-1')}
                style={{ fontFamily: 'var(--font-headline)' }}
              >
                {t(
                  'landing.radarTitle',
                  {},
                  { defaultValue: 'Live Transparency Radar & Activity Stream' },
                )}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-secondary')}>
                {t(
                  'landing.radarSubtitle',
                  { city: CITY_NAME },
                  {
                    defaultValue:
                      'Public non-emergency incident pipeline for {{city}}, updated every 45 seconds.',
                  },
                )}
              </p>
            </div>
            <Link
              to="/explore"
              data-mol-id="landing-cta-explore"
              className={cm.cn(
                cm.flex({ align: 'center' }),
                'inline-flex items-center gap-1 text-primary text-sm font-semibold underline shrink-0',
              )}
            >
              <span>
                {t(
                  'landing.radarLink',
                  {},
                  { defaultValue: 'Browse Full Public Docket (Open Data)' },
                )}
              </span>
              <span className={cm.cn('material-symbols-outlined text-[16px]')} aria-hidden>
                arrow_forward
              </span>
            </Link>
          </div>

          <div className={cm.cn('grid grid-cols-1 lg:grid-cols-12 gap-8 items-start')}>
            {/* Left: stylized civic grid map */}
            <div
              data-mol-id="landing-map-preview"
              className={cm.cn(
                'lg:col-span-7 bg-surface-container-lowest rounded-2xl border border-surface-variant shadow-sm p-5 space-y-4',
              )}
            >
              <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-2')}>
                  <span
                    className={cm.cn('w-2.5 h-2.5 rounded-full bg-primary-container')}
                    aria-hidden
                  />
                  <h3
                    className={cm.cn(
                      cm.textSize('base'),
                      cm.fontWeight('semibold'),
                      'text-on-surface',
                    )}
                  >
                    {t(
                      'landing.mapTitle',
                      { city: CITY_NAME },
                      { defaultValue: '{{city}} Civic Grid & Spatial Feed' },
                    )}
                  </h3>
                </div>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center' }),
                    'gap-1 bg-surface-container-low p-1 rounded-lg border border-surface-variant text-xs',
                  )}
                >
                  <span
                    className={cm.cn(
                      'px-2 py-1 rounded bg-surface-container-lowest font-medium text-on-surface shadow-sm',
                    )}
                  >
                    {t('landing.mapTabIncidents', {}, { defaultValue: 'Incident Map' })}
                  </span>
                  <span className={cm.cn('px-2 py-1 rounded text-secondary')}>
                    {t('landing.mapTabHeatmap', {}, { defaultValue: 'Density Heatmap' })}
                  </span>
                </div>
              </div>

              <div
                className={cm.cn(
                  'relative w-full rounded-xl border border-surface-variant overflow-hidden',
                )}
              >
                <MiniMap pins={mapPins} aspect="7 / 4" data-mol-id="landing-map" />
                {/* Decorative zoom controls */}
                <div className={cm.cn('absolute top-3 right-3 flex flex-col gap-1')} aria-hidden>
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      'w-8 h-8 rounded-lg bg-surface-container-lowest border border-surface-variant text-on-surface shadow-sm',
                    )}
                  >
                    +
                  </span>
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      'w-8 h-8 rounded-lg bg-surface-container-lowest border border-surface-variant text-on-surface shadow-sm',
                    )}
                  >
                    −
                  </span>
                </div>
                {/* Legend overlay */}
                <div
                  className={cm.cn(
                    'absolute bottom-3 left-3 bg-surface-container-lowest/95 backdrop-blur px-3 py-2 rounded-lg',
                    'border border-surface-variant flex flex-wrap items-center gap-3 text-[11px] font-medium shadow-sm',
                  )}
                >
                  <span
                    className={cm.cn(
                      'text-secondary font-semibold uppercase tracking-wider text-[10px]',
                    )}
                  >
                    {t('landing.legendPins', {}, { defaultValue: 'Pins:' })}
                  </span>
                  <span className={cm.cn(cm.flex({ align: 'center' }), 'gap-1.5')}>
                    <span
                      className={cm.cn('w-2 h-2 rounded-full bg-[var(--color-status-submitted)]')}
                      aria-hidden
                    />
                    {t('status.submitted', {}, { defaultValue: 'Submitted' })}
                  </span>
                  <span className={cm.cn(cm.flex({ align: 'center' }), 'gap-1.5')}>
                    <span
                      className={cm.cn(
                        'w-2 h-2 rounded-full bg-[var(--color-status-acknowledged)]',
                      )}
                      aria-hidden
                    />
                    {t('status.acknowledged', {}, { defaultValue: 'Acknowledged' })}
                  </span>
                  <span className={cm.cn(cm.flex({ align: 'center' }), 'gap-1.5')}>
                    <span
                      className={cm.cn('w-2 h-2 rounded-full bg-[var(--color-status-in-review)]')}
                      aria-hidden
                    />
                    {t('status.in_review', {}, { defaultValue: 'In Review' })}
                  </span>
                  <span className={cm.cn(cm.flex({ align: 'center' }), 'gap-1.5')}>
                    <span
                      className={cm.cn('w-2 h-2 rounded-full bg-[var(--color-status-resolved)]')}
                      aria-hidden
                    />
                    {t('status.resolved', {}, { defaultValue: 'Resolved' })}
                  </span>
                </div>
              </div>

              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between' }),
                  'text-[13px] text-secondary pt-1',
                )}
              >
                <span className={cm.cn(cm.flex({ align: 'center' }), 'gap-1.5')}>
                  <span
                    className={cm.cn('material-symbols-outlined text-[16px] text-primary')}
                    aria-hidden
                  >
                    layers
                  </span>
                  <span>
                    {t(
                      'landing.mapProjection',
                      { city: CITY_NAME },
                      {
                        defaultValue: 'Coordinate projection: {{city}} Municipal GIS (EPSG:2272)',
                      },
                    )}
                  </span>
                </span>
                <Link to="/explore" className={cm.cn('text-primary hover:underline font-medium')}>
                  {t('landing.mapFullscreen', {}, { defaultValue: 'View Fullscreen GIS Map →' })}
                </Link>
              </div>
            </div>

            {/* Right: activity feed */}
            <div className={cm.cn('lg:col-span-5 space-y-3.5')} data-mol-id="landing-recent">
              <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'pb-1')}>
                <h3
                  className={cm.cn(
                    cm.textSize('base'),
                    cm.fontWeight('semibold'),
                    'text-on-surface flex items-center gap-2',
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-[20px] text-primary')}
                    aria-hidden
                  >
                    sync
                  </span>
                  <span>{t('landing.feedTitle', {}, { defaultValue: 'Active Docket Feed' })}</span>
                </h3>
                <span className={cm.cn(cm.textSize('xs'), 'font-mono text-secondary')}>
                  {t('landing.feedLive', {}, { defaultValue: 'LIVE FEED' })}
                </span>
              </div>
              {tickets.map((ticket) => {
                const tone = statusTone(ticket.status)
                return (
                  <article
                    key={ticket.id}
                    data-mol-id="landing-recent-item"
                    className={cm.cn(
                      'bg-surface-container-lowest p-4 rounded-xl border border-surface-variant hover:border-primary-container/40 transition-colors shadow-sm space-y-2.5',
                    )}
                  >
                    <div
                      className={cm.cn(cm.flex({ align: 'start', justify: 'between' }), 'gap-2')}
                    >
                      <div>
                        <span className={cm.cn('font-mono text-xs font-bold text-primary')}>
                          {ticket.id}
                        </span>
                        <h4
                          className={cm.cn(
                            cm.textSize('sm'),
                            cm.fontWeight('semibold'),
                            'text-on-surface',
                          )}
                        >
                          {ticket.title}
                        </h4>
                      </div>
                      <span
                        className={cm.cn(
                          cm.flex({ align: 'center' }),
                          'px-2 py-0.5 rounded-full text-[11px] font-semibold items-center gap-1 shrink-0 whitespace-nowrap',
                          tone.bg,
                          tone.text,
                        )}
                      >
                        <span className={cm.cn('w-1.5 h-1.5 rounded-full', tone.dot)} aria-hidden />
                        <span>{statusLabel(ticket.status)}</span>
                      </span>
                    </div>
                    <div
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'between' }),
                        'text-[13px] text-secondary border-t border-surface-variant/60 pt-2',
                      )}
                    >
                      <span className={cm.cn(cm.flex({ align: 'center' }), 'gap-1')}>
                        <span
                          className={cm.cn('material-symbols-outlined text-[15px]')}
                          aria-hidden
                        >
                          near_me
                        </span>
                        <span>{ticket.where}</span>
                      </span>
                      {ticket.meta && (
                        <span className={cm.cn(cm.fontWeight('medium'), 'text-on-surface-variant')}>
                          {ticket.meta}
                        </span>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        {/* 5. Municipal accountability: SLA-backed workflow */}
        <section
          className={cm.cn(
            'bg-surface-container-lowest rounded-2xl border border-surface-variant p-6 sm:p-8 space-y-8',
          )}
          data-mol-id="landing-how-it-works"
        >
          <div>
            <div
              className={cm.cn(
                cm.flex({ align: 'center' }),
                'gap-2 text-xs font-semibold text-primary uppercase tracking-wider',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[16px]')} aria-hidden>
                verified_user
              </span>
              <span>
                {t('landing.pipelineKicker', {}, { defaultValue: 'End-to-End Pipeline' })}
              </span>
            </div>
            <h2
              className={cm.cn('text-3xl font-semibold text-on-surface mt-1')}
              style={{ fontFamily: 'var(--font-headline)' }}
            >
              {t(
                'landing.pipelineTitle',
                {},
                { defaultValue: 'Municipal Accountability: SLA-Backed Workflow' },
              )}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-secondary')}>
              {t(
                'landing.pipelineSubtitle',
                { city: CITY_NAME },
                {
                  defaultValue:
                    'Every {{city}} 311 submission follows a strict public timeline. Track progress in real-time without administrative opacity.',
                },
              )}
            </p>
          </div>
          <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6')}>
            {stages.map((s, i) => (
              <div
                key={s.stage}
                data-mol-id={`landing-step-${i + 1}`}
                className={cm.cn(
                  'relative p-5 rounded-xl bg-surface-container-low border border-surface-variant space-y-3',
                )}
              >
                <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                  <span className={cm.cn('font-mono text-xs font-semibold text-primary')}>
                    {s.stage}
                  </span>
                  <span
                    className={cm.cn(
                      'text-[11px] font-mono px-2 py-0.5 rounded bg-surface-container-lowest text-secondary font-medium whitespace-nowrap',
                    )}
                  >
                    {s.sla}
                  </span>
                </div>
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'w-10 h-10 rounded-lg',
                  )}
                  style={{ background: `color-mix(in srgb, ${s.color} 12%, transparent)` }}
                  aria-hidden
                >
                  <span className={cm.cn('material-symbols-outlined')} style={{ color: s.color }}>
                    {s.icon}
                  </span>
                </span>
                <h3
                  className={cm.cn(
                    cm.textSize('base'),
                    cm.fontWeight('semibold'),
                    'text-on-surface',
                  )}
                >
                  {s.title}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-secondary')}>{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 6. Public records & FOIA guarantee band */}
        <section
          className={cm.cn(
            'bg-gradient-to-r from-surface-container to-surface-container-low rounded-2xl border border-surface-variant p-6 sm:p-8',
            'flex flex-col md:flex-row items-center justify-between gap-6',
          )}
          data-mol-id="landing-foia"
        >
          <div className={cm.cn(cm.flex({ align: 'start' }), 'gap-4')}>
            <span
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                'w-12 h-12 rounded-xl bg-primary-container text-on-primary shrink-0 shadow-sm',
              )}
            >
              <span className={cm.cn('material-symbols-outlined', 'text-[28px]')} aria-hidden>
                policy
              </span>
            </span>
            <div className="space-y-1">
              <h3
                className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'), 'text-on-surface')}
              >
                {t(
                  'landing.foiaTitle',
                  { city: CITY_NAME },
                  { defaultValue: 'Official {{city}} Public Records & FOIA Guarantee' },
                )}
              </h3>
              <p className={cm.cn(cm.textSize('sm'), 'text-secondary max-w-2xl')}>
                {t(
                  'landing.foiaBody',
                  { city: CITY_NAME },
                  {
                    defaultValue:
                      'Under the {{city}} Sunshine Charter § 4-112, non-emergency tickets are permanent civic public records. Anonymized data feeds are available daily in CSV, GeoJSON, and REST API formats for citizen journalists, universities, and researchers.',
                  },
                )}
              </p>
            </div>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-3 shrink-0')}>
            <Link
              to="/explore"
              className={cm.cn(
                'px-5 py-2.5 bg-primary-container text-on-primary rounded-lg text-sm font-medium hover:bg-[var(--color-primary-hover)] shadow-sm transition-all whitespace-nowrap',
              )}
            >
              {t('landing.foiaCta', {}, { defaultValue: 'Access 311 Open Data' })}
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

/** Tiny deterministic jitter so preview pins don't all stack. */
function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997
  return h
}

export default Landing
