import { useEffect, useMemo, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import {
  type PillColor,
  RefillAlertCard,
  type RefillStatus,
} from '../components/RefillAlertCard.js'
import { unwrapList } from '../lib/unwrap.js'

interface Refill {
  id: string
  medication_id: string
  medication_name: string
  pill_color: PillColor
  count_remaining: number
  daily_dose_count: number
  days_remaining: number
  refill_due: string
  refills_remaining: number
  pharmacy: string
  pharmacy_phone: string
  status: RefillStatus
}

const STATUS_ORDER: Record<RefillStatus, number> = {
  urgent: 0,
  due_soon: 1,
  requested: 2,
  fine: 3,
}

export function Refills() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [list, setList] = useState<Refill[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/refills/alerts')
      .then((res) => {
        if (!cancelled) setList(unwrapList<Refill>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('refills.loadError', {}, { defaultValue: 'Failed to load refills.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const sorted = useMemo(
    () => [...list].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]),
    [list],
  )

  const counts = useMemo(() => {
    return list.reduce(
      (acc, r) => {
        if (r.status === 'urgent') acc.urgent += 1
        else if (r.status === 'due_soon') acc.dueSoon += 1
        else if (r.status === 'fine') acc.fine += 1
        return acc
      },
      { urgent: 0, dueSoon: 0, fine: 0 },
    )
  }, [list])

  const requestRefill = async (refill: Refill) => {
    setList((curr) =>
      curr.map((r) => (r.id === refill.id ? { ...r, status: 'requested' as RefillStatus } : r)),
    )
    try {
      await http.post(`/api/refills/${refill.id}/request`, {})
      void track({
        name: 'refill.requested',
        properties: { refill_id: refill.id, medication_id: refill.medication_id },
      })
    } catch (_error) {
      /* optimistic — request-status already updated in UI; server will reconcile on next load */
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, 'space-y-8')}>
      {/* Branded section header with eyebrow */}
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-primary-dark dark:text-primary',
          )}
        >
          {t('refills.eyebrow', {}, { defaultValue: 'Stay supplied' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
          {t('refills.heading', {}, { defaultValue: 'Refills' })}
        </h1>
        <p className={cm.cn(cm.textSize('base'), cm.sp('mt', 2), 'text-on-surface-variant')}>
          {t(
            'refills.subheading',
            {},
            {
              defaultValue: 'Pill counts, refill-by dates, and pharmacy info — sorted by urgency.',
            },
          )}
        </p>
      </header>

      {/* Status summary triad */}
      {!loading && !error && (
        <section className={cm.cn('grid grid-cols-1 md:grid-cols-3 gap-4')}>
          <SummaryTile
            tone="urgent"
            value={counts.urgent}
            label={t('refills.tile.urgent', {}, { defaultValue: 'Urgent' })}
            note={t('refills.tile.urgentNote', {}, { defaultValue: 'Out within a week' })}
          />
          <SummaryTile
            tone="dueSoon"
            value={counts.dueSoon}
            label={t('refills.tile.dueSoon', {}, { defaultValue: 'Due soon' })}
            note={t('refills.tile.dueSoonNote', {}, { defaultValue: 'Refill in next 30 days' })}
          />
          <SummaryTile
            tone="fine"
            value={counts.fine}
            label={t('refills.tile.fine', {}, { defaultValue: 'Healthy supply' })}
            note={t('refills.tile.fineNote', {}, { defaultValue: 'No action needed' })}
          />
        </section>
      )}

      {/* List */}
      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('refills.loading', {}, { defaultValue: 'Loading\u2026' })}
        </p>
      ) : sorted.length === 0 ? (
        <div
          className={cm.cn(
            cm.sp('p', 12),
            cm.textCenter,
            'rounded-2xl bg-surface-container-lowest text-on-surface-variant',
          )}
        >
          <span
            className="material-symbols-outlined text-5xl text-on-surface-variant/60"
            aria-hidden="true"
          >
            inventory_2
          </span>
          <p className={cm.cn(cm.sp('mt', 3), cm.textSize('base'), cm.fontWeight('medium'))}>
            {t(
              'refills.empty',
              {},
              { defaultValue: 'No refills yet. Add a medication to start tracking.' },
            )}
          </p>
        </div>
      ) : (
        <ul className={cm.cn('space-y-3')}>
          {sorted.map((r) => (
            <li key={r.id}>
              <RefillAlertCard
                medicationName={r.medication_name}
                pillColor={r.pill_color}
                daysRemaining={r.days_remaining}
                countRemaining={r.count_remaining}
                refillsRemaining={r.refills_remaining}
                pharmacy={r.pharmacy}
                pharmacyPhone={r.pharmacy_phone}
                status={r.status}
                onRequest={() => requestRefill(r)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const TILE_BORDER: Record<'urgent' | 'dueSoon' | 'fine', string> = {
  urgent: 'var(--color-dose-missed)',
  dueSoon: 'var(--color-dose-due-soon)',
  fine: 'var(--color-dose-taken)',
}

function SummaryTile({
  tone,
  value,
  label,
  note,
}: {
  tone: 'urgent' | 'dueSoon' | 'fine'
  value: number
  label: string
  note: string
}) {
  const cm = getClassMap()
  return (
    <article
      className={cm.cn(cm.sp('p', 5), 'rounded-2xl bg-surface-container-lowest')}
      style={{ borderLeft: `4px solid ${TILE_BORDER[tone]}` }}
    >
      <p
        className={cm.cn(
          cm.fontWeight('bold'),
          cm.textSize('xs'),
          cm.sp('mb', 1),
          'uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </p>
      <p
        className={cm.cn('text-3xl font-extrabold tracking-tight')}
        style={{ color: TILE_BORDER[tone] }}
      >
        {value}
      </p>
      <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-on-surface-variant')}>{note}</p>
    </article>
  )
}
