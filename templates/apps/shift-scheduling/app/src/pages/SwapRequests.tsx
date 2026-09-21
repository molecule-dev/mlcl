import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { RequestStatusPill } from '../components/RequestStatusPill.js'
import { unwrapList } from '../lib/unwrap.js'

interface SwapRequestRow {
  id: string
  kind: 'swap' | 'drop'
  shift_id: string
  shift_role: string
  shift_date: string
  shift_time_label: string
  requester_id: string
  requester_name: string
  requester_initial: string
  target_id: string | null
  target_name: string
  status: 'pending' | 'approved' | 'denied'
  note: string
  submitted_at: string
}

interface StaffOption {
  id: string
  name: string
}

type FilterKey = 'pending' | 'all' | 'approved' | 'denied'

const FILTERS: { key: FilterKey; defaultLabel: string }[] = [
  { key: 'pending', defaultLabel: 'Pending' },
  { key: 'all', defaultLabel: 'All' },
  { key: 'approved', defaultLabel: 'Approved' },
  { key: 'denied', defaultLabel: 'Denied' },
]

export function SwapRequests() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [requests, setRequests] = useState<SwapRequestRow[]>([])
  const [staff, setStaff] = useState<StaffOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterKey>('pending')
  const [actingId, setActingId] = useState<string | null>(null)
  const [mineStaffId, setMineStaffId] = useState('')

  function refresh(): Promise<void> {
    return Promise.all([http.get('/api/swap-requests'), http.get('/api/staff')])
      .then(([wRes, sRes]) => {
        setRequests(unwrapList<SwapRequestRow>(wRes))
        setStaff(unwrapList<StaffOption>(sRes))
      })
      .catch(() => {
        setError(t('nav.failedToLoad', {}, { defaultValue: 'Failed to load.' }))
      })
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get('/api/swap-requests').catch(() => null),
      http.get('/api/staff').catch(() => null),
    ])
      .then(([wRes, sRes]) => {
        if (cancelled) return
        setRequests(unwrapList<SwapRequestRow>(wRes))
        setStaff(unwrapList<StaffOption>(sRes))
      })
      .catch(() => {
        if (!cancelled) setError(t('nav.failedToLoad', {}, { defaultValue: 'Failed to load.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  async function review(id: string, status: 'approved' | 'denied'): Promise<void> {
    setActingId(id)
    setError(null)
    try {
      await http.patch(`/api/swap-requests/${id}`, { status })
      void track({
        name: status === 'approved' ? 'swap.approved' : 'swap.denied',
        properties: { request_id: id },
      })
      await refresh()
    } catch (_err) {
      setError(t('swaps.actionFailed', {}, { defaultValue: 'Action failed.' }))
    } finally {
      setActingId(null)
    }
  }

  const filtered = filter === 'all' ? requests : requests.filter((r) => r.status === filter)
  const mine = mineStaffId ? filtered.filter((r) => r.requester_id === mineStaffId) : []
  const incoming = mineStaffId
    ? filtered.filter(
        (r) => r.requester_id !== mineStaffId && (!r.target_id || r.target_id === mineStaffId),
      )
    : filtered

  return (
    <div className={cm.cn('px-4 py-6 sm:px-8 sm:py-8', cm.stack(6))}>
      <header className={cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' })}>
        <div>
          <p
            className={cm.cn('text-[10px] font-black uppercase tracking-widest text-primary-dark')}
          >
            {t('swapRequests.eyebrow', {}, { defaultValue: 'Approvals' })}
          </p>
          <h1
            className={cm.cn(
              cm.sp('mt', 2),
              cm.textSize('4xl'),
              'font-extrabold tracking-tight text-on-surface',
            )}
          >
            {t('swapRequests.heading', {}, { defaultValue: 'Swap requests' })}
          </h1>
          <p className={cm.cn(cm.sp('mt', 1), cm.fontWeight('medium'), 'text-on-surface-variant')}>
            {t(
              'swapRequests.subheading',
              {},
              {
                defaultValue:
                  'Offer a shift to a teammate or ask to drop it — approval moves the assignment atomically.',
              },
            )}
          </p>
        </div>
        <label className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          <span
            className={cm.cn(
              'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('swapRequests.viewAs', {}, { defaultValue: 'View as' })}
          </span>
          <select
            value={mineStaffId}
            onChange={(e) => setMineStaffId(e.target.value)}
            data-mol-id="swap-requests-view-as"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              'rounded-xl border border-outline-variant/30 bg-surface-container-lowest focus:border-primary outline-none text-sm font-medium text-on-surface',
            )}
          >
            <option value="">
              {t('swapRequests.managerView', {}, { defaultValue: 'Manager (everything)' })}
            </option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </header>

      <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              'rounded-full text-[10px] font-black uppercase tracking-widest transition-colors',
              filter === f.key
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
            )}
          >
            {t(`swapRequests.filter.${f.key}`, {}, { defaultValue: f.defaultLabel })}
          </button>
        ))}
      </div>

      {loading ? (
        <p className={cm.cn('text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : error ? (
        <p className={cm.cn('text-error')}>{error}</p>
      ) : (
        <div className={cm.cn(cm.stack(8))}>
          {mineStaffId ? (
            <section
              className={cm.cn(
                cm.sp('p', 6),
                'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
              )}
            >
              <h2
                className={cm.cn(
                  cm.textSize('lg'),
                  'font-extrabold tracking-tight text-on-surface',
                )}
              >
                {t('swapRequests.mineHeading', {}, { defaultValue: 'My requests' })}
              </h2>
              {mine.length === 0 ? (
                <p className={cm.cn(cm.sp('mt', 4), cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t('swapRequests.mineEmpty', {}, { defaultValue: 'Nothing requested yet.' })}
                </p>
              ) : (
                <ul className={cm.cn(cm.sp('mt', 4), cm.stack(3))}>
                  {mine.map((r) => (
                    <RequestRow
                      key={r.id}
                      r={r}
                      t={t}
                      cm={cm}
                      actingId={actingId}
                      onReview={review}
                    />
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          <section
            className={cm.cn(
              cm.sp('p', 6),
              'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
            )}
          >
            <h2
              className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-on-surface')}
            >
              {mineStaffId
                ? t('swapRequests.incomingHeading', {}, { defaultValue: 'Incoming & team' })
                : t('swapRequests.allHeading', {}, { defaultValue: 'All requests' })}
            </h2>
            {incoming.length === 0 ? (
              <p className={cm.cn(cm.sp('mt', 4), cm.textSize('sm'), 'text-on-surface-variant')}>
                {t('swapRequests.empty', {}, { defaultValue: 'Nothing here.' })}
              </p>
            ) : (
              <ul className={cm.cn(cm.sp('mt', 4), cm.stack(3))}>
                {incoming.map((r) => (
                  <RequestRow
                    key={r.id}
                    r={r}
                    t={t}
                    cm={cm}
                    actingId={actingId}
                    onReview={review}
                  />
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

type Translate = ReturnType<typeof useTranslation>['t']
type ClassMap = ReturnType<typeof getClassMap>

function RequestRow({
  r,
  t,
  cm,
  actingId,
  onReview,
}: {
  r: SwapRequestRow
  t: Translate
  cm: ClassMap
  actingId: string | null
  onReview: (id: string, status: 'approved' | 'denied') => Promise<void>
}) {
  return (
    <li
      data-mol-id={`swap-request-${r.id}`}
      className={cm.cn(
        cm.sp('p', 4),
        'rounded-xl bg-surface-container-low border border-outline-variant/20',
      )}
    >
      <div className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
        <span className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <span
            className={cm.cn(
              'grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary-dark font-bold',
            )}
          >
            {r.requester_initial}
          </span>
          <div className={cm.cn('min-w-0')}>
            <p className={cm.cn(cm.textSize('sm'), 'font-semibold text-on-surface')}>
              {r.requester_name}{' '}
              {r.kind === 'drop'
                ? t('dashboard.wantsToDrop', {}, { defaultValue: 'wants to drop' })
                : t('dashboard.wantsToSwap', {}, { defaultValue: 'wants to swap' })}{' '}
              <Link
                to={`/shifts/${r.shift_id}`}
                className={cm.cn(
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  'inline-flex items-center text-primary-dark hover:underline',
                )}
              >
                {r.shift_role} · {r.shift_date} · {r.shift_time_label}
              </Link>
              {r.target_name ? ` → ${r.target_name}` : ''}
            </p>
            {r.note ? (
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>{r.note}</p>
            ) : null}
          </div>
        </span>
        {r.status === 'pending' ? (
          <span className={cm.flex({ align: 'center', gap: 'sm' })}>
            <button
              type="button"
              onClick={() => onReview(r.id, 'approved')}
              disabled={actingId === r.id}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'rounded-lg bg-primary text-on-primary hover:opacity-90 transition-opacity disabled:opacity-50',
              )}
            >
              {t('common.approve', {}, { defaultValue: 'Approve' })}
            </button>
            <button
              type="button"
              onClick={() => onReview(r.id, 'denied')}
              disabled={actingId === r.id}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'rounded-lg bg-error/10 text-error hover:bg-error/15 transition-colors disabled:opacity-50',
              )}
            >
              {t('common.deny', {}, { defaultValue: 'Deny' })}
            </button>
          </span>
        ) : (
          <RequestStatusPill status={r.status} />
        )}
      </div>
    </li>
  )
}
