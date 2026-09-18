import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface ApiMeeting {
  id: string
  title: string
  description?: string | null
  status?: string
  starts_at?: string | null
  ends_at?: string | null
  is_recurring?: boolean
  recurrence_rule?: string | null
  join_code?: string
  host_id?: string
}

interface ApiParticipant {
  id: string
  user_id?: string | null
  guest_name?: string | null
  role: string
  joined_at?: string
  left_at?: string | null
}

function unwrap<T>(value: unknown, fallback: T): T {
  let current: unknown = value
  for (let i = 0; i < 3; i++) {
    if (Array.isArray(current)) return current as T
    if (current && typeof current === 'object' && 'data' in current) {
      current = (current as { data: unknown }).data
      continue
    }
    break
  }
  return Array.isArray(current) ? (current as T) : fallback
}

function unwrapOne<T>(value: unknown, fallback: T): T {
  let current: unknown = value
  for (let i = 0; i < 3; i++) {
    if (current === null || current === undefined) break
    if (current && typeof current === 'object' && 'data' in current) {
      current = (current as { data: unknown }).data
      continue
    }
    break
  }
  return (current as T) ?? fallback
}

function formatStartsAt(iso?: string | null): string {
  if (!iso) return 'TBD'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'TBD'
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function durationMinutes(start?: string | null, end?: string | null): number {
  if (!start || !end) return 0
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (Number.isNaN(ms) || ms <= 0) return 0
  return Math.round(ms / 60_000)
}

function defaultDateLocal(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const tzOffset = d.getTimezoneOffset() * 60_000
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16)
}

export function MeetingDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { id = '' } = useParams<{ id: string }>()

  const [meeting, setMeeting] = useState<ApiMeeting | null>(null)
  const [participants, setParticipants] = useState<ApiParticipant[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editStart, setEditStart] = useState('')
  const [editDuration, setEditDuration] = useState(30)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmails, setInviteEmails] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)

  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)

  const loadMeeting = useCallback(() => {
    if (!id) return
    Promise.allSettled([http.get(`/api/meetings/${id}`), http.get(`/api/participants/${id}`)]).then(
      ([meetingRes, participantsRes]) => {
        if (meetingRes.status === 'fulfilled') {
          const m = unwrapOne<ApiMeeting | null>(meetingRes.value, null)
          if (m) setMeeting(m)
        }
        if (participantsRes.status === 'fulfilled') {
          setParticipants(unwrap<ApiParticipant[]>(participantsRes.value, []))
        }
        setLoading(false)
      },
    )
  }, [http, id])

  useEffect(() => {
    loadMeeting()
  }, [loadMeeting])

  useEffect(() => {
    if (meeting) {
      setEditTitle(meeting.title)
      setEditStart(defaultDateLocal(meeting.starts_at))
      setEditDuration(durationMinutes(meeting.starts_at, meeting.ends_at) || 30)
    }
  }, [meeting])

  const startsAtLabel = useMemo(() => formatStartsAt(meeting?.starts_at), [meeting?.starts_at])
  const durationLabel = useMemo(() => {
    const mins = durationMinutes(meeting?.starts_at, meeting?.ends_at)
    return mins ? `${mins} min` : '—'
  }, [meeting?.starts_at, meeting?.ends_at])

  const saveEdit = useCallback(async () => {
    if (!meeting) return
    setSaveError(null)
    if (!editTitle.trim()) {
      setSaveError(t('meetingDetail.titleRequired', {}, { defaultValue: 'Title is required' }))
      return
    }
    setSaving(true)
    try {
      const startsAt = editStart ? new Date(editStart) : null
      const endsAt = startsAt ? new Date(startsAt.getTime() + editDuration * 60_000) : null
      await http.put(`/api/meetings/${meeting.id}`, {
        title: editTitle.trim(),
        starts_at: startsAt ? startsAt.toISOString() : undefined,
        ends_at: endsAt ? endsAt.toISOString() : undefined,
      })
      setEditing(false)
      loadMeeting()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }, [editDuration, editStart, editTitle, http, loadMeeting, meeting, t])

  const submitInvites = useCallback(async () => {
    if (!meeting) return
    setInviteError(null)
    setInviteSuccess(null)
    const emails = inviteEmails
      .split(/[\s,;]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (emails.length === 0) {
      setInviteError(
        t('meetingDetail.invitesRequired', {}, { defaultValue: 'Add at least one email' }),
      )
      return
    }
    setInviting(true)
    try {
      await http.post(`/api/meetings/${meeting.id}/invite`, { emails })
      setInviteSuccess(
        t(
          'meetingDetail.invitesSent',
          { count: emails.length },
          { defaultValue: 'Sent {{count}} invite(s)' },
        ),
      )
      setInviteEmails('')
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to send invites')
    } finally {
      setInviting(false)
    }
  }, [http, inviteEmails, meeting, t])

  const cancelMeeting = useCallback(async () => {
    if (!meeting) return
    setCancelError(null)
    setCancelling(true)
    try {
      await http.delete(`/api/meetings/${meeting.id}`)
      navigate('/schedule')
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Failed to cancel meeting')
    } finally {
      setCancelling(false)
    }
  }, [http, meeting, navigate])

  if (loading) {
    return (
      <p className={cm.cn(cm.sp('p', 8), cm.textSize('sm'), 'text-on-surface-variant')}>
        {t('common.loading', {}, { defaultValue: 'Loading…' })}
      </p>
    )
  }

  if (!meeting) {
    return (
      <div
        className={cm.cn(cm.sp('p', 8), cm.stack(4), cm.textCenter)}
        data-testid="meeting-not-found"
      >
        <h1 className={cm.cn('text-2xl font-bold')}>
          {t('meetingDetail.notFound', {}, { defaultValue: 'Meeting not found' })}
        </h1>
        <button
          type="button"
          onClick={() => navigate('/schedule')}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            cm.roundedFull,
            cm.mxAuto,
            'bg-primary text-on-primary',
          )}
        >
          {t('common.back', {}, { defaultValue: 'Back' })}
        </button>
      </div>
    )
  }

  return (
    <div className={cm.stack(8)}>
      <button
        type="button"
        onClick={() => navigate('/schedule')}
        className={cm.cn(
          cm.flex({ align: 'center', gap: 1 }),
          cm.textSize('sm'),
          cm.fontWeight('semibold'),
          'text-on-surface-variant hover:text-primary transition-colors',
        )}
      >
        <span className={'material-symbols-outlined text-base'}>arrow_back</span>
        {t('nav.schedule', {}, { defaultValue: 'Schedule' })}
      </button>

      <header
        className={cm.cn(cm.flex({ align: 'start', justify: 'between', gap: 6 }), 'flex-wrap')}
      >
        <div className={cm.stack(3)}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-primary',
            )}
          >
            {t('meetingDetail.title', {}, { defaultValue: 'Meeting details' })}
          </span>
          <h1
            data-testid="meeting-title"
            className={cm.cn('text-4xl font-extrabold tracking-tight text-on-surface')}
          >
            {meeting.title}
          </h1>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 4 }),
              cm.textSize('sm'),
              'text-on-surface-variant',
              'flex-wrap',
            )}
          >
            <span className={cm.flex({ align: 'center', gap: 1 })}>
              <span className={'material-symbols-outlined text-base'}>calendar_today</span>
              {startsAtLabel}
            </span>
            <span className={cm.flex({ align: 'center', gap: 1 })}>
              <span className={'material-symbols-outlined text-base'}>schedule</span>
              {durationLabel}
            </span>
            {meeting.join_code && (
              <span className={cm.flex({ align: 'center', gap: 1 })}>
                <span className={'material-symbols-outlined text-base'}>link</span>
                <span data-testid="meeting-code">{meeting.join_code}</span>
              </span>
            )}
          </div>
        </div>
        <div className={cm.flex({ gap: 3 })}>
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            data-testid="edit-meeting"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              cm.roundedFull,
              'bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors',
            )}
          >
            {editing
              ? t('common.cancel', {}, { defaultValue: 'Cancel' })
              : t('meetingDetail.edit', {}, { defaultValue: 'Edit meeting' })}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/meeting/${meeting.id}/lobby`)}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 2 }),
              cm.sp('px', 6),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              cm.roundedFull,
              'bg-gradient-to-r from-primary to-secondary text-on-primary shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/40 transition-all',
            )}
          >
            <span className={'material-symbols-outlined text-lg'}>videocam</span>
            {t('meetingDetail.startNow', {}, { defaultValue: 'Start now' })}
          </button>
        </div>
      </header>

      {editing && (
        <section
          data-testid="edit-meeting-form"
          className={cm.cn(
            cm.sp('p', 6),
            cm.stack(4),
            'bg-surface-container-lowest rounded-2xl shadow-sm',
          )}
        >
          <h3
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('meetingDetail.editForm', {}, { defaultValue: 'Edit meeting' })}
          </h3>
          <label className={cm.stack(1)}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('form.title', {}, { defaultValue: 'Title' })}
            </span>
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              aria-label="Edit meeting title"
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'rounded-lg bg-surface-container border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none',
              )}
            />
          </label>
          <label className={cm.stack(1)}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('schedule.fieldStart', {}, { defaultValue: 'Starts at' })}
            </span>
            <input
              type="datetime-local"
              value={editStart}
              onChange={(e) => setEditStart(e.target.value)}
              aria-label="Edit meeting start"
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'rounded-lg bg-surface-container border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none',
              )}
            />
          </label>
          <label className={cm.stack(1)}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('schedule.fieldDuration', {}, { defaultValue: 'Duration (minutes)' })}
            </span>
            <input
              type="number"
              min={5}
              max={480}
              value={editDuration}
              onChange={(e) => setEditDuration(Number(e.target.value))}
              aria-label="Edit meeting duration"
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'rounded-lg bg-surface-container border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none',
              )}
            />
          </label>
          {saveError && (
            <p role="alert" className={cm.cn(cm.textSize('sm'), 'text-error')}>
              {saveError}
            </p>
          )}
          <div className={cm.flex({ justify: 'end' })}>
            <button
              type="button"
              onClick={saveEdit}
              disabled={saving}
              data-testid="save-edit-meeting"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                cm.roundedFull,
                'bg-primary text-on-primary hover:bg-primary-dark disabled:opacity-50',
              )}
            >
              {saving
                ? t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })
                : t('common.save', {}, { defaultValue: 'Save' })}
            </button>
          </div>
        </section>
      )}

      <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'xl:grid-cols-3')}>
        <div className={cm.cn(cm.stack(6), 'xl:col-span-2')}>
          <section
            className={cm.cn(
              cm.sp('p', 6),
              cm.stack(4),
              'bg-surface-container-lowest rounded-2xl shadow-sm',
            )}
          >
            <h3
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('form.description', {}, { defaultValue: 'Description' })}
            </h3>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface')}>
              {meeting.description ??
                t('meetingDetail.noDescription', {}, { defaultValue: 'No description provided.' })}
            </p>
          </section>

          <section
            className={cm.cn(
              cm.sp('p', 6),
              cm.stack(4),
              'bg-surface-container-lowest rounded-2xl shadow-sm',
            )}
          >
            <h3
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('meetingDetail.recordingSettings', {}, { defaultValue: 'Recording settings' })}
            </h3>
            <div className={cm.stack(3)}>
              <SettingRow label="Auto-record meeting" enabled />
              <SettingRow label="Generate transcript" enabled />
              <SettingRow label="Generate AI summary" enabled />
              <SettingRow label="Allow attendees to download" enabled={false} />
            </div>
          </section>
        </div>

        <section
          className={cm.cn(
            cm.sp('p', 6),
            cm.stack(4),
            'bg-surface-container-lowest rounded-2xl shadow-sm',
          )}
        >
          <div className={cm.flex({ align: 'center', justify: 'between' })}>
            <h3
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('meetingDetail.attendees', {}, { defaultValue: 'Attendees' })} ·{' '}
              {participants.length}
            </h3>
            <button
              type="button"
              onClick={() => setShowInvite((v) => !v)}
              data-testid="toggle-invite"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'text-primary hover:underline',
              )}
            >
              + {t('meetingDetail.invite', {}, { defaultValue: 'Invite' })}
            </button>
          </div>
          {showInvite && (
            <div data-testid="invite-form" className={cm.stack(2)}>
              <textarea
                value={inviteEmails}
                onChange={(e) => setInviteEmails(e.target.value)}
                aria-label="Invite emails"
                placeholder="alice@example.com, bob@example.com"
                rows={3}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'rounded-lg bg-surface-container border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none',
                )}
              />
              {inviteError && (
                <p role="alert" className={cm.cn(cm.textSize('xs'), 'text-error')}>
                  {inviteError}
                </p>
              )}
              {inviteSuccess && (
                <p
                  role="status"
                  data-testid="invite-success"
                  className={cm.cn(cm.textSize('xs'), 'text-success')}
                >
                  {inviteSuccess}
                </p>
              )}
              <button
                type="button"
                onClick={submitInvites}
                disabled={inviting}
                data-testid="submit-invite"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  cm.roundedFull,
                  'self-end bg-primary text-on-primary hover:bg-primary-dark disabled:opacity-50',
                )}
              >
                {inviting
                  ? t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })
                  : t('meetingDetail.sendInvites', {}, { defaultValue: 'Send invites' })}
              </button>
            </div>
          )}
          {participants.length > 0 ? (
            <ul className={cm.stack(2)}>
              {participants.map((p) => (
                <li
                  key={p.id}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 3 }),
                    cm.sp('py', 2),
                    'border-b border-outline-variant/40 last:border-0',
                  )}
                >
                  <div
                    className={
                      'w-9 h-9 rounded-full bg-primary-container flex items-center justify-center text-sm font-bold text-on-primary-container'
                    }
                  >
                    {(p.guest_name ?? '?').charAt(0).toUpperCase()}
                  </div>
                  <div className={cm.cn(cm.flex1, cm.stack(1))}>
                    <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                      {p.guest_name ?? p.user_id ?? 'Guest'}
                    </p>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>{p.role}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t('meetingDetail.noAttendees', {}, { defaultValue: 'No attendees yet.' })}
            </p>
          )}
          {cancelError && (
            <p role="alert" className={cm.cn(cm.textSize('xs'), 'text-error')}>
              {cancelError}
            </p>
          )}
          <button
            type="button"
            onClick={cancelMeeting}
            disabled={cancelling}
            data-testid="cancel-meeting"
            className={cm.cn(
              cm.sp('mt', 2),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              cm.roundedFull,
              'w-full bg-error/10 text-error hover:bg-error/20 transition-colors disabled:opacity-50',
            )}
          >
            {cancelling
              ? t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })
              : t('meetingDetail.cancel', {}, { defaultValue: 'Cancel meeting' })}
          </button>
        </section>
      </div>
    </div>
  )
}

function SettingRow({ label, enabled }: { label: string; enabled: boolean }) {
  const cm = getClassMap()
  return (
    <div className={cm.flex({ align: 'center', justify: 'between' })}>
      <span className={cm.cn(cm.textSize('sm'), 'text-on-surface')}>{label}</span>
      <span
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 1),
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          cm.roundedFull,
          'uppercase tracking-widest',
          enabled ? 'bg-success/15 text-success' : 'bg-surface-container text-on-surface-variant',
        )}
      >
        {enabled ? 'On' : 'Off'}
      </span>
    </div>
  )
}
