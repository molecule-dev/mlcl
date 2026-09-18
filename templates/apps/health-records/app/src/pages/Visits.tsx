import { useEffect, useState } from 'react'

import { t as tGlobal } from '@molecule/app-i18n'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type VisitCategory, VisitTimelineEntry } from '../components/VisitTimelineEntry.js'
import { unwrapList } from '../lib/unwrap.js'

/**
 * Wire shape returned by `GET /api/visits` — mirrors the `visits` table
 * (scheduled_at / clinic_name / chief_complaint, etc.). The Visits list
 * derives display-friendly fields (date, category, title, summary) from
 * this raw row so the API and DB stay aligned with VisitDetail.tsx.
 */
interface VisitRow {
  id: string
  scheduled_at: string | null
  completed_at: string | null
  provider_name: string | null
  clinic_name: string | null
  chief_complaint: string | null
  assessment: string | null
  plan: string | null
  notes: string | null
}

interface VisitView {
  id: string
  date: string
  category: VisitCategory
  title: string
  provider_name: string
  facility_name?: string
  summary: string
}

function dateParts(iso: string): { dateLabel: string; yearLabel: string } {
  const d = new Date(iso)
  return {
    dateLabel: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    yearLabel: String(d.getFullYear()),
  }
}

/**
 * Derive a VisitCategory from the row — clinic_name / notes contain free-form
 * hints (e.g. "CardioSouth · Telehealth", "Mercy Urgent Care", "Endoscopy").
 * Falls back to "office" when nothing matches.
 */
function deriveCategory(row: VisitRow): VisitCategory {
  const haystack = `${row.clinic_name ?? ''} ${row.notes ?? ''}`.toLowerCase()
  if (haystack.includes('telehealth') || haystack.includes('virtual')) return 'telehealth'
  if (haystack.includes('emergency') || haystack.includes(' er ') || haystack.endsWith(' er'))
    return 'emergency'
  if (haystack.includes('urgent')) return 'urgent_care'
  if (
    haystack.includes('lab') ||
    haystack.includes('endoscopy') ||
    haystack.includes('imaging') ||
    haystack.includes('radiolog')
  )
    return 'lab'
  return 'office'
}

function normalizeVisit(row: VisitRow): VisitView | null {
  const dateIso = row.scheduled_at ?? row.completed_at
  if (!dateIso) return null
  return {
    id: row.id,
    date:
      typeof dateIso === 'string'
        ? dateIso.slice(0, 10)
        : new Date(dateIso).toISOString().slice(0, 10),
    category: deriveCategory(row),
    title:
      row.chief_complaint ?? tGlobal('visitDetail.untitled', undefined, { defaultValue: 'Visit' }),
    provider_name:
      row.provider_name ??
      tGlobal('visits.unknownProvider', undefined, { defaultValue: 'Provider' }),
    facility_name: row.clinic_name ?? undefined,
    summary: row.assessment ?? row.plan ?? row.notes ?? '',
  }
}

export function Visits() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [visits, setVisits] = useState<VisitView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/visits?patient_id=me')
      .then((res) => {
        if (cancelled) return
        const rows = unwrapList<VisitRow>(res)
        const normalized = rows.map(normalizeVisit).filter((v): v is VisitView => v !== null)
        setVisits(normalized)
      })
      .catch((err) => {
        if (cancelled) return
        setError(
          err instanceof Error
            ? err.message
            : t('visits.loadError', {}, { defaultValue: 'Could not reach the records service.' }),
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const sorted = [...visits].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className={cm.cn(cm.maxW('4xl'), cm.mxAuto, cm.sp('p', 8))} data-mol-id="page-visits">
      <div className={cm.cn(cm.sp('mb', 8))}>
        <p className={cm.cn('text-[10px] font-bold uppercase tracking-widest text-primary mb-1')}>
          {t('visits.eyebrow', {}, { defaultValue: 'Care timeline' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('visits.title', {}, { defaultValue: 'Visits & appointments' })}
        </h1>
      </div>

      {error && (
        <p
          className={cm.cn(
            cm.sp('mb', 4),
            cm.textSize('xs'),
            'text-on-surface-variant uppercase tracking-widest font-bold',
          )}
        >
          {error}
        </p>
      )}

      {loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : sorted.length === 0 ? (
        <div className={cm.cn(cm.sp('py', 16), cm.textCenter)}>
          <span className={cm.cn('text-3xl material-symbols-outlined text-outline')}>
            event_available
          </span>
          <p className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'), cm.sp('mt', 4))}>
            {t('visits.empty.title', {}, { defaultValue: 'No visits recorded yet.' })}
          </p>
        </div>
      ) : (
        <ol>
          {sorted.map((v, i) => {
            const { dateLabel, yearLabel } = dateParts(v.date)
            return (
              <li key={v.id}>
                <VisitTimelineEntry
                  id={v.id}
                  dateLabel={dateLabel}
                  yearLabel={yearLabel}
                  category={v.category}
                  title={v.title}
                  providerName={v.provider_name}
                  facilityName={v.facility_name}
                  summary={v.summary}
                  isLast={i === sorted.length - 1}
                />
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
