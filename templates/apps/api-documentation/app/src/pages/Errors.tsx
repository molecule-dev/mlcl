import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface ApiError {
  status: number
  code: string
  description: string
  // Stored as JSONB in Postgres, so the API may return either a string
  // (legacy rows) or a parsed object (jsonb auto-deserializes). Render
  // both shapes safely as a JSON code block.
  example_response: string | Record<string, unknown> | null
  troubleshooting: string
}

function formatExample(example: ApiError['example_response']): string {
  if (example == null) return ''
  if (typeof example === 'string') {
    // Legacy rows that stored the example as a JSON-encoded string get
    // re-parsed for pretty-print so all rows render the same way.
    try {
      return JSON.stringify(JSON.parse(example), null, 2)
    } catch (_error) {
      // Legacy row stored a non-JSON string; return as-is
      return example
    }
  }
  return JSON.stringify(example, null, 2)
}

export function Errors() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [errors, setErrors] = useState<ApiError[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/api_errors')
      .then((res) => {
        if (!cancelled) setErrors(unwrapList<ApiError>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('errors.loadError', {}, { defaultValue: 'Failed to load error reference.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const grouped = useMemo(() => {
    const map = new Map<string, ApiError[]>()
    for (const e of errors) {
      const cat =
        e.status >= 500
          ? t('errors.group.5xx', {}, { defaultValue: '5xx — Server errors' })
          : e.status >= 400
            ? t('errors.group.4xx', {}, { defaultValue: '4xx — Client errors' })
            : t('errors.group.other', {}, { defaultValue: 'Other' })
      const arr = map.get(cat) ?? []
      arr.push(e)
      map.set(cat, arr)
    }
    return Array.from(map.entries())
  }, [errors, t])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, 'space-y-6')}>
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-primary font-mono',
          )}
        >
          {t('errors.eyebrow', {}, { defaultValue: 'ERROR_REF' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('errors.heading', {}, { defaultValue: 'Errors' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'errors.subheading',
            {},
            { defaultValue: 'Error code reference grouped by HTTP status category.' },
          )}
        </p>
      </header>

      <section aria-labelledby="errors-envelope-title" data-testid="errors-envelope">
        <h2
          id="errors-envelope-title"
          className={cm.cn(
            cm.textSize('lg'),
            cm.fontWeight('semibold'),
            cm.sp('mb', 4),
            'flex items-center gap-2',
          )}
        >
          <span className="material-symbols-outlined text-on-surface-variant" aria-hidden="true">
            integration_instructions
          </span>
          {t('errors.envelope.heading', {}, { defaultValue: 'Error Envelope' })}
        </h2>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mb', 3), 'text-on-surface-variant')}>
          {t(
            'errors.envelope.body',
            { appName: 'Prism' },
            {
              defaultValue:
                'Every error returns the same JSON envelope. Branch on the machine-readable type field; the human-readable message and doc_url are for display and follow-up reading.',
            },
          )}
        </p>
        <pre
          className={cm.cn(
            cm.sp('p', 4),
            'bg-secondary text-on-secondary rounded-lg font-mono text-[13px] leading-relaxed overflow-x-auto',
          )}
        >
          {`{
  "error": {
    "type": "invalid_request_error",
    "code": "resource_missing",
    "message": "The requested workspace 'ws_8j9k' does not exist.",
    "request_id": "req_9Lp2mK5r",
    "doc_url": "https://docs.prism.dev/errors#resource_missing",
    "fields": [
      { "field": "workspace_id", "issue": "Invalid format or missing record" }
    ]
  }
}`}
        </pre>
      </section>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : errors.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t(
            'errors.empty',
            {},
            { defaultValue: 'No errors documented yet — POST /api/api_errors to add one.' },
          )}
        </p>
      ) : (
        <div className={cm.cn('space-y-6')}>
          {grouped.map(([cat, items]) => (
            <section key={cat} className={cm.cn(cm.card(), 'overflow-hidden')}>
              <header
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 3),
                  'bg-surface-container border-b border-outline-variant',
                )}
              >
                <h2
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'uppercase tracking-wide',
                  )}
                >
                  {cat}
                </h2>
              </header>
              <ul className="divide-y divide-outline-variant">
                {items.map((e) => (
                  <li key={e.code} className={cm.cn(cm.sp('px', 5), cm.sp('py', 4), 'space-y-2')}>
                    <header className={cm.flex({ align: 'center', gap: 'md' })}>
                      <code
                        className={cm.cn(
                          cm.fontWeight('bold'),
                          'font-mono',
                          e.status >= 500 ? 'text-error' : 'text-warning',
                        )}
                      >
                        {e.status}
                      </code>
                      <code
                        className={cm.cn(cm.fontWeight('semibold'), 'font-mono', cm.textPrimary)}
                      >
                        {e.code}
                      </code>
                      <p className={cm.cn(cm.textSize('sm'))}>{e.description}</p>
                    </header>
                    <pre
                      className={cm.cn(
                        cm.sp('p', 3),
                        'bg-secondary text-on-secondary rounded-md font-mono text-xs overflow-x-auto',
                      )}
                    >
                      {formatExample(e.example_response)}
                    </pre>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      <strong>
                        {t('errors.troubleshooting', {}, { defaultValue: 'Troubleshooting:' })}
                      </strong>{' '}
                      {e.troubleshooting}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
