import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { formatDuration, formatTime, languageLabel } from '../lib/format.js'
import { unwrapSingle } from '../lib/unwrap.js'

interface CallDetailPayload {
  id: string
  voice_agent_name: string | null
  direction: string
  detected_language: string | null
  started_at: string
  ended_at: string | null
  duration_seconds: number
  outcome: string | null
  summary: string | null
  mode: string
  messages: MessageRow[]
  actions: ActionRow[]
}

interface MessageRow {
  id: string
  role: 'caller' | 'agent' | 'system'
  text: string
  language: string | null
}

interface ActionRow {
  id: string
  tool: string
  arguments: string | { [key: string]: unknown } | null
  result: string | { [key: string]: unknown } | null
}

function prettyAction(value: string | { [key: string]: unknown } | null): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value))
    } catch (_error) {
      return value
    }
  }
  return JSON.stringify(value)
}

/** Turn avatar — ink roundel for the concierge, gold for the caller. */
function TurnAvatar({ role, initial }: { role: string; initial: string }) {
  return (
    <span
      aria-hidden="true"
      className={
        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ' +
        (role === 'caller' ? 'bg-secondary text-on-secondary' : 'bg-primary text-on-primary')
      }
    >
      {initial}
    </span>
  )
}

export function CallDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [call, setCall] = useState<CallDetailPayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!id) return
    ;(async () => {
      try {
        const res = await http.get('/api/calls/' + id)
        if (cancelled) return
        setCall(unwrapSingle<CallDetailPayload>(res))
      } catch (_e) {
        if (!cancelled) {
          setError(t('calls.loadError', {}, { defaultValue: 'Failed to load call.' }))
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  if (error) {
    return (
      <p
        data-mol-id="call-detail-error"
        className={cm.cn(
          cm.sp('mx', 6),
          cm.sp('px', 4),
          cm.sp('py', 3),
          'rounded-lg bg-error/10 text-error border border-error/30 inline-block',
        )}
      >
        {error}
      </p>
    )
  }

  if (!call) {
    return (
      <p
        data-mol-id="call-detail-loading"
        className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}
      >
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </p>
    )
  }

  const outcome = call.outcome ?? t('callOutcome.inProgress', {}, { defaultValue: 'in progress' })

  // The design's telemetry bento bar — one metric card per ledger fact.
  const facts: Array<{ label: string; value: string; icon: string }> = [
    {
      label: t('callDetail.agent', {}, { defaultValue: 'Agent' }),
      value: call.voice_agent_name ?? '—',
      icon: 'smart_toy',
    },
    {
      label: t('callDetail.detectedLanguage', {}, { defaultValue: 'Detected language' }),
      value: languageLabel(call.detected_language),
      icon: 'record_voice_over',
    },
    {
      label: t('callDetail.duration', {}, { defaultValue: 'Duration' }),
      value: formatDuration(call.duration_seconds),
      icon: 'schedule',
    },
    {
      label: t('callDetail.outcome', {}, { defaultValue: 'Outcome' }),
      value: outcome,
      icon: 'check_circle',
    },
    {
      label: t('callDetail.engine', {}, { defaultValue: 'Engine' }),
      value: call.mode,
      icon: 'lan',
    },
  ]

  return (
    <div className={cm.cn(cm.maxW('6xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      {/* Audit context bar — breadcrumb trail + serif title + status chip */}
      <div className="border-b border-outline-variant/60 pb-6">
        <Link
          to="/calls"
          data-mol-id="call-detail-back"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            'uppercase tracking-wider text-on-surface-variant hover:text-primary transition-colors -my-2 inline-flex py-2',
          )}
        >
          <span className="sb-icon flex h-3.5 w-3.5 items-center justify-center" aria-hidden="true">
            <span className="material-symbols-outlined">arrow_back</span>
          </span>
          {t('calls.heading', {}, { defaultValue: 'Calls' })}
        </Link>
        <div
          className={cm.cn(cm.sp('mt', 2), cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }))}
        >
          <h1
            className={cm.cn('sb-serif text-3xl font-normal tracking-tight text-primary')}
            data-mol-id="call-detail-heading"
          >
            {t(
              'callDetail.heading',
              { agent: call.voice_agent_name ?? '' },
              { defaultValue: 'Call with {{agent}}' },
            )}
          </h1>
          <span
            className={cm.cn(
              cm.sp('px', 2),
              cm.sp('py', 1),
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              cm.flex({ align: 'center', gap: 'xs' }),
              'rounded border border-secondary/30 bg-secondary/10 text-secondary',
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-secondary" aria-hidden="true" />
            {outcome === 'in progress'
              ? t('callDetail.chipLive', {}, { defaultValue: 'Line open' })
              : t('callDetail.chipResolved', {}, { defaultValue: 'Audit complete' })}
          </span>
        </div>
        <p
          className={cm.cn(
            cm.sp('mt', 2),
            cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }),
            cm.textSize('sm'),
            'font-mono text-on-surface-variant',
          )}
        >
          <span>{formatTime(call.started_at)}</span>
          <span aria-hidden="true">·</span>
          <span>{languageLabel(call.detected_language)}</span>
          <span aria-hidden="true">·</span>
          <span>
            {t(
              'callDetail.sessionMeta',
              { mode: call.mode },
              { defaultValue: 'Session: {{mode}}' },
            )}
          </span>
        </p>
      </div>

      {/* Telemetry bento strip — the five ledger facts as metric cards */}
      <dl className={cm.cn(cm.sp('mt', 6), 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4')}>
        {facts.map((fact) => (
          <div
            key={fact.label}
            className="sb-card-shadow flex flex-col rounded-lg border border-outline-variant/60 bg-surface-container-lowest p-4"
          >
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between', gap: 'xs' }),
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'uppercase tracking-wider text-on-surface-variant',
              )}
            >
              <dt>{fact.label}</dt>
              <span className="sb-icon flex h-4 w-4 items-center justify-center" aria-hidden="true">
                <span className="material-symbols-outlined">{fact.icon}</span>
              </span>
            </div>
            <dd
              data-mol-id={'call-detail-fact-' + fact.label.toLowerCase().replace(/[^a-z]+/g, '-')}
              className={cm.cn(cm.sp('mt', 2), cm.fontWeight('semibold'), 'text-primary')}
            >
              {fact.value}
            </dd>
          </div>
        ))}
      </dl>

      {call.summary ? (
        <div
          data-mol-id="call-detail-summary"
          className={cm.cn(
            cm.sp('mt', 4),
            cm.sp('p', 4),
            cm.textSize('sm'),
            'rounded-lg border border-outline-variant/50 bg-surface-bright',
          )}
        >
          <span className={cm.cn(cm.fontWeight('semibold'), 'text-primary')}>
            {t('calls.summaryLabel', {}, { defaultValue: 'Summary:' })}
          </span>{' '}
          {call.summary}
        </div>
      ) : null}

      <div className={cm.cn(cm.sp('mt', 6), 'grid grid-cols-1 lg:grid-cols-12 gap-6')}>
        {/* Transcript — the design's synchronized dual-channel feed */}
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-lg border border-outline-variant/60 bg-surface-container-lowest sb-card-shadow lg:col-span-7',
          )}
          aria-label={t('callDetail.transcriptLabel', {}, { defaultValue: 'Transcript' })}
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
              'border-b border-outline-variant/40 pb-4',
            )}
          >
            <h2
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.textSize('lg'),
                'sb-serif font-medium text-primary',
              )}
            >
              <span
                className="sb-icon flex h-5 w-5 items-center justify-center text-secondary"
                aria-hidden="true"
              >
                <span className="material-symbols-outlined">forum</span>
              </span>
              {t('callDetail.transcript', {}, { defaultValue: 'Transcript' })}
            </h2>
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.textSize('xs'),
                'text-on-surface-variant',
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
              {t('callDetail.diarization', {}, { defaultValue: 'Diarized' })}
            </span>
          </div>
          <ul className={cm.cn(cm.sp('mt', 4), cm.flex({ direction: 'col', gap: 'md' }))}>
            {call.messages.length === 0 ? (
              <li className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t('callDetail.noMessages', {}, { defaultValue: 'No messages on this call.' })}
              </li>
            ) : (
              call.messages.map((m) => (
                <li
                  key={m.id}
                  data-mol-id={'call-message-' + m.id}
                  className={cm.cn(
                    cm.flex({ align: 'start', gap: 'sm' }),
                    m.role === 'caller' ? 'flex-row-reverse' : '',
                  )}
                >
                  <TurnAvatar
                    role={m.role}
                    initial={
                      m.role === 'caller'
                        ? t('callRole.caller', {}, { defaultValue: 'caller' })
                            .charAt(0)
                            .toUpperCase()
                        : 'S'
                    }
                  />
                  <div
                    className={cm.cn(
                      cm.sp('p', 3),
                      'max-w-[85%] rounded-lg border',
                      m.role === 'caller'
                        ? 'border-outline-variant bg-surface-container-lowest sb-card-shadow'
                        : 'border-outline-variant/60 bg-surface-container-low',
                    )}
                  >
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('semibold'),
                        'uppercase tracking-wider text-on-surface-variant',
                      )}
                    >
                      {t('callRole.' + m.role, {}, { defaultValue: m.role })}
                      {m.language ? ' · ' + m.language : ''}
                    </p>
                    <p className={cm.cn(cm.sp('mt', 1), cm.textSize('sm'), 'leading-relaxed')}>
                      {m.text}
                    </p>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>

        {/* Tool-call ledger — the design's PMS execution rail */}
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-lg border border-outline-variant/60 bg-surface-container-lowest sb-card-shadow lg:col-span-5',
          )}
          aria-label={t('callDetail.timelineLabel', {}, { defaultValue: 'Agent tool timeline' })}
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
              'border-b border-outline-variant/40 pb-4',
            )}
          >
            <h2
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.textSize('lg'),
                'sb-serif font-medium text-primary',
              )}
            >
              <span
                className="sb-icon flex h-5 w-5 items-center justify-center text-secondary"
                aria-hidden="true"
              >
                <span className="material-symbols-outlined">account_tree</span>
              </span>
              {t('callDetail.timeline', {}, { defaultValue: 'Agent actions' })}
            </h2>
            {call.actions.length > 0 ? (
              <span
                className={cm.cn(
                  cm.sp('px', 2),
                  cm.sp('py', 1),
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'rounded bg-tertiary-fixed text-on-tertiary-fixed',
                )}
              >
                {t(
                  'callDetail.actionsDone',
                  { count: call.actions.length },
                  { defaultValue: '{{count}} dispatched' },
                )}
              </span>
            ) : null}
          </div>
          <ul className={cm.cn(cm.sp('mt', 4), cm.flex({ direction: 'col', gap: 'sm' }))}>
            {call.actions.length === 0 ? (
              <li className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'callDetail.noActions',
                  {},
                  { defaultValue: 'The agent did not call any tools on this call.' },
                )}
              </li>
            ) : (
              call.actions.map((a) => (
                <li
                  key={a.id}
                  data-mol-id={'call-action-' + a.tool}
                  className={cm.cn(
                    cm.sp('p', 3),
                    'rounded-lg border border-outline-variant/50 bg-surface-container-low/70 hover:border-outline transition-colors',
                  )}
                >
                  <p
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'xs' }),
                      cm.textSize('sm'),
                      cm.fontWeight('bold'),
                      'font-mono text-primary',
                    )}
                  >
                    <span
                      className="sb-icon flex h-4 w-4 items-center justify-center text-secondary"
                      aria-hidden="true"
                    >
                      <span className="material-symbols-outlined">build</span>
                    </span>
                    {a.tool}
                  </p>
                  <p
                    className={cm.cn(
                      cm.sp('mt', 1),
                      cm.textSize('xs'),
                      'break-words font-mono text-on-surface-variant',
                    )}
                  >
                    <span className={cm.fontWeight('bold')}>
                      {t('callDetail.arguments', {}, { defaultValue: 'args' })}:{' '}
                    </span>
                    {prettyAction(a.arguments)}
                  </p>
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      'break-words font-mono text-on-surface-variant',
                    )}
                  >
                    <span className={cm.fontWeight('bold')}>
                      {t('callDetail.result', {}, { defaultValue: 'result' })}:{' '}
                    </span>
                    {prettyAction(a.result)}
                  </p>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  )
}
