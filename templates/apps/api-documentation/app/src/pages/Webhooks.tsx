import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface WebhookEvent {
  id: string
  name: string
  description: string
  payload: string
  retry_policy?: string | null
}

export function Webhooks() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [events, setEvents] = useState<WebhookEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/webhooks')
      .then((res) => {
        if (cancelled) return
        const list = unwrapList<WebhookEvent>(res)
        setEvents(list)
        if (list.length > 0) setOpenIndex(0)
      })
      .catch(() => {
        if (!cancelled)
          setError(t('webhooks.loadError', {}, { defaultValue: 'Failed to load webhooks.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('6xl'), cm.mxAuto, cm.stack(8))}>
      <header>
        <p
          className={cm.cn(
            'text-[11px] font-bold uppercase tracking-widest text-violet-400 font-mono mb-2',
          )}
        >
          {t('webhooks.eyebrow', {}, { defaultValue: 'WEBHOOKS' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
          {t('webhooks.heading', {}, { defaultValue: 'Event subscriptions' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
          {loading
            ? t('webhooks.loading', {}, { defaultValue: 'Loading webhooks…' })
            : t(
                'webhooks.subheading',
                { count: events.length },
                { defaultValue: '{{count}} events · signed with HMAC-SHA256, replay-protected' },
              )}
        </p>
      </header>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : events.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('webhooks.empty', {}, { defaultValue: 'No webhook events published yet.' })}
        </p>
      ) : (
        <ul className={cm.cn('space-y-3')}>
          {events.map((evt, i) => {
            const open = openIndex === i
            return (
              <li
                key={evt.id ?? evt.name}
                className={cm.cn('bg-surface-container-lowest rounded-2xl overflow-hidden')}
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(open ? null : i)}
                  aria-expanded={open}
                  className={cm.cn(
                    cm.sp('px', 6),
                    cm.sp('py', 5),
                    'w-full text-left hover:bg-surface-container-low transition-colors',
                  )}
                >
                  <div className={cm.flex({ align: 'center', justify: 'between', gap: 'md' })}>
                    <code className={cm.cn('text-sm font-mono font-bold text-emerald-400')}>
                      {evt.name}
                    </code>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant font-mono">
                      {open
                        ? t('webhooks.collapse', {}, { defaultValue: 'COLLAPSE' })
                        : t('webhooks.expand', {}, { defaultValue: 'EXPAND' })}
                    </span>
                  </div>
                  <p
                    className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}
                  >
                    {evt.description}
                  </p>
                </button>
                {open && (
                  <div className={cm.cn('border-t border-outline-variant/30')}>
                    <div className={cm.cn(cm.sp('px', 6), cm.sp('py', 4))}>
                      <p
                        className={cm.cn(
                          'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant font-mono mb-2',
                        )}
                      >
                        {t('webhooks.samplePayload', {}, { defaultValue: 'SAMPLE_PAYLOAD' })}
                      </p>
                      <pre
                        className={cm.cn(
                          'text-xs leading-relaxed font-mono p-4 rounded-xl overflow-auto',
                        )}
                        style={{
                          backgroundColor: 'var(--mol-color-secondary)',
                          color: 'var(--mol-color-background-tertiary)',
                        }}
                      >
                        {evt.payload}
                      </pre>
                      {evt.retry_policy ? (
                        <>
                          <p
                            className={cm.cn(
                              'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant font-mono mt-4 mb-1',
                            )}
                          >
                            {t('webhooks.retryPolicy', {}, { defaultValue: 'RETRY_POLICY' })}
                          </p>
                          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface')}>
                            {evt.retry_policy}
                          </p>
                        </>
                      ) : null}
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
