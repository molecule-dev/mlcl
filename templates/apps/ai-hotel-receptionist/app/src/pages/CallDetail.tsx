import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { formatDuration, languageLabel } from '../lib/format.js'
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
          'rounded-xl bg-error/10 text-error border border-error/30 inline-block',
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

  const facts: Array<{ label: string; value: string }> = [
    {
      label: t('callDetail.agent', {}, { defaultValue: 'Agent' }),
      value: call.voice_agent_name ?? '—',
    },
    {
      label: t('callDetail.detectedLanguage', {}, { defaultValue: 'Detected language' }),
      value: languageLabel(call.detected_language),
    },
    {
      label: t('callDetail.duration', {}, { defaultValue: 'Duration' }),
      value: formatDuration(call.duration_seconds),
    },
    {
      label: t('callDetail.outcome', {}, { defaultValue: 'Outcome' }),
      value: call.outcome ?? t('callOutcome.inProgress', {}, { defaultValue: 'in progress' }),
    },
    { label: t('callDetail.engine', {}, { defaultValue: 'Engine' }), value: call.mode },
  ]

  return (
    <div className={cm.cn(cm.maxW('4xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <Link
        to="/calls"
        data-mol-id="call-detail-back"
        className={cm.cn(
          cm.textSize('sm'),
          cm.fontWeight('semibold'),
          '-my-2 inline-block py-2 text-primary hover:underline',
        )}
      >
        ← {t('calls.heading', {}, { defaultValue: 'Calls' })}
      </Link>
      <h1
        className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mt', 1))}
        data-mol-id="call-detail-heading"
      >
        {t(
          'callDetail.heading',
          { agent: call.voice_agent_name ?? '' },
          { defaultValue: 'Call with {{agent}}' },
        )}
      </h1>

      <dl
        className={cm.cn(
          cm.sp('mt', 4),
          cm.flex({ direction: 'col', gap: 'sm' }),
          'rounded-2xl bg-surface border border-outline-variant',
          cm.sp('p', 6),
        )}
      >
        {facts.map((fact) => (
          <div key={fact.label} className={cm.flex({ align: 'center', justify: 'between' })}>
            <dt
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {fact.label}
            </dt>
            <dd
              data-mol-id={'call-detail-fact-' + fact.label.toLowerCase().replace(/[^a-z]+/g, '-')}
            >
              {fact.value}
            </dd>
          </div>
        ))}
      </dl>

      {call.summary ? (
        <p
          data-mol-id="call-detail-summary"
          className={cm.cn(
            cm.sp('mt', 4),
            cm.sp('p', 4),
            'rounded-2xl bg-surface-container-low border border-outline-variant text-sm',
          )}
        >
          {call.summary}
        </p>
      ) : null}

      <div className={cm.cn(cm.sp('mt', 6), 'grid grid-cols-1 lg:grid-cols-2 gap-6')}>
        {/* Transcript */}
        <section
          className={cm.cn(cm.sp('p', 6), 'rounded-2xl bg-surface border border-outline-variant')}
          aria-label={t('callDetail.transcriptLabel', {}, { defaultValue: 'Transcript' })}
        >
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
            {t('callDetail.transcript', {}, { defaultValue: 'Transcript' })}
          </h2>
          <ul className={cm.cn(cm.sp('mt', 3), cm.flex({ direction: 'col', gap: 'sm' }))}>
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
                    cm.sp('p', 3),
                    'rounded-xl max-w-[90%]',
                    m.role === 'caller'
                      ? 'bg-surface-container-high self-end'
                      : 'bg-primary/10 self-start',
                  )}
                >
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('callRole.' + m.role, {}, { defaultValue: m.role })}
                    {m.language ? ' · ' + m.language : ''}
                  </p>
                  <p className={cm.cn(cm.sp('mt', 1), cm.textSize('sm'))}>{m.text}</p>
                </li>
              ))
            )}
          </ul>
        </section>

        {/* Tool-call timeline */}
        <section
          className={cm.cn(cm.sp('p', 6), 'rounded-2xl bg-surface border border-outline-variant')}
          aria-label={t('callDetail.timelineLabel', {}, { defaultValue: 'Agent tool timeline' })}
        >
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
            {t('callDetail.timeline', {}, { defaultValue: 'Agent actions' })}
          </h2>
          <ul className={cm.cn(cm.sp('mt', 3), cm.flex({ direction: 'col', gap: 'sm' }))}>
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
                    'rounded-xl border border-outline-variant bg-surface-container-low',
                  )}
                >
                  <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-primary')}>
                    <span
                      className="material-symbols-outlined align-middle text-base"
                      aria-hidden="true"
                    >
                      build
                    </span>{' '}
                    {a.tool}
                  </p>
                  <p className={cm.cn(cm.sp('mt', 1), cm.textSize('xs'), 'break-words')}>
                    <span className="text-on-surface-variant">
                      {t('callDetail.arguments', {}, { defaultValue: 'args' })}:{' '}
                    </span>
                    {prettyAction(a.arguments)}
                  </p>
                  <p className={cm.cn(cm.textSize('xs'), 'break-words')}>
                    <span className="text-on-surface-variant">
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
