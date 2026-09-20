import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { formatDuration, languageLabel } from '../lib/format.js'
import { unwrapList } from '../lib/unwrap.js'

interface CallRow {
  id: string
  voice_agent_id: string
  voice_agent_name: string | null
  direction: string
  detected_language: string | null
  started_at: string
  duration_seconds: number
  outcome: string | null
  summary: string | null
}

export function Calls() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [calls, setCalls] = useState<CallRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await http.get('/api/calls')
        if (cancelled) return
        setCalls(unwrapList<CallRow>(res))
      } catch (_e) {
        if (!cancelled) {
          setError(t('calls.loadError', {}, { defaultValue: 'Failed to load calls.' }))
          setCalls([])
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http, t])

  return (
    <div className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <div className={cm.flex({ align: 'center', justify: 'between', wrap: 'wrap' })}>
        <h1
          className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}
          data-mol-id="calls-heading"
        >
          {t('calls.heading', {}, { defaultValue: 'Calls' })}
        </h1>
        <Link
          to="/simulator"
          data-mol-id="calls-simulator-link"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            'rounded-xl bg-primary text-on-primary hover:bg-primary-container transition-colors shadow-lg',
          )}
        >
          {t('calls.openSimulator', {}, { defaultValue: 'Simulate a call' })}
        </Link>
      </div>
      <p className={cm.cn(cm.sp('mt', 1), 'text-on-surface-variant')}>
        {t(
          'calls.subheading',
          {},
          {
            defaultValue:
              'Every conversation with its detected language, outcome, and the agent\u2019s tool timeline.',
          },
        )}
      </p>

      {error ? (
        <p
          data-mol-id="calls-error"
          className={cm.cn(
            cm.sp('mt', 4),
            cm.sp('px', 4),
            cm.sp('py', 3),
            'rounded-xl bg-error/10 text-error border border-error/30',
          )}
        >
          {error}
        </p>
      ) : null}

      <ul className={cm.cn(cm.sp('mt', 6), cm.flex({ direction: 'col', gap: 'sm' }))}>
        {calls === null ? (
          <li data-mol-id="calls-loading" className="text-on-surface-variant">
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </li>
        ) : calls.length === 0 ? (
          <li data-mol-id="calls-empty" className="text-on-surface-variant">
            {t(
              'calls.empty',
              {},
              { defaultValue: 'No calls yet — the simulator is one click away.' },
            )}
          </li>
        ) : (
          calls.map((call) => (
            <li key={call.id}>
              <Link
                to={'/calls/' + call.id}
                data-mol-id={'call-row-' + call.id}
                className={cm.cn(
                  cm.sp('p', 4),
                  'block rounded-xl bg-surface border border-outline-variant hover:border-primary/60 transition-colors',
                  cm.flex({ align: 'center', justify: 'between', gap: 'sm', wrap: 'wrap' }),
                )}
              >
                <span>
                  <span className="font-semibold">
                    {call.voice_agent_name ??
                      t('common.voiceAgent', {}, { defaultValue: 'Voice agent' })}
                  </span>
                  <span
                    className={cm.cn(cm.sp('ml', 2), cm.textSize('sm'), 'text-on-surface-variant')}
                  >
                    {languageLabel(call.detected_language)} ·{' '}
                    {formatDuration(call.duration_seconds)}
                  </span>
                  {call.summary ? (
                    <span className={cm.cn('block', cm.textSize('sm'), 'text-on-surface-variant')}>
                      {call.summary}
                    </span>
                  ) : null}
                </span>
                <span
                  data-mol-id={'call-outcome-' + call.id}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'rounded-full bg-surface-container-high uppercase tracking-widest',
                  )}
                >
                  {call.outcome ?? t('callOutcome.inProgress', {}, { defaultValue: 'in progress' })}
                </span>
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
