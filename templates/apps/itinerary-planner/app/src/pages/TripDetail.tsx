/**
 * TripDetail — fetches a real trip + its activities + collaborators.
 * Hero shows cover + dates + budget. Day-by-day timeline groups
 * activities by `day_index`. Edit/Share/Add-activity wire to the
 * real backend; collaborator invite POSTs to /collaborators.
 */

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import {
  type ActivityCategory,
  type ActivityItem,
  DayTimelineRow,
} from '../components/DayTimelineRow.js'
import type { ActivityRow, CollaboratorRow, TripRow } from '../lib/api.js'

function fmtRange(start: string, end: string): string {
  const a = new Date(start).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })
  const b = new Date(end).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  return `${a} \u2013 ${b}`
}

function fmtMoney(cents?: number | string | null): string {
  const n = Number(cents ?? 0)
  if (!n) return ''
  return `$${Math.round(n / 100).toLocaleString()}`
}

function initials(s: string): string {
  return (s || '?')
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => (p[0] || '').toUpperCase())
    .join('')
}

const ALLOWED_CATS: ReadonlyArray<ActivityCategory> = [
  'accommodation',
  'food',
  'sightseeing',
  'transport',
  'activity',
  'shopping',
]
function coerceCategory(kind: string): ActivityCategory {
  const lower = (kind || '').toLowerCase()
  if (lower === 'rest' || lower === 'lodging' || lower === 'accommodation') return 'accommodation'
  if (lower === 'food') return 'food'
  if (lower === 'sightseeing') return 'sightseeing'
  if (lower === 'transport' || lower === 'transit') return 'transport'
  if (lower === 'activity' || lower === 'activities') return 'activity'
  if (lower === 'shopping') return 'shopping'
  return ALLOWED_CATS.includes(lower as ActivityCategory)
    ? (lower as ActivityCategory)
    : 'sightseeing'
}

function rowToActivityItem(row: ActivityRow): ActivityItem {
  return {
    id: row.id,
    title: row.title,
    category: coerceCategory(row.kind),
    start_time:
      row.start_time ||
      (row.starts_at
        ? new Date(row.starts_at).toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
          })
        : '--:--'),
    duration_minutes:
      row.starts_at && row.ends_at
        ? Math.max(
            15,
            Math.round(
              (new Date(row.ends_at).getTime() - new Date(row.starts_at).getTime()) / 60000,
            ),
          )
        : 60,
    location: row.location_name ?? row.address ?? undefined,
    notes: row.notes ?? undefined,
  }
}

export function TripDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const acceptedRef = useRef(false)

  const [trip, setTrip] = useState<TripRow | null>(null)
  const [activities, setActivities] = useState<ActivityRow[]>([])
  const [collaborators, setCollaborators] = useState<CollaboratorRow[]>([])
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(true)

  // share
  const [shareInfo, setShareInfo] = useState<{ url: string; copied: boolean } | null>(null)

  // invite
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteSent, setInviteSent] = useState<string>('')

  // add-activity
  const [showAddActivity, setShowAddActivity] = useState(false)
  const [activityForm, setActivityForm] = useState({
    title: '',
    day_index: 0,
    kind: 'sightseeing' as ActivityCategory,
  })
  const [addingActivity, setAddingActivity] = useState(false)

  const refresh = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const [tripResp, actsResp, collabResp] = await Promise.all([
        http.get<TripRow>(`/trips/${id}`),
        http.get<ActivityRow[]>(`/activities?trip_id=${id}`),
        http
          .get<CollaboratorRow[]>(`/collaborators?trip_id=${id}`)
          .catch(() => ({ data: [] as CollaboratorRow[] })),
      ])
      setTrip(tripResp.data)
      setActivities(Array.isArray(actsResp.data) ? actsResp.data : [])
      setCollaborators(Array.isArray(collabResp.data) ? collabResp.data : [])
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('tripDetail.errors.load', {}, { defaultValue: 'Could not load trip.' }),
      )
    } finally {
      setLoading(false)
    }
  }, [http, id, t])

  useEffect(() => {
    // Collaboration invite: the email links here as /trips/:id?invite=<token>. Redeem
    // it FIRST (adds this user as a collaborator so the trip becomes readable), strip
    // the token from the URL, THEN load. A consumed/invalid token is non-fatal — the
    // user may already be a collaborator, so we still attempt the load.
    const inviteToken = searchParams.get('invite')
    if (inviteToken && !acceptedRef.current) {
      acceptedRef.current = true
      void (async () => {
        try {
          await http.post('/api/collaborators/accept', { token: inviteToken })
        } catch (_error) {
          // Already redeemed / not for this account — fall through and try to load.
        }
        const next = new URLSearchParams(searchParams)
        next.delete('invite')
        setSearchParams(next, { replace: true })
        void refresh()
      })()
    } else if (!inviteToken) {
      void refresh()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh])

  const days = useMemo(() => {
    const map = new Map<number, ActivityRow[]>()
    for (const row of activities) {
      const idx = Number(row.day_index ?? 0)
      const list = map.get(idx) ?? []
      list.push(row)
      map.set(idx, list)
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([dayIdx, rows]) => ({
        day: dayIdx + 1,
        date_iso: trip?.start_date
          ? new Date(new Date(trip.start_date).getTime() + dayIdx * 86_400_000).toISOString()
          : new Date().toISOString(),
        activities: rows
          .sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0))
          .map(rowToActivityItem),
      }))
  }, [activities, trip])

  const handleShare = async () => {
    if (!trip) return
    try {
      const resp = await http.post<TripRow>(`/trips/${trip.id}/share`, {})
      const updated = resp.data
      setTrip(updated)
      const url = `${window.location.origin}/trips/${trip.id}?share=${updated.share_token}`
      setShareInfo({ url, copied: false })
      void track({ name: 'itinerary.shared', properties: { trip_id: trip.id } })
      try {
        await navigator.clipboard.writeText(url)
        setShareInfo({ url, copied: true })
      } catch (_error) {
        // clipboard may not be available — keep url visible
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('tripDetail.errors.share', {}, { defaultValue: 'Could not share trip.' }),
      )
    }
  }

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault()
    if (!trip || !inviteEmail) return
    setInviting(true)
    setInviteError('')
    try {
      await http.post(`/collaborators`, { trip_id: trip.id, email: inviteEmail, role: 'editor' })
      setInviteSent(inviteEmail)
      setInviteEmail('')
      // No email in properties — ids and roles only.
      void track({ name: 'collaborator.invited', properties: { trip_id: trip.id, role: 'editor' } })
      await refresh()
    } catch (err) {
      setInviteError(
        err instanceof Error
          ? err.message
          : t('tripDetail.errors.invite', {}, { defaultValue: 'Could not send invite.' }),
      )
    } finally {
      setInviting(false)
    }
  }

  const handleAddActivity = async (e: FormEvent) => {
    e.preventDefault()
    if (!trip || !activityForm.title) return
    setAddingActivity(true)
    try {
      const dayIdx = Number(activityForm.day_index) || 0
      const sameDay = activities.filter((a) => Number(a.day_index ?? 0) === dayIdx)
      const position = sameDay.length
      await http.post(`/activities`, {
        trip_id: trip.id,
        title: activityForm.title,
        kind:
          activityForm.kind === 'sightseeing'
            ? 'sightseeing'
            : activityForm.kind === 'food'
              ? 'food'
              : activityForm.kind === 'transport'
                ? 'transport'
                : 'rest',
        day_index: dayIdx,
        position,
      })
      setActivityForm({ title: '', day_index: dayIdx, kind: 'sightseeing' })
      setShowAddActivity(false)
      void track({
        name: 'activity.added',
        properties: { trip_id: trip.id, kind: activityForm.kind, day_index: dayIdx },
      })
      await refresh()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('tripDetail.errors.addActivity', {}, { defaultValue: 'Could not add activity.' }),
      )
    } finally {
      setAddingActivity(false)
    }
  }

  if (loading && !trip) {
    return (
      <div className={cm.cn(cm.maxW('5xl'), cm.sp('px', 8), cm.sp('py', 12), cm.mxAuto)}>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('tripDetail.loading', {}, { defaultValue: 'Loading trip\u2026' })}
        </p>
      </div>
    )
  }

  if (!trip) {
    return (
      <div
        className={cm.cn(
          cm.maxW('5xl'),
          cm.sp('px', 8),
          cm.sp('py', 12),
          cm.mxAuto,
          cm.flex({ direction: 'col', gap: 'md' }),
        )}
      >
        <h1
          className={cm.cn(cm.textSize('2xl'), cm.fontWeight('extrabold'))}
          style={{ fontFamily: 'var(--font-headline)' }}
        >
          {t('tripDetail.notFound.heading', {}, { defaultValue: 'Trip not found' })}
        </h1>
        {error ? <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{error}</p> : null}
        <Link
          to="/trips"
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'text-primary hover:underline',
          )}
        >
          {t('tripDetail.backToTrips', {}, { defaultValue: 'Back to all trips' })}
        </Link>
      </div>
    )
  }

  const start = trip.start_date ?? trip.created_at
  const end = trip.end_date ?? trip.start_date ?? trip.created_at
  const cover = trip.cover_url ?? `https://picsum.photos/seed/${trip.id}/1600/900`

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
      <section className={cm.cn('relative overflow-hidden bg-surface-container-low')}>
        <img
          src={cover}
          alt=""
          aria-hidden="true"
          className={cm.cn(cm.w('full'), 'absolute inset-0 h-72 object-cover')}
        />
        <div
          className={cm.cn(
            'absolute inset-0 h-72 bg-gradient-to-t from-black/80 via-black/40 to-transparent',
          )}
          aria-hidden="true"
        />
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.sp('px', 8),
            cm.sp('py', 12),
            cm.mxAuto,
            'relative h-72 flex items-end',
          )}
        >
          <div className={cm.flex({ direction: 'col', gap: 'sm' })}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-[0.25em] text-accent',
              )}
            >
              {t(
                'tripDetail.eyebrow',
                { country: trip.country ?? '' },
                { defaultValue: 'Itinerary \u2022 {{country}}' },
              )}
            </p>
            <h1
              data-testid="trip-detail-name"
              className={cm.cn(
                cm.textSize('5xl'),
                cm.fontWeight('extrabold'),
                'leading-[0.95] tracking-tight text-white',
              )}
              style={{ fontFamily: 'var(--font-headline)' }}
            >
              {trip.name ?? trip.destination}
            </h1>
            {trip.destination && trip.destination !== trip.name ? (
              <p
                data-testid="trip-detail-destination"
                className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'), 'text-white/85')}
              >
                {trip.destination}
              </p>
            ) : null}
            <p
              className={cm.cn(
                cm.textSize('lg'),
                cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }),
                'text-white/85 tabular-nums',
              )}
            >
              <span>{fmtRange(start, end)}</span>
              <span aria-hidden="true">{'\u2022'}</span>
              <span>
                {t(
                  'tripDetail.stops',
                  { count: activities.length },
                  { defaultValue: '{{count}} stops' },
                )}
              </span>
              {Number(trip.budget_total_cents ?? 0) > 0 ? (
                <>
                  <span aria-hidden="true">{'\u2022'}</span>
                  <span data-testid="trip-detail-budget">
                    {t(
                      'tripDetail.budget',
                      {
                        // fmtMoney hides zero — an untouched budget must not
                        // render as "/ $4,200".
                        used: fmtMoney(trip.budget_used_cents) || '$0',
                        total: fmtMoney(trip.budget_total_cents),
                      },
                      { defaultValue: '{{used}} / {{total}}' },
                    )}
                  </span>
                </>
              ) : null}
            </p>
          </div>
        </div>
      </section>

      <div
        className={cm.cn(
          cm.maxW('7xl'),
          cm.sp('px', 8),
          cm.sp('pb', 12),
          cm.mxAuto,
          'grid grid-cols-1 lg:grid-cols-12 gap-8 w-full',
        )}
      >
        <div className={cm.cn('lg:col-span-8', cm.flex({ direction: 'col', gap: 'lg' }))}>
          {error ? (
            <div
              role="alert"
              className={cm.cn(
                cm.sp('p', 4),
                'rounded-xl bg-error/10 text-error border border-error/30',
              )}
            >
              {error}
            </div>
          ) : null}
          <header
            className={cm.cn(
              cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' }),
            )}
          >
            <div>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-[0.25em] text-primary',
                )}
              >
                {t('tripDetail.timelineEyebrow', {}, { defaultValue: 'Day timeline' })}
              </p>
              <h2
                className={cm.cn(
                  cm.textSize('2xl'),
                  cm.fontWeight('extrabold'),
                  cm.sp('mt', 1),
                  'tracking-tight',
                )}
                style={{ fontFamily: 'var(--font-headline)' }}
              >
                {t('tripDetail.timelineHeading', {}, { defaultValue: 'Day-by-day plan' })}
              </h2>
            </div>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
              <button
                type="button"
                data-testid="trip-detail-add-activity"
                onClick={() => setShowAddActivity((v) => !v)}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  cm.flex({ align: 'center', gap: 'xs' }),
                  'uppercase tracking-widest rounded-full bg-surface-container-low text-on-surface-variant hover:bg-primary-container/40 hover:text-primary',
                )}
              >
                <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                  add
                </span>
                {t('tripDetail.addActivity', {}, { defaultValue: 'Add activity' })}
              </button>
              <button
                type="button"
                data-testid="trip-detail-share"
                onClick={() => void handleShare()}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  cm.flex({ align: 'center', gap: 'xs' }),
                  'uppercase tracking-widest rounded-full bg-primary text-on-primary hover:bg-primary-container shadow-sm',
                )}
              >
                <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                  share
                </span>
                {t('common.share', {}, { defaultValue: 'Share' })}
              </button>
            </div>
          </header>

          {shareInfo ? (
            <div
              data-testid="trip-detail-share-result"
              className={cm.cn(cm.sp('p', 4), 'rounded-xl bg-success-light text-success text-sm')}
            >
              {shareInfo.copied
                ? t(
                    'tripDetail.shareCopied',
                    {},
                    { defaultValue: 'Share link copied to clipboard:' },
                  )
                : t('tripDetail.shareReady', {}, { defaultValue: 'Share link ready:' })}{' '}
              <code className={cm.cn(cm.textSize('xs'), 'break-all')}>{shareInfo.url}</code>
            </div>
          ) : null}

          {showAddActivity ? (
            <form
              data-testid="trip-detail-add-form"
              onSubmit={handleAddActivity}
              className={cm.cn(
                cm.sp('p', 5),
                cm.flex({ direction: 'col', gap: 'sm' }),
                'rounded-2xl bg-surface border border-outline-variant',
              )}
            >
              <h3
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('extrabold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('tripDetail.addActivityHeading', {}, { defaultValue: 'New activity' })}
              </h3>
              <input
                type="text"
                required
                data-testid="trip-detail-add-title"
                placeholder={t(
                  'tripDetail.addActivityTitle',
                  {},
                  { defaultValue: 'Activity title' },
                )}
                value={activityForm.title}
                onChange={(e) => setActivityForm((s) => ({ ...s, title: e.target.value }))}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.fontWeight('semibold'),
                  'bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary outline-none',
                )}
              />
              <div className={cm.cn('grid grid-cols-1 sm:grid-cols-2 gap-3')}>
                <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      'uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('tripDetail.addActivityDay', {}, { defaultValue: 'Day (1-based)' })}
                  </span>
                  <input
                    type="number"
                    min={1}
                    data-testid="trip-detail-add-day"
                    value={Number(activityForm.day_index) + 1}
                    onChange={(e) =>
                      setActivityForm((s) => ({
                        ...s,
                        day_index: Math.max(0, (Number(e.target.value) || 1) - 1),
                      }))
                    }
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary outline-none tabular-nums',
                    )}
                  />
                </label>
                <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      'uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('form.category', {}, { defaultValue: 'Category' })}
                  </span>
                  <select
                    data-testid="trip-detail-add-kind"
                    value={activityForm.kind}
                    onChange={(e) =>
                      setActivityForm((s) => ({ ...s, kind: e.target.value as ActivityCategory }))
                    }
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary outline-none',
                    )}
                  >
                    <option value="sightseeing">
                      {t(
                        'dayTimelineRow.category.sightseeing',
                        {},
                        { defaultValue: 'Sightseeing' },
                      )}
                    </option>
                    <option value="food">
                      {t('dayTimelineRow.category.food', {}, { defaultValue: 'Food & drink' })}
                    </option>
                    <option value="transport">
                      {t('dayTimelineRow.category.transport', {}, { defaultValue: 'Transport' })}
                    </option>
                    <option value="accommodation">
                      {t('dayTimelineRow.category.accommodation', {}, { defaultValue: 'Stay' })}
                    </option>
                  </select>
                </label>
              </div>
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm', justify: 'end' }))}>
                <button
                  type="button"
                  onClick={() => setShowAddActivity(false)}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest rounded-full bg-surface-container-low text-on-surface-variant',
                  )}
                >
                  {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                </button>
                <button
                  type="submit"
                  disabled={addingActivity || !activityForm.title}
                  data-testid="trip-detail-add-submit"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest rounded-full bg-primary text-on-primary disabled:opacity-50',
                  )}
                >
                  {addingActivity
                    ? t('tripDetail.adding', {}, { defaultValue: 'Adding\u2026' })
                    : t('tripDetail.addActivitySubmit', {}, { defaultValue: 'Add to trip' })}
                </button>
              </div>
            </form>
          ) : null}

          {days.length === 0 ? (
            <div
              data-testid="trip-detail-empty"
              className={cm.cn(
                cm.sp('p', 8),
                cm.textCenter,
                'rounded-3xl bg-surface-container-low border border-outline-variant/40 text-on-surface-variant',
              )}
            >
              {t(
                'tripDetail.empty',
                {},
                { defaultValue: 'No activities yet \u2014 add one to start the timeline.' },
              )}
            </div>
          ) : (
            days.map((day) => (
              <article key={day.day} className={cm.flex({ direction: 'col', gap: 'sm' })}>
                <header
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    // top-16 on mobile (below the mobile shell's sticky top
                    // bar), top-0 on md+ where the sidebar layout has no bar.
                    cm.accentCard({ tone: 'primary' }),
                    'sticky top-16 md:top-0 z-10 bg-surface/95 backdrop-blur-md rounded-xl shadow-sm',
                  )}
                >
                  <p className={cm.accentCardLabel({ tone: 'primary' })}>
                    {t('tripDetail.dayLabel', { day: day.day }, { defaultValue: 'Day {{day}}' })}
                  </p>
                  <h3
                    className={cm.cn(
                      cm.textSize('lg'),
                      cm.fontWeight('extrabold'),
                      'tracking-tight',
                    )}
                    style={{ fontFamily: 'var(--font-headline)' }}
                  >
                    {new Date(day.date_iso).toLocaleDateString(undefined, {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </h3>
                </header>
                <ul className={cm.cn(cm.sp('pt', 2), 'space-y-1')}>
                  {day.activities.map((activity, i) => (
                    <DayTimelineRow
                      key={activity.id}
                      activity={activity}
                      isLast={i === day.activities.length - 1}
                    />
                  ))}
                </ul>
              </article>
            ))
          )}
        </div>

        <aside className={cm.cn('lg:col-span-4', cm.flex({ direction: 'col', gap: 'md' }))}>
          <section
            className={cm.cn(
              cm.sp('p', 6),
              'bg-surface rounded-2xl shadow-sm border border-outline-variant/40',
            )}
          >
            <h3
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('extrabold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('tripDetail.collaboratorsHeading', {}, { defaultValue: 'Travelers' })}
            </h3>
            <div
              data-testid="trip-detail-collaborators"
              className={cm.cn(
                cm.sp('mt', 4),
                cm.flex({ align: 'center', wrap: 'wrap', gap: 'xs' }),
              )}
            >
              {collaborators.length === 0 ? (
                <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t('tripDetail.noCollaborators', {}, { defaultValue: 'Just you, for now.' })}
                </span>
              ) : (
                collaborators.slice(0, 6).map((c, i) => (
                  <span
                    key={c.id}
                    title={c.user_id}
                    className={cm.cn(
                      'w-9 h-9 rounded-full ring-2 ring-surface text-xs font-bold uppercase flex items-center justify-center bg-primary-container text-on-primary-container',
                      i > 0 ? '-ml-2' : '',
                    )}
                  >
                    {initials(c.user_id)}
                  </span>
                ))
              )}
            </div>
            <form
              onSubmit={handleInvite}
              className={cm.cn(cm.sp('mt', 4), cm.flex({ direction: 'col', gap: 'xs' }))}
            >
              <label
                className={cm.cn(
                  cm.textSize('xs'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('tripDetail.inviteLabel', {}, { defaultValue: 'Invite by email' })}
              </label>
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
                <input
                  type="email"
                  required
                  data-testid="trip-detail-invite-email"
                  placeholder={t(
                    'tripDetail.invitePlaceholder',
                    {},
                    { defaultValue: 'someone@example.com' },
                  )}
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className={cm.cn(
                    cm.flex1,
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'rounded-full bg-surface-container-low border border-outline-variant text-sm focus:border-primary outline-none',
                  )}
                />
                <button
                  type="submit"
                  disabled={inviting || !inviteEmail}
                  data-testid="trip-detail-invite-submit"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest rounded-full bg-primary text-on-primary disabled:opacity-50',
                  )}
                >
                  {inviting
                    ? t('tripDetail.inviting', {}, { defaultValue: 'Sending\u2026' })
                    : t('tripDetail.invite', {}, { defaultValue: 'Invite' })}
                </button>
              </div>
              {inviteError ? (
                <p
                  data-testid="trip-detail-invite-error"
                  className={cm.cn(cm.textSize('xs'), 'text-error')}
                >
                  {inviteError}
                </p>
              ) : null}
              {inviteSent ? (
                <p
                  data-testid="trip-detail-invite-sent"
                  className={cm.cn(cm.textSize('xs'), 'text-success')}
                >
                  {t(
                    'tripDetail.inviteSent',
                    { email: inviteSent },
                    { defaultValue: 'Invite sent to {{email}}.' },
                  )}
                </p>
              ) : null}
            </form>
          </section>

          <section
            className={cm.cn(
              cm.sp('p', 6),
              'bg-surface rounded-2xl shadow-sm border border-outline-variant/40',
            )}
          >
            <h3
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('extrabold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('tripDetail.notesHeading', {}, { defaultValue: 'Trip notes' })}
            </h3>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.sp('mt', 2),
                'text-on-surface-variant whitespace-pre-line',
              )}
            >
              {trip.notes ||
                t('tripDetail.notesPlaceholder', {}, { defaultValue: 'No notes yet.' })}
            </p>
            <Link
              to="/bookings"
              className={cm.cn(
                cm.sp('mt', 4),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.flex({ align: 'center', gap: 'xs' }),
                'uppercase tracking-widest text-primary hover:underline',
              )}
            >
              {t('tripDetail.openBookings', {}, { defaultValue: 'Open bookings inbox' })}
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </section>
        </aside>
      </div>
    </div>
  )
}
