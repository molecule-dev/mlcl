import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { QueueItem } from '../components/QueueItemRow.js'
import { QueueItemRow } from '../components/QueueItemRow.js'
import { SiftLayout } from '../components/SiftLayout.js'
import { SiftStatsCard } from '../components/SiftStatsCard.js'
import type { Verdict } from '../components/VerdictBadge.js'

interface ApiFlaggedRow {
  id: string
  content_preview: string | null
  source: string
  decision: string | null
  status: string
  submitted_at: string
  metadata: { confidence?: number; priority?: QueueItem['priority'] } | null
}

interface SummaryResponse {
  queued: number
  in_review: number
  decided: number
  escalated: number
  total: number
  approved: number
  rejected: number
}

const STATUS_TO_VERDICT: Record<string, Verdict> = {
  queued: 'pending',
  in_review: 'reviewing',
  decided: 'approved',
  escalated: 'escalated',
}

function decisionToVerdict(row: ApiFlaggedRow): Verdict {
  if (row.decision === 'approve') return 'approved'
  if (row.decision === 'reject') return 'rejected'
  if (row.status === 'escalated') return 'escalated'
  return STATUS_TO_VERDICT[row.status] ?? 'pending'
}

function relativeAge(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.max(1, Math.floor(diff / 60_000))
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const FILTERS: { id: Verdict | 'all'; labelKey: string; defaultLabel: string }[] = [
  { id: 'all', labelKey: 'queue.filter.all', defaultLabel: 'All' },
  { id: 'pending', labelKey: 'queue.filter.pending', defaultLabel: 'Pending' },
  { id: 'reviewing', labelKey: 'queue.filter.reviewing', defaultLabel: 'Reviewing' },
  { id: 'escalated', labelKey: 'queue.filter.escalated', defaultLabel: 'Escalated' },
  { id: 'rejected', labelKey: 'queue.filter.rejected', defaultLabel: 'Rejected' },
  { id: 'approved', labelKey: 'queue.filter.approved', defaultLabel: 'Approved' },
]

export function Queue() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const filterParam = searchParams.get('filter') as Verdict | 'all' | null
  const filter: Verdict | 'all' = filterParam ?? 'all'
  /** Free-text term from the top-bar search (`?q=…`). */
  const query = (searchParams.get('q') ?? '').trim().toLowerCase()
  const setFilter = (next: Verdict | 'all') => {
    const params = new URLSearchParams(searchParams)
    params.set('filter', next)
    setSearchParams(params, { replace: false })
  }
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [items, setItems] = useState<QueueItem[] | null>(null)
  const [summary, setSummary] = useState<SummaryResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  /** Keyboard cursor — index into `visible` for the J/K // Y/N shortcuts. */
  const [cursor, setCursor] = useState(0)

  function loadAll() {
    Promise.all([
      http.get<ApiFlaggedRow[]>('/api/moderation'),
      http.get<SummaryResponse>('/api/moderation/stats/summary'),
    ])
      .then(([listRes, summaryRes]) => {
        setItems(
          (listRes.data ?? []).map((row) => ({
            id: row.id,
            preview:
              row.content_preview ??
              t('queue.noPreview', {}, { defaultValue: 'No preview available' }),
            source: row.source,
            verdict: decisionToVerdict(row),
            confidence: row.metadata?.confidence ?? 0.5,
            age: relativeAge(row.submitted_at),
            priority: row.metadata?.priority ?? 'normal',
          })),
        )
        setSummary(summaryRes.data)
      })
      .catch(() => {
        setError(t('queue.loadError', {}, { defaultValue: 'Could not load the moderation queue.' }))
        setItems([])
        setSummary({
          queued: 0,
          in_review: 0,
          decided: 0,
          escalated: 0,
          total: 0,
          approved: 0,
          rejected: 0,
        })
      })
  }

  useEffect(() => {
    let cancelled = false
    Promise.all([
      http.get<ApiFlaggedRow[]>('/api/moderation'),
      http.get<SummaryResponse>('/api/moderation/stats/summary'),
    ])
      .then(([listRes, summaryRes]) => {
        if (cancelled) return
        setItems(
          (listRes.data ?? []).map((row) => ({
            id: row.id,
            preview:
              row.content_preview ??
              t('queue.noPreview', {}, { defaultValue: 'No preview available' }),
            source: row.source,
            verdict: decisionToVerdict(row),
            confidence: row.metadata?.confidence ?? 0.5,
            age: relativeAge(row.submitted_at),
            priority: row.metadata?.priority ?? 'normal',
          })),
        )
        setSummary(summaryRes.data)
      })
      .catch(() => {
        if (cancelled) return
        setError(t('queue.loadError', {}, { defaultValue: 'Could not load the moderation queue.' }))
        setItems([])
        setSummary({
          queued: 0,
          in_review: 0,
          decided: 0,
          escalated: 0,
          total: 0,
          approved: 0,
          rejected: 0,
        })
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const visible = useMemo(() => {
    if (!items) return []
    let list = filter === 'all' ? items : items.filter((i) => i.verdict === filter)
    if (query) {
      list = list.filter(
        (i) => i.preview.toLowerCase().includes(query) || i.source.toLowerCase().includes(query),
      )
    }
    return list
  }, [items, filter, query])

  // Keep the keyboard cursor inside the visible list (filter changes, decisions).
  useEffect(() => {
    setCursor((prev) => Math.max(0, Math.min(prev, visible.length - 1)))
  }, [visible.length, filter])

  // J/K row navigation + Y/N approve/reject — the keyboard-driven queue the
  // subheading advertises. Re-subscribed each render so the handler always
  // sees the latest cursor/visible/busy state.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return
      }
      const key = event.key.toLowerCase()
      if (key === 'j') {
        event.preventDefault()
        setCursor((prev) => Math.min(prev + 1, Math.max(0, visible.length - 1)))
      } else if (key === 'k') {
        event.preventDefault()
        setCursor((prev) => Math.max(0, prev - 1))
      } else if (key === 'y') {
        event.preventDefault()
        void decideFocused('approve')
      } else if (key === 'n') {
        event.preventDefault()
        void decideFocused('reject')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  const toggleAll = () => {
    if (selected.size === visible.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(visible.map((i) => i.id)))
    }
  }

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function decideFocused(action: 'approve' | 'reject') {
    const item = visible[cursor]
    if (!item || busy) return
    // Only act on rows still awaiting a decision.
    if (item.verdict === 'approved' || item.verdict === 'rejected') return
    setBusy(true)
    setError(null)
    try {
      if (action === 'approve') {
        await http.post(`/api/moderation/${item.id}/approve`, {})
      } else {
        await http.post(`/api/moderation/${item.id}/reject`, { reason: 'other' })
      }
      loadAll()
    } catch (error) {
      logError('queue.keyboardDecision', error)
      setError(
        t('queue.decideError', {}, { defaultValue: 'Could not record the decision. Try again.' }),
      )
    } finally {
      setBusy(false)
    }
  }

  async function bulkAction(action: 'approve' | 'reject') {
    if (selected.size === 0) return
    setBusy(true)
    setError(null)
    try {
      const ids = Array.from(selected)
      await Promise.all(
        ids.map((id) =>
          action === 'approve'
            ? http.post(`/api/moderation/${id}/approve`, {})
            : http.post(`/api/moderation/${id}/reject`, { reason: 'bulk' }),
        ),
      )
      setSelected(new Set())
      loadAll()
    } catch (error) {
      logError('queue.bulkAction', error)
      setError(t('queue.bulkError', {}, { defaultValue: 'Bulk action failed. Please try again.' }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <SiftLayout>
      <section>
        <h1
          className={cm.cn('text-4xl font-bold tracking-tight font-headline text-on-surface mb-2')}
        >
          {t('queue.heading', {}, { defaultValue: 'Moderation queue' })}
        </h1>
        <p className={cm.cn('text-on-surface-variant')}>
          {t(
            'queue.subheading',
            {},
            {
              defaultValue:
                'Triage flagged content with AI assistance. Use J/K to navigate rows, Y/N to approve/reject.',
            },
          )}
        </p>
        {error && (
          <div
            role="alert"
            className={cm.cn(
              'mt-4 rounded-lg border-l-4 border-red-500 bg-error-light px-4 py-3 text-sm text-error',
            )}
          >
            {error}
          </div>
        )}
      </section>

      <section
        aria-label={t('queue.kpis', {}, { defaultValue: 'Queue KPIs' })}
        className={cm.cn(cm.grid({ cols: 4, gap: 6 }))}
      >
        <SiftStatsCard
          label={t('status.queued', {}, { defaultValue: 'Queued' })}
          value={summary?.queued ?? '—'}
          icon="inbox"
          tone="amber"
        />
        <SiftStatsCard
          label={t('queue.kpi.inReview', {}, { defaultValue: 'In review' })}
          value={summary?.in_review ?? '—'}
          icon="hourglass_top"
          tone="primary"
          accented
        />
        <SiftStatsCard
          label={t('queue.kpi.escalated', {}, { defaultValue: 'Escalated' })}
          value={summary?.escalated ?? '—'}
          icon="priority_high"
          tone="red"
        />
        <SiftStatsCard
          label={t('queue.kpi.decided', {}, { defaultValue: 'Decided' })}
          value={summary?.decided ?? '—'}
          icon="task_alt"
          tone="emerald"
        />
      </section>

      <section
        className={cm.cn('rounded-xl bg-surface-container-lowest shadow-sm overflow-hidden')}
      >
        <header className={cm.cn('border-b border-surface-container px-6 py-4')}>
          <div
            className={cm.cn(cm.flex({ justify: 'between', align: 'center' }), 'gap-4 flex-wrap')}
          >
            <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-2 flex-wrap')}>
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={cm.cn(
                    'px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border transition-colors',
                    filter === f.id
                      ? 'bg-primary text-white border-primary'
                      : 'bg-surface-container-low text-on-surface-variant border-surface-container hover:bg-surface-container',
                  )}
                  aria-pressed={filter === f.id}
                >
                  {t(f.labelKey, {}, { defaultValue: f.defaultLabel })}
                </button>
              ))}
            </div>
            <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-3')}>
              {selected.size > 0 ? (
                <span className={cm.cn('text-xs text-on-surface-variant font-medium')}>
                  {t(
                    'queue.selectedCount',
                    { count: selected.size },
                    { defaultValue: `${selected.size} selected` },
                  )}
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => bulkAction('approve')}
                disabled={selected.size === 0 || busy}
                className={cm.cn(
                  'bg-emerald-600 text-white px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-500 transition-colors',
                )}
              >
                {t('queue.bulkApprove', {}, { defaultValue: 'Approve' })}
              </button>
              <button
                type="button"
                onClick={() => bulkAction('reject')}
                disabled={selected.size === 0 || busy}
                className={cm.cn(
                  'bg-red-600 text-white px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide disabled:opacity-40 disabled:cursor-not-allowed hover:bg-red-500 transition-colors',
                )}
              >
                {t('queue.bulkReject', {}, { defaultValue: 'Reject' })}
              </button>
            </div>
          </div>
        </header>
        <div className={cm.cn('overflow-x-auto')}>
          <table className={cm.cn('w-full text-left border-collapse')}>
            <thead>
              <tr
                className={cm.cn(
                  'bg-surface-container-low text-[10px] uppercase tracking-widest text-on-surface-variant font-bold',
                )}
              >
                <th className={cm.cn('py-3 px-4 w-10 text-center')}>
                  <input
                    type="checkbox"
                    aria-label={t('queue.selectAll', {}, { defaultValue: 'Select all' })}
                    checked={visible.length > 0 && selected.size === visible.length}
                    onChange={toggleAll}
                    className={cm.cn('w-4 h-4 rounded text-primary')}
                  />
                </th>
                <th className={cm.cn('py-3 px-4 w-12 text-center')}>!</th>
                <th className={cm.cn('py-3 px-4 w-1/3')}>
                  {t('queue.col.preview', {}, { defaultValue: 'Content preview' })}
                </th>
                <th className={cm.cn('py-3 px-4')}>
                  {t('queue.col.source', {}, { defaultValue: 'Source' })}
                </th>
                <th className={cm.cn('py-3 px-4')}>
                  {t('queue.col.verdict', {}, { defaultValue: 'Verdict' })}
                </th>
                <th className={cm.cn('py-3 px-4 text-center')}>
                  {t('queue.col.confidence', {}, { defaultValue: 'Confidence' })}
                </th>
                <th className={cm.cn('py-3 px-4 text-right')}>
                  {t('queue.col.time', {}, { defaultValue: 'Time' })}
                </th>
              </tr>
            </thead>
            <tbody
              className={cm.cn(
                'text-sm divide-y divide-surface-container text-on-surface bg-surface-container-lowest',
              )}
            >
              {items === null && (
                <tr>
                  <td
                    colSpan={7}
                    className={cm.cn('px-6 py-12 text-center text-sm text-on-surface-variant')}
                  >
                    {t('queue.loading', {}, { defaultValue: 'Loading queue…' })}
                  </td>
                </tr>
              )}
              {visible.map((item, index) => (
                <QueueItemRow
                  key={item.id}
                  item={item}
                  selectable
                  selected={selected.has(item.id)}
                  onToggleSelect={toggleOne}
                  active={index === cursor}
                />
              ))}
              {items !== null && visible.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className={cm.cn('px-6 py-12 text-center text-sm text-on-surface-variant')}
                  >
                    {t(
                      'queue.empty',
                      {},
                      { defaultValue: 'No items match this filter. Try widening your selection.' },
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </SiftLayout>
  )
}

export default Queue
