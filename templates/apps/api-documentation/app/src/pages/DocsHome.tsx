import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { EndpointPlaygroundHero } from '../components/EndpointPlaygroundHero.js'
import { EndpointsList } from '../components/EndpointsList.js'
import { GuidesGrid } from '../components/GuidesGrid.js'
import { MethodBadgeRow } from '../components/MethodBadgeRow.js'
import { unwrapList } from '../lib/unwrap.js'

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

interface Endpoint {
  id: string
  method: Method
  path: string
  summary: string
  resource: string
  deprecated: boolean
}

const GUIDES = [
  {
    key: 'auth',
    title: 'Authentication',
    body: 'Generate a bearer token, scope it to specific resources, rotate keys without downtime, and verify webhook signatures with HMAC.',
    icon: 'lock',
    href: '/docs/guides',
    status: 'stable' as const,
    readingMins: 6,
  },
  {
    key: 'pagination',
    title: 'Pagination & cursors',
    body: 'All list endpoints return cursors, never page numbers. Stable across writes. Includes a complete loop example for safe full-list traversal.',
    icon: 'view_stream',
    href: '/docs/guides',
    status: 'stable' as const,
    readingMins: 4,
  },
  {
    key: 'webhooks',
    title: 'Webhook signatures',
    body: 'Every event is signed with a per-endpoint secret. Includes idempotency-key handling, retry policy (exponential backoff), and replay protection.',
    icon: 'webhook',
    href: '/docs/webhooks',
    status: 'stable' as const,
    readingMins: 8,
  },
  {
    key: 'errors',
    title: 'Error reference',
    body: 'Every 4xx/5xx code with example payloads, recovery patterns, and links back to the relevant endpoint docs.',
    icon: 'report',
    href: '/docs/errors',
    status: 'stable' as const,
    readingMins: 5,
  },
  {
    key: 'sdks',
    title: 'Client SDKs',
    body: 'Officially supported in Node, Python, Go, Ruby, PHP, and Java. Generated from the same OpenAPI spec; auto-typed responses; one-line install.',
    icon: 'inventory_2',
    href: '/docs/sdks',
    status: 'stable' as const,
    readingMins: 3,
  },
  {
    key: 'realtime',
    title: 'Realtime events (beta)',
    body: 'Server-sent events stream at /v3/events. Resume from the last id on reconnect; dedupe by signature header. Currently in invite-only beta.',
    icon: 'bolt',
    href: '/docs/guides',
    status: 'beta' as const,
    readingMins: 7,
  },
] as const

export function DocsHome() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [endpoints, setEndpoints] = useState<Endpoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/endpoints')
      .catch(() => null)
      .then((res) => {
        if (!cancelled) setEndpoints(unwrapList<Endpoint>(res))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const counts = useMemo(() => {
    const acc: Record<Method, number> = { GET: 0, POST: 0, PUT: 0, DELETE: 0, PATCH: 0 }
    for (const e of endpoints) acc[e.method] = (acc[e.method] ?? 0) + 1
    return (Object.keys(acc) as Method[]).map((method) => ({ method, count: acc[method] }))
  }, [endpoints])

  const recent = useMemo(() => endpoints.slice(0, 6), [endpoints])

  // Translate the static guide cards at render time (same pattern as
  // Landing's FEATURES) so locale bonds can override the English defaults.
  const guides = GUIDES.map((g) => ({
    ...g,
    title: t(`docsHome.guide.${g.key}.title`, {}, { defaultValue: g.title }),
    body: t(`docsHome.guide.${g.key}.body`, {}, { defaultValue: g.body }),
  }))

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <header>
        <p
          className={cm.cn(
            cm.textSize('sm'),
            'text-primary font-bold uppercase tracking-widest font-mono',
          )}
        >
          {t('docsHome.versionLabel', {}, { defaultValue: 'API v3.2 · OpenAPI 3.1' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight mt-1')}>
          {t('docsHome.heading', {}, { defaultValue: 'Getting started with the API' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'docsHome.subheading',
            {},
            {
              defaultValue:
                'A REST API for managing accounts, transactions, and webhooks. Authenticate with a bearer token; all endpoints return JSON.',
            },
          )}
        </p>
      </header>

      <EndpointPlaygroundHero
        endpointCount={endpoints.length}
        guideCount={GUIDES.length}
        sdkCount={6}
        uptimePct={99.97}
        sampleMethod="GET"
        samplePath="/v3/accounts?limit=25"
      />

      <section className={cm.stack(4)}>
        <div
          className={cm.flex({ align: 'baseline', justify: 'between', wrap: 'wrap', gap: 'md' })}
        >
          <h2 className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight')}>
            {t('docsHome.coverageHeading', {}, { defaultValue: 'API surface' })}
          </h2>
          <p className={cm.cn('text-xs font-mono text-on-surface-variant tabular-nums')}>
            {loading
              ? t('docsHome.loadingCounts', {}, { defaultValue: 'Counting endpoints…' })
              : t(
                  'docsHome.totalCount',
                  { count: endpoints.length },
                  { defaultValue: '{{count}} total endpoints' },
                )}
          </p>
        </div>
        <MethodBadgeRow counts={counts} />
      </section>

      <section className={cm.stack(4)}>
        <div
          className={cm.flex({ align: 'baseline', justify: 'between', wrap: 'wrap', gap: 'md' })}
        >
          <h2 className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight')}>
            {t('docsHome.endpointsHeading', {}, { defaultValue: 'Endpoints to get started' })}
          </h2>
          <Link
            to="/docs/endpoints"
            className={cm.cn('text-sm font-bold text-primary hover:underline')}
          >
            {t('docsHome.viewAllEndpoints', {}, { defaultValue: 'Browse all →' })}
          </Link>
        </div>
        <EndpointsList endpoints={recent} />
      </section>

      <section className={cm.stack(4)}>
        <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
          <h2 className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight')}>
            {t('docsHome.guidesHeading', {}, { defaultValue: 'Guides' })}
          </h2>
          <Link
            to="/docs/guides"
            className={cm.cn('text-sm font-bold text-primary hover:underline')}
          >
            {t('docsHome.viewAllGuides', {}, { defaultValue: 'All guides →' })}
          </Link>
        </div>
        <GuidesGrid guides={guides} />
      </section>
    </div>
  )
}
