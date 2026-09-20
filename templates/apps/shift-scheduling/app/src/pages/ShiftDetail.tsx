import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { RequestStatusPill } from '../components/RequestStatusPill.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Shift {
  id: string
  staff_id: string | null
  staff_name: string
  staff_initial: string
  is_open: boolean
  role: string
  date: string
  start_time: string
  end_time: string
  time_label: string
  duration_hours: number
  published: boolean
  notes: string
  assigned_via: string
  availability_warning: string | null
}

interface SwapRequestRow {
  id: string
  kind: 'swap' | 'drop'
  shift_id: string
  requester_name: string
  requester_initial: string
  target_name: string
  status: 'pending' | 'approved' | 'denied'
  note: string
  submitted_at: string
}

interface ClaimRow {
  id: string
  staff_name: string
  staff_initial: string
  status: 'pending' | 'approved' | 'denied'
  submitted_at: string
}

interface StaffOption {
  id: string
  name: string
  role: string
}

const ASSIGNED_VIA_LABEL: Record<string, string> = {
  assigned: 'Scheduled by manager',
  claim: 'Claimed via open shift',
  swap: 'Arrived via swap',
}

export function ShiftDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [shift, setShift] = useState<Shift | null>(null)
  const [swaps, setSwaps] = useState<SwapRequestRow[]>([])
  const [claims, setClaims] = useState<ClaimRow[]>([])
  const [staff, setStaff] = useState<StaffOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [acting, setActing] = useState<string | null>(null)
  const [requesting, setRequesting] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)
  const [requestDraft, setRequestDraft] = useState<{
    kind: 'swap' | 'drop'
    target_staff_id: string
    note: string
  }>({
    kind: 'drop',
    target_staff_id: '',
    note: '',
  })

  function refresh(): Promise<void> {
    if (!id) return Promise.resolve()
    return Promise.all([
      http.get(`/api/shifts/${id}`),
      http.get(`/api/swap-requests?staff_id=${shift?.staff_id ?? ''}`),
      http.get(`/api/claims?shift_id=${id}`),
      http.get('/api/staff'),
    ])
      .then(([sRes, wRes, cRes, stRes]) => {
        const loaded = unwrapSingle<Shift>(sRes)
        setShift(loaded)
        setSwaps(unwrapList<SwapRequestRow>(wRes).filter((w) => w.shift_id === id))
        setClaims(unwrapList<ClaimRow>(cRes))
        setStaff(unwrapList<StaffOption>(stRes))
      })
      .catch(() => {
        setError(t('nav.failedToLoad', {}, { defaultValue: 'Failed to load.' }))
      })
  }

  useEffect(() => {
    let cancelled = false
    if (!id) return
    setLoading(true)
    Promise.all([
      http.get(`/api/shifts/${id}`).catch(() => null),
      http.get('/api/staff').catch(() => null),
      http.get(`/api/claims?shift_id=${id}`).catch(() => null),
    ])
      .then(async ([sRes, stRes, cRes]) => {
        if (cancelled || !sRes) return
        const loaded = unwrapSingle<Shift>(sRes)
        setShift(loaded)
        setStaff(unwrapList<StaffOption>(stRes))
        setClaims(unwrapList<ClaimRow>(cRes))
        if (loaded?.staff_id) {
          const wRes = await http
            .get(`/api/swap-requests?staff_id=${loaded.staff_id}`)
            .catch(() => null)
          if (wRes && !cancelled) {
            setSwaps(unwrapList<SwapRequestRow>(wRes).filter((w) => w.shift_id === id))
          }
        }
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
  }, [http, id, t])

  const activeSwaps = useMemo(() => swaps.filter((w) => w.status === 'pending'), [swaps])

  async function reviewSwap(swapId: string, status: 'approved' | 'denied'): Promise<void> {
    setActing(swapId)
    setError(null)
    try {
      await http.patch(`/api/swap-requests/${swapId}`, { status })
      await refresh()
    } catch (_err) {
      setError(t('swaps.actionFailed', {}, { defaultValue: 'Action failed.' }))
    } finally {
      setActing(null)
    }
  }

  async function reviewClaim(claimId: string, status: 'approved' | 'denied'): Promise<void> {
    setActing(claimId)
    setError(null)
    try {
      await http.patch(`/api/claims/${claimId}`, { status })
      await refresh()
    } catch (_err) {
      setError(t('claims.actionFailed', {}, { defaultValue: 'Action failed.' }))
    } finally {
      setActing(null)
    }
  }

  async function submitRequest(): Promise<void> {
    if (!shift) return
    setRequestError(null)
    if (!shift.staff_id) return
    if (requestDraft.kind === 'swap' && !requestDraft.target_staff_id) {
      setRequestError(
        t(
          'shiftDetail.targetRequired',
          {},
          { defaultValue: 'Pick a teammate to hand the shift to.' },
        ),
      )
      return
    }
    setRequesting(true)
    try {
      await http.post('/api/swap-requests', {
        kind: requestDraft.kind,
        from_shift: shift.id,
        requester_staff_id: shift.staff_id,
        target_staff_id: requestDraft.kind === 'swap' ? requestDraft.target_staff_id : null,
        note: requestDraft.note || '',
      })
      setRequestDraft({ kind: 'drop', target_staff_id: '', note: '' })
      await refresh()
    } catch (err) {
      const msg =
        (err && typeof err === 'object' && 'message' in err ? String(err.message) : '') ||
        t('shiftDetail.requestFailed', {}, { defaultValue: 'Failed to submit the request.' })
      setRequestError(msg)
    } finally {
      setRequesting(false)
    }
  }

  async function removeShift(): Promise<void> {
    if (!shift) return
    setActing('delete')
    try {
      await http.delete(`/api/shifts/${shift.id}`)
      navigate('/schedule')
    } catch (_err) {
      setError(t('shiftDetail.deleteFailed', {}, { defaultValue: 'Delete failed.' }))
    } finally {
      setActing(null)
    }
  }

  if (loading)
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  if (error || !shift)
    return (
      <div className={cm.cn(cm.sp('p', 8), cm.stack(4))}>
        <p className={cm.cn('text-error')}>
          {error ?? t('shiftDetail.notFound', {}, { defaultValue: 'Shift not found.' })}
        </p>
        <Link
          to="/schedule"
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'text-primary-dark hover:underline',
          )}
        >
          {t('shiftDetail.backToSchedule', {}, { defaultValue: '← Back to schedule' })}
        </Link>
      </div>
    )

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.stack(6))}>
      <Link
        to="/schedule"
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('semibold'),
          'text-primary-dark hover:text-primary-container transition-colors',
        )}
      >
        {t('shiftDetail.backToSchedule', {}, { defaultValue: '← Back to schedule' })}
      </Link>

      <header className={cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' })}>
        <div>
          <p
            className={cm.cn('text-[10px] font-black uppercase tracking-widest text-primary-dark')}
          >
            {shift.date} · {shift.time_label}
          </p>
          <h1
            className={cm.cn(
              cm.sp('mt', 2),
              cm.textSize('4xl'),
              'font-extrabold tracking-tight text-on-surface',
            )}
          >
            {shift.role} {t('common.shiftNoun', {}, { defaultValue: 'shift' })}
          </h1>
          <p className={cm.cn(cm.sp('mt', 1), cm.fontWeight('medium'), 'text-on-surface-variant')}>
            {shift.duration_hours}{' '}
            {t('shiftDetail.hours', { count: shift.duration_hours }, { defaultValue: 'h' })} ·{' '}
            {ASSIGNED_VIA_LABEL[shift.assigned_via] ?? shift.assigned_via}
          </p>
        </div>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <span
            className={cm.cn(
              cm.sp('px', 2),
              cm.sp('py', 1),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'rounded-full uppercase tracking-wider',
              shift.published
                ? 'bg-[color:var(--color-published-bg)] text-[color:var(--color-published)]'
                : 'bg-[color:var(--color-draft-bg)] text-[color:var(--color-draft)]',
            )}
            data-mol-id="shift-detail-publish-state"
          >
            {shift.published
              ? t('schedule.state.published', {}, { defaultValue: 'Published' })
              : t('common.draft', {}, { defaultValue: 'Draft' })}
          </span>
          <button
            type="button"
            data-mol-id="shift-detail-delete"
            onClick={removeShift}
            disabled={acting === 'delete'}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'rounded-lg bg-error/10 text-error hover:bg-error/15 transition-colors disabled:opacity-50',
            )}
          >
            {t('common.delete', {}, { defaultValue: 'Delete' })}
          </button>
        </div>
      </header>

      <div className={cm.cn('grid gap-6 lg:grid-cols-12')}>
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'lg:col-span-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
            cm.stack(5),
          )}
        >
          <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-on-surface')}>
            {t('shiftDetail.assignmentHeading', {}, { defaultValue: 'Assignment' })}
          </h2>
          {shift.is_open ? (
            <div
              className={cm.cn(
                cm.sp('p', 4),
                'rounded-xl border border-dashed border-outline-variant/50 bg-surface-container-low',
              )}
            >
              <p
                className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-primary-dark')}
              >
                {t('shiftDetail.openShift', {}, { defaultValue: 'Open shift — awaiting a claim' })}
              </p>
              <p className={cm.cn(cm.sp('mt', 1), cm.textSize('xs'), 'text-on-surface-variant')}>
                {t(
                  'shiftDetail.openHint',
                  {},
                  { defaultValue: 'Staff can claim it from Open shifts; approve a claim below.' },
                )}
              </p>
            </div>
          ) : (
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
              <span
                className={cm.cn(
                  'grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary-dark font-bold text-lg',
                )}
              >
                {shift.staff_initial}
              </span>
              <div>
                <p className={cm.cn(cm.textSize('base'), 'font-bold text-on-surface')}>
                  {shift.staff_name}
                </p>
                {shift.availability_warning ? (
                  <p
                    data-mol-id="shift-detail-availability-warning"
                    className={cm.cn(
                      cm.sp('mt', 1),
                      cm.textSize('xs'),
                      'inline-flex items-center gap-1 rounded-full px-2 py-1 font-bold',
                      'bg-[color:var(--color-warn-flag-bg)] text-[color:var(--color-warn-flag)]',
                    )}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-[14px]')}
                      aria-hidden="true"
                    >
                      warning
                    </span>
                    {shift.availability_warning === 'blackout_date'
                      ? t(
                          'shiftDetail.blackoutWarning',
                          {},
                          { defaultValue: 'Black-out date for this person' },
                        )
                      : t(
                          'shiftDetail.availabilityWarning',
                          {},
                          { defaultValue: 'Outside declared availability' },
                        )}
                  </p>
                ) : null}
              </div>
            </div>
          )}
          {shift.notes ? (
            <div>
              <p
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('shiftDetail.notes', {}, { defaultValue: 'Notes' })}
              </p>
              <p className={cm.cn(cm.sp('mt', 1), cm.textSize('sm'), 'text-on-surface-variant')}>
                {shift.notes}
              </p>
            </div>
          ) : null}

          {!shift.is_open ? (
            <div
              className={cm.cn(
                cm.sp('p', 4),
                'rounded-xl bg-surface-container-low border border-outline-variant/20',
                cm.stack(3),
              )}
            >
              <p
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('shiftDetail.requestHeading', {}, { defaultValue: 'Request a swap or drop' })}
              </p>
              <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                {(['drop', 'swap'] as const).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => setRequestDraft({ ...requestDraft, kind })}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'rounded-full uppercase tracking-widest transition-colors',
                      requestDraft.kind === kind
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container',
                    )}
                  >
                    {kind === 'drop'
                      ? t('shiftDetail.drop', {}, { defaultValue: 'Drop' })
                      : t('shiftDetail.swap', {}, { defaultValue: 'Swap' })}
                  </button>
                ))}
              </div>
              {requestDraft.kind === 'swap' ? (
                <label className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
                  <span
                    className={cm.cn(
                      'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('shiftDetail.handTo', {}, { defaultValue: 'Hand to' })}
                  </span>
                  <select
                    value={requestDraft.target_staff_id}
                    onChange={(e) =>
                      setRequestDraft({ ...requestDraft, target_staff_id: e.target.value })
                    }
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'rounded-xl border border-outline-variant/30 bg-surface-container-lowest focus:border-primary outline-none text-sm font-medium text-on-surface',
                    )}
                  >
                    <option value="">
                      {t('shiftDetail.pickTeammate', {}, { defaultValue: 'Pick a teammate…' })}
                    </option>
                    {staff
                      .filter((s) => s.id !== shift.staff_id)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} · {s.role}
                        </option>
                      ))}
                  </select>
                </label>
              ) : null}
              <label className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
                <span
                  className={cm.cn(
                    'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('shiftDetail.noteLabel', {}, { defaultValue: 'Note' })}
                </span>
                <input
                  type="text"
                  value={requestDraft.note}
                  onChange={(e) => setRequestDraft({ ...requestDraft, note: e.target.value })}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'rounded-xl border border-outline-variant/30 bg-surface-container-lowest focus:border-primary outline-none text-sm font-medium text-on-surface',
                  )}
                />
              </label>
              {requestError ? (
                <p className={cm.cn(cm.textSize('xs'), 'text-error font-semibold')}>
                  {requestError}
                </p>
              ) : null}
              <button
                type="button"
                data-mol-id="shift-detail-submit-request"
                onClick={submitRequest}
                disabled={requesting}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'rounded-lg bg-primary text-on-primary hover:opacity-90 transition-opacity disabled:opacity-50',
                )}
              >
                {requesting
                  ? t('common.submittingEllipsis', {}, { defaultValue: 'Submitting…' })
                  : t('shiftDetail.submitRequest', {}, { defaultValue: 'Submit request' })}
              </button>
            </div>
          ) : null}
        </section>

        <section
          className={cm.cn(
            cm.sp('p', 6),
            'lg:col-span-7 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
          )}
        >
          <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-on-surface')}>
            {t('shiftDetail.requestsHeading', {}, { defaultValue: 'Swap & drop requests' })}
          </h2>
          {activeSwaps.length === 0 ? (
            <p className={cm.cn(cm.sp('mt', 4), cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('shiftDetail.noRequests', {}, { defaultValue: 'No open requests on this shift.' })}
            </p>
          ) : (
            <ul className={cm.cn(cm.sp('mt', 4), cm.stack(3))}>
              {activeSwaps.map((w) => (
                <li
                  key={w.id}
                  data-mol-id={`shift-detail-swap-${w.id}`}
                  className={cm.cn(
                    cm.sp('p', 4),
                    'rounded-xl bg-surface-container-low border border-outline-variant/20',
                  )}
                >
                  <div className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
                    <div className={cm.cn('min-w-0 flex-1')}>
                      <p className={cm.cn(cm.textSize('sm'), 'font-semibold text-on-surface')}>
                        {w.requester_name}{' '}
                        {w.kind === 'drop'
                          ? t('dashboard.wantsToDrop', {}, { defaultValue: 'wants to drop' })
                          : t('dashboard.wantsToSwap', {}, { defaultValue: 'wants to swap' })}
                        {w.target_name ? ` → ${w.target_name}` : ''}
                      </p>
                      {w.note ? (
                        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                          {w.note}
                        </p>
                      ) : null}
                    </div>
                    <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                      <button
                        type="button"
                        onClick={() => reviewSwap(w.id, 'approved')}
                        disabled={acting === w.id}
                        className={cm.cn(
                          cm.sp('px', 3),
                          cm.sp('py', 1),
                          cm.textSize('xs'),
                          cm.fontWeight('bold'),
                          'rounded-lg bg-primary text-on-primary hover:opacity-90 transition-opacity disabled:opacity-50',
                        )}
                      >
                        {t('common.approve', {}, { defaultValue: 'Approve' })}
                      </button>
                      <button
                        type="button"
                        onClick={() => reviewSwap(w.id, 'denied')}
                        disabled={acting === w.id}
                        className={cm.cn(
                          cm.sp('px', 3),
                          cm.sp('py', 1),
                          cm.textSize('xs'),
                          cm.fontWeight('bold'),
                          'rounded-lg bg-error/10 text-error hover:bg-error/15 transition-colors disabled:opacity-50',
                        )}
                      >
                        {t('common.deny', {}, { defaultValue: 'Deny' })}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <h2
            className={cm.cn(
              cm.sp('mt', 8),
              cm.textSize('lg'),
              'font-extrabold tracking-tight text-on-surface',
            )}
          >
            {t('shiftDetail.claimsHeading', {}, { defaultValue: 'Claims' })}
          </h2>
          {claims.length === 0 ? (
            <p className={cm.cn(cm.sp('mt', 4), cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'shiftDetail.noClaims',
                {},
                { defaultValue: 'Nobody has claimed this shift yet.' },
              )}
            </p>
          ) : (
            <ul className={cm.cn(cm.sp('mt', 4), cm.stack(3))}>
              {claims.map((c) => (
                <li
                  key={c.id}
                  data-mol-id={`shift-detail-claim-${c.id}`}
                  className={cm.cn(
                    cm.sp('p', 4),
                    'rounded-xl bg-surface-container-low border border-outline-variant/20',
                    cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                  )}
                >
                  <span className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                    <span
                      className={cm.cn(
                        'grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary-dark font-bold text-sm',
                      )}
                    >
                      {c.staff_initial}
                    </span>
                    <span className={cm.cn(cm.textSize('sm'), 'font-semibold text-on-surface')}>
                      {c.staff_name}
                    </span>
                  </span>
                  {c.status === 'pending' ? (
                    <span className={cm.flex({ align: 'center', gap: 'sm' })}>
                      <button
                        type="button"
                        onClick={() => reviewClaim(c.id, 'approved')}
                        disabled={acting === c.id}
                        className={cm.cn(
                          cm.sp('px', 3),
                          cm.sp('py', 1),
                          cm.textSize('xs'),
                          cm.fontWeight('bold'),
                          'rounded-lg bg-primary text-on-primary hover:opacity-90 transition-opacity disabled:opacity-50',
                        )}
                      >
                        {t('common.approve', {}, { defaultValue: 'Approve' })}
                      </button>
                      <button
                        type="button"
                        onClick={() => reviewClaim(c.id, 'denied')}
                        disabled={acting === c.id}
                        className={cm.cn(
                          cm.sp('px', 3),
                          cm.sp('py', 1),
                          cm.textSize('xs'),
                          cm.fontWeight('bold'),
                          'rounded-lg bg-error/10 text-error hover:bg-error/15 transition-colors disabled:opacity-50',
                        )}
                      >
                        {t('common.deny', {}, { defaultValue: 'Deny' })}
                      </button>
                    </span>
                  ) : (
                    <RequestStatusPill status={c.status} />
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
