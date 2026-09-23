import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

interface Speaker {
  id: number
  name: string
}

interface TranscriptLine {
  ts: string // mm:ss
  speaker_id: number
  text: string
}

interface ActionItem {
  id: string
  text: string
  owner: string
  due_date?: string
  status: 'open' | 'in_progress' | 'done'
}

interface MeetingDetail {
  id: string
  title: string
  recorded_at: string
  duration_minutes: number
  attendees: string[]
  speakers: Speaker[]
  transcript: TranscriptLine[]
  ai_tldr: string
  ai_decisions: string[]
  ai_followups: string[]
  action_items: ActionItem[]
}

const SPEAKER_BORDER: Record<number, string> = {
  1: 'var(--color-speaker-1)',
  2: 'var(--color-speaker-2)',
  3: 'var(--color-speaker-3)',
  4: 'var(--color-speaker-4)',
  5: 'var(--color-speaker-5)',
}

const STATUS_COLOR: Record<ActionItem['status'], string> = {
  open: 'bg-surface-container',
  in_progress: 'bg-warning/15 text-warning',
  done: 'bg-success/15 text-success',
}

const STATUS_DEFAULT_LABEL: Record<ActionItem['status'], string> = {
  open: 'open',
  in_progress: 'in progress',
  done: 'done',
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function MeetingDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [meeting, setMeeting] = useState<MeetingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    http
      .get(`/api/meetings/${id}`)
      .then((res) => {
        if (!cancelled) setMeeting(unwrapSingle<MeetingDetail>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('meetingDetail.loadError', {}, { defaultValue: 'Failed to load meeting.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  if (loading)
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  if (error || !meeting)
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-error')}>
        {error ?? t('meetingDetail.notFound', {}, { defaultValue: 'Meeting not found.' })}
      </div>
    )

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}>
      <Link to="/meetings" className={cm.cn(cm.textSize('sm'), cm.textPrimary, 'hover:underline')}>
        ← {t('meetingDetail.back', {}, { defaultValue: 'All meetings' })}
      </Link>

      <header className={cm.cn(cm.card(), cm.sp('p', 6))}>
        <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>{meeting.title}</h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {fmtDate(meeting.recorded_at)} · {meeting.duration_minutes}m ·{' '}
          {meeting.attendees.join(', ')}
        </p>
      </header>

      <div className={cm.cn(cm.grid({ cols: 12, gap: 'md' }))}>
        <section className={cm.cn('col-span-12 lg:col-span-8', cm.card(), cm.sp('p', 6))}>
          <h2 className={cm.cn(cm.sectionHeading, cm.sp('mb', 4))}>
            {t('meetingDetail.transcriptHeading', {}, { defaultValue: 'Transcript' })}
          </h2>
          <ol className={'space-y-4'} style={{ fontFamily: 'var(--mol-font-serif)' }}>
            {meeting.transcript.map((line, i) => {
              const speaker = meeting.speakers.find((s) => s.id === line.speaker_id)
              const color = SPEAKER_BORDER[line.speaker_id] ?? 'var(--color-speaker-1)'
              return (
                <li
                  key={i}
                  className={'flex gap-3'}
                  style={{ borderLeft: `2px solid ${color}`, paddingLeft: '12px' }}
                >
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      'font-mono tabular-nums w-12 shrink-0',
                      'text-on-surface-variant',
                    )}
                  >
                    {line.ts}
                  </span>
                  <div className={'min-w-0 flex-1'}>
                    <p
                      className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}
                      style={{ color }}
                    >
                      {speaker?.name ??
                        t(
                          'meetingDetail.speakerFallback',
                          { id: line.speaker_id },
                          { defaultValue: 'Speaker {{id}}' },
                        )}
                    </p>
                    <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1))}>{line.text}</p>
                  </div>
                </li>
              )
            })}
          </ol>
        </section>

        <aside className={cm.cn('col-span-12 lg:col-span-4 space-y-4 sticky top-24')}>
          <section
            className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3 border-l-4 border-secondary')}
          >
            <h2 className={cm.sectionHeading}>
              ✨ {t('meetingDetail.summaryHeading', {}, { defaultValue: 'AI summary' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'))}>{meeting.ai_tldr}</p>
            <div>
              <h3
                className={cm.cn(
                  cm.textSize('xs'),
                  'uppercase tracking-wide',
                  'text-on-surface-variant',
                  cm.sp('mt', 3),
                )}
              >
                {t('meetingDetail.decisionsHeading', {}, { defaultValue: 'Decisions' })}
              </h3>
              <ul className={'space-y-1 text-sm list-disc pl-4 mt-1'}>
                {meeting.ai_decisions.length === 0 ? (
                  <li className={'text-on-surface-variant list-none'}>
                    {t('meetingDetail.none', {}, { defaultValue: 'None.' })}
                  </li>
                ) : (
                  meeting.ai_decisions.map((d, i) => <li key={i}>{d}</li>)
                )}
              </ul>
            </div>
            <div>
              <h3
                className={cm.cn(
                  cm.textSize('xs'),
                  'uppercase tracking-wide',
                  'text-on-surface-variant',
                  cm.sp('mt', 3),
                )}
              >
                {t('meetingDetail.followupsHeading', {}, { defaultValue: 'Follow-ups' })}
              </h3>
              <ul className={'space-y-1 text-sm list-disc pl-4 mt-1'}>
                {meeting.ai_followups.length === 0 ? (
                  <li className={'text-on-surface-variant list-none'}>
                    {t('meetingDetail.none', {}, { defaultValue: 'None.' })}
                  </li>
                ) : (
                  meeting.ai_followups.map((f, i) => <li key={i}>{f}</li>)
                )}
              </ul>
            </div>
          </section>

          <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
            <h2 className={cm.sectionHeading}>
              {t('meetingDetail.actionsHeading', {}, { defaultValue: 'Action items' })}
            </h2>
            {meeting.action_items.length === 0 ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t('meetingDetail.noActions', {}, { defaultValue: 'No action items detected.' })}
              </p>
            ) : (
              <ul className={'space-y-2'}>
                {meeting.action_items.map((a) => (
                  <li
                    key={a.id}
                    className={cm.cn(cm.sp('p', 3), 'border border-outline-variant rounded-md')}
                  >
                    <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>{a.text}</p>
                    <div
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'between' }),
                        cm.sp('mt', 2),
                        cm.textSize('xs'),
                      )}
                    >
                      <span className={'text-on-surface-variant'}>
                        {a.owner}
                        {a.due_date
                          ? ` · ${t(
                              'meetingDetail.dueDate',
                              { date: fmtDate(a.due_date) },
                              { defaultValue: 'due {{date}}' },
                            )}`
                          : ''}
                      </span>
                      <span
                        className={cm.cn(
                          cm.sp('px', 2),
                          cm.fontWeight('semibold'),
                          cm.roundedFull,
                          STATUS_COLOR[a.status],
                        )}
                      >
                        {t(
                          `actions.status.${a.status}`,
                          {},
                          { defaultValue: STATUS_DEFAULT_LABEL[a.status] },
                        )}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}
