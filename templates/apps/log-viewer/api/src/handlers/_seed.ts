/**
 * log-viewer — per-user demo seeding.
 *
 * On the first authenticated request from a user (signup or login) this
 * module checks whether the user has any data yet (services, streams,
 * etc.). If not, it seeds a realistic Datadog-style snapshot derived
 * from the JSON fixtures in api/fixtures/. Every row is owned by the
 * caller's user_id, so it stays scoped per-user even though the
 * fixture content is shared.
 *
 * The seed is gated on count(services). Once a user has services,
 * subsequent calls become a no-op. Concurrent calls are guarded with
 * an in-memory `seedingInFlight` set to avoid double-seeding when a
 * fresh signup hits multiple endpoints simultaneously.
 */

import { count, create } from '@molecule/api-database'
import { logger } from '@molecule/api-logger'

const seededUsers = new Set<string>()
const seedingInFlight = new Map<string, Promise<void>>()

interface IncidentFixture {
  id: string
  title: string
  service: string
  severity: string
  status: string
  owner: string | null
  started_at: string
  resolved_at: string | null
  impacted_users: number
}

interface ServiceFixture {
  id: string
  name: string
  description: string
  owner_team: string
  health: string
  log_rate_per_min: number
  error_rate_pct: number
  recent_volume: number[]
}

interface StreamFixture {
  id: string
  name: string
  source: string
  format: string
  rate_per_sec: number
  retention_days: number
  status: string
  last_event_at: string
}

interface AlertFixture {
  id: string
  name: string
  service: string
  severity: string
  condition: string
  channels: string[]
  status: string
  last_fired_at: string
  fire_count_24h: number
}

interface TraceFixture {
  id: string
  root_service: string
  operation: string
  duration_ms: number
  status: string
  started_at: string
  span_count: number
  error_count: number
}

interface SavedFixture {
  id: string
  name: string
  query: string
  owner: string
  shared: boolean
  last_run_at: string
  result_count: number
}

interface LogFixture {
  id: string
  timestamp: string
  service: string
  severity: string
  message: string
  trace_id: string | null
}

const SERVICES: ServiceFixture[] = [
  {
    id: 'svc-checkout',
    name: 'checkout',
    description: 'Stripe-backed payment authorization, capture, and webhook reconciliation.',
    owner_team: 'Payments',
    health: 'degraded',
    log_rate_per_min: 2812,
    error_rate_pct: 4.21,
    recent_volume: [180, 220, 190, 250, 310, 410, 520, 480, 390, 340, 320, 360],
  },
  {
    id: 'svc-api-gateway',
    name: 'api-gateway',
    description: 'Edge HTTP entry; auth + rate limit + routing to upstream services.',
    owner_team: 'Platform',
    health: 'healthy',
    log_rate_per_min: 9218,
    error_rate_pct: 0.34,
    recent_volume: [800, 820, 810, 850, 870, 880, 920, 900, 910, 880, 850, 870],
  },
  {
    id: 'svc-auth',
    name: 'auth-service',
    description: 'Sessions, OAuth, MFA, and SSO assertion handling.',
    owner_team: 'Identity',
    health: 'healthy',
    log_rate_per_min: 1942,
    error_rate_pct: 0.18,
    recent_volume: [110, 120, 115, 125, 130, 140, 150, 145, 138, 132, 130, 134],
  },
  {
    id: 'svc-billing',
    name: 'billing',
    description: 'Invoices, subscription state, dunning, and webhook ingestion.',
    owner_team: 'Payments',
    health: 'healthy',
    log_rate_per_min: 612,
    error_rate_pct: 0.42,
    recent_volume: [40, 38, 42, 50, 48, 60, 58, 52, 48, 44, 46, 50],
  },
  {
    id: 'svc-search-index',
    name: 'search-index',
    description: 'Inverted-index document ingest and Meilisearch sync.',
    owner_team: 'Discovery',
    health: 'degraded',
    log_rate_per_min: 1184,
    error_rate_pct: 1.62,
    recent_volume: [70, 80, 90, 110, 130, 150, 200, 240, 220, 180, 150, 140],
  },
  {
    id: 'svc-data-pipeline',
    name: 'data-pipeline',
    description: 'Kafka → ClickHouse ETL, snapshotting, and offset bookkeeping.',
    owner_team: 'Data Platform',
    health: 'healthy',
    log_rate_per_min: 730,
    error_rate_pct: 0.07,
    recent_volume: [50, 52, 60, 58, 62, 65, 68, 72, 70, 68, 64, 60],
  },
  {
    id: 'svc-edge-cdn',
    name: 'edge-cdn',
    description: 'Static + image edge cache, regional invalidation, signed-URL minting.',
    owner_team: 'Platform',
    health: 'healthy',
    log_rate_per_min: 12409,
    error_rate_pct: 0.02,
    recent_volume: [1100, 1120, 1080, 1150, 1180, 1200, 1230, 1240, 1210, 1190, 1170, 1180],
  },
  {
    id: 'svc-notifications',
    name: 'notifications',
    description: 'Push, email, in-app feed; integrations with Mailgun and APNs.',
    owner_team: 'Growth',
    health: 'maintenance',
    log_rate_per_min: 384,
    error_rate_pct: 0.0,
    recent_volume: [30, 28, 32, 30, 34, 38, 36, 35, 32, 30, 28, 30],
  },
]

const STREAMS: StreamFixture[] = [
  {
    id: 'str-prod-app',
    name: 'prod-app',
    source: 'kubernetes/prod',
    format: 'json',
    rate_per_sec: 412,
    retention_days: 30,
    status: 'active',
    last_event_at: '__T-1m',
  },
  {
    id: 'str-prod-api',
    name: 'prod-api',
    source: 'kubernetes/prod',
    format: 'json',
    rate_per_sec: 218,
    retention_days: 30,
    status: 'active',
    last_event_at: '__T-1m',
  },
  {
    id: 'str-staging',
    name: 'staging-cluster',
    source: 'kubernetes/staging',
    format: 'json',
    rate_per_sec: 18,
    retention_days: 7,
    status: 'active',
    last_event_at: '__T-2m',
  },
  {
    id: 'str-payments',
    name: 'payments',
    source: 'fluentbit/payments',
    format: 'logfmt',
    rate_per_sec: 64,
    retention_days: 90,
    status: 'active',
    last_event_at: '__T-2m',
  },
  {
    id: 'str-edge-access',
    name: 'edge-access',
    source: 'cloudfront',
    format: 'clf',
    rate_per_sec: 982,
    retention_days: 30,
    status: 'active',
    last_event_at: '__T-1m',
  },
  {
    id: 'str-cron',
    name: 'cron-jobs',
    source: 'kubernetes/jobs',
    format: 'json',
    rate_per_sec: 2,
    retention_days: 14,
    status: 'paused',
    last_event_at: '__T-9h',
  },
  {
    id: 'str-mobile-ios',
    name: 'mobile-ios',
    source: 'sdk/ios',
    format: 'json',
    rate_per_sec: 71,
    retention_days: 14,
    status: 'active',
    last_event_at: '__T-3m',
  },
  {
    id: 'str-mobile-android',
    name: 'mobile-android',
    source: 'sdk/android',
    format: 'json',
    rate_per_sec: 88,
    retention_days: 14,
    status: 'active',
    last_event_at: '__T-4m',
  },
]

const ALERTS: AlertFixture[] = [
  {
    id: 'al-checkout-5xx',
    name: 'Checkout 5xx error rate',
    service: 'checkout',
    severity: 'fatal',
    condition: 'error_rate_pct > 2.5 over 5m',
    channels: ['pagerduty:p_eng', 'slack:#payments-on-call'],
    status: 'firing',
    last_fired_at: '__T-12m',
    fire_count_24h: 4,
  },
  {
    id: 'al-search-lag',
    name: 'Search index ingest lag',
    service: 'search-index',
    severity: 'error',
    condition: 'lag_ms > 1500 over 10m',
    channels: ['slack:#search-eng'],
    status: 'firing',
    last_fired_at: '__T-2h',
    fire_count_24h: 2,
  },
  {
    id: 'al-auth-latency',
    name: 'Auth p95 callback latency',
    service: 'auth-service',
    severity: 'warn',
    condition: 'p95_latency_ms > 800 over 15m',
    channels: ['slack:#identity'],
    status: 'monitoring',
    last_fired_at: '__T-5h',
    fire_count_24h: 1,
  },
  {
    id: 'al-billing-webhook',
    name: 'Billing webhook backlog',
    service: 'billing',
    severity: 'warn',
    condition: 'webhook_queue_depth > 500 over 5m',
    channels: ['slack:#payments-on-call'],
    status: 'ok',
    last_fired_at: '__T-19h',
    fire_count_24h: 0,
  },
  {
    id: 'al-edge-cdn-poison',
    name: 'Edge CDN cache poisoning advisory',
    service: 'edge-cdn',
    severity: 'error',
    condition: 'purge_failures > 5 over 30m',
    channels: ['slack:#platform'],
    status: 'firing',
    last_fired_at: '__T-6h',
    fire_count_24h: 1,
  },
  {
    id: 'al-data-pipeline-lag',
    name: 'Kafka consumer lag (data-pipeline)',
    service: 'data-pipeline',
    severity: 'info',
    condition: 'consumer_lag > 60s over 10m',
    channels: ['slack:#data-platform'],
    status: 'ok',
    last_fired_at: '__T-22h',
    fire_count_24h: 0,
  },
  {
    id: 'al-low-fatal',
    name: 'Any FATAL log line',
    service: '*',
    severity: 'fatal',
    condition: 'severity = fatal count > 0 over 1m',
    channels: ['pagerduty:p_eng'],
    status: 'firing',
    last_fired_at: '__T-3m',
    fire_count_24h: 6,
  },
]

const INCIDENTS: IncidentFixture[] = [
  {
    id: 'inc1',
    title: 'Checkout 5xx spike on stripe charges',
    service: 'checkout',
    severity: 'sev1',
    status: 'investigating',
    owner: 'Riley Kovacs',
    started_at: '__T-12m',
    resolved_at: null,
    impacted_users: 1284,
  },
  {
    id: 'inc2',
    title: 'Search index lag exceeding SLA in eu-west',
    service: 'search-index',
    severity: 'sev2',
    status: 'mitigated',
    owner: 'Jordan Ma',
    started_at: '__T-2h',
    resolved_at: null,
    impacted_users: 312,
  },
  {
    id: 'inc3',
    title: 'Auth-service slow oauth callbacks',
    service: 'auth-service',
    severity: 'sev3',
    status: 'monitoring',
    owner: 'Sasha Petrov',
    started_at: '__T-5h',
    resolved_at: null,
    impacted_users: 88,
  },
  {
    id: 'inc4',
    title: 'Edge CDN cache poisoning advisory',
    service: 'edge-cdn',
    severity: 'sev2',
    status: 'open',
    owner: 'Imani Davies',
    started_at: '__T-6h',
    resolved_at: null,
    impacted_users: 47,
  },
  {
    id: 'inc5',
    title: 'Billing webhook backlog cleared',
    service: 'billing',
    severity: 'sev3',
    status: 'resolved',
    owner: 'Morgan Cho',
    started_at: '__T-15h',
    resolved_at: '__T-12h',
    impacted_users: 19,
  },
  {
    id: 'inc6',
    title: 'Data pipeline kafka lag',
    service: 'data-pipeline',
    severity: 'sev4',
    status: 'resolved',
    owner: 'Riley Kovacs',
    started_at: '__T-19h',
    resolved_at: '__T-18h25m',
    impacted_users: 0,
  },
]

const TRACES: TraceFixture[] = [
  {
    id: 'trc_b8d4f1a3c1',
    root_service: 'api-gateway',
    operation: 'POST /v1/checkout',
    duration_ms: 3122,
    status: 'error',
    started_at: '__T-7m',
    span_count: 14,
    error_count: 3,
  },
  {
    id: 'trc_19e2c7da8b',
    root_service: 'auth-service',
    operation: 'POST /oauth/callback',
    duration_ms: 412,
    status: 'ok',
    started_at: '__T-9m',
    span_count: 6,
    error_count: 0,
  },
  {
    id: 'trc_77a02bd9e3',
    root_service: 'edge-cdn',
    operation: 'GET /api/v2/products/p_392',
    duration_ms: 18,
    status: 'ok',
    started_at: '__T-5m',
    span_count: 2,
    error_count: 0,
  },
  {
    id: 'trc_661ab09cf2',
    root_service: 'api-gateway',
    operation: 'GET /api/v2/orders',
    duration_ms: 142,
    status: 'ok',
    started_at: '__T-11m',
    span_count: 9,
    error_count: 0,
  },
  {
    id: 'trc_8a112d0ef9',
    root_service: 'billing',
    operation: 'subscription.renew',
    duration_ms: 891,
    status: 'ok',
    started_at: '__T-14m',
    span_count: 11,
    error_count: 0,
  },
  {
    id: 'trc_aa120d4cf3',
    root_service: 'search-index',
    operation: 'POST /index/products',
    duration_ms: 1812,
    status: 'warning',
    started_at: '__T-25m',
    span_count: 7,
    error_count: 1,
  },
  {
    id: 'trc_d44e218a91',
    root_service: 'checkout',
    operation: 'stripe.charges.create',
    duration_ms: 3001,
    status: 'error',
    started_at: '__T-32m',
    span_count: 4,
    error_count: 1,
  },
]

const SAVED: SavedFixture[] = [
  {
    id: 'saved-1',
    name: 'Errors in checkout last 1h',
    query: 'service:checkout severity:>=error',
    owner: 'Riley Kovacs',
    shared: true,
    last_run_at: '__T-15m',
    result_count: 218,
  },
  {
    id: 'saved-2',
    name: 'Slow oauth callbacks',
    query: 'service:auth-service path:/oauth/callback duration_ms:>800',
    owner: 'Sasha Petrov',
    shared: true,
    last_run_at: '__T-2h',
    result_count: 41,
  },
  {
    id: 'saved-3',
    name: '5xx by service (last 24h)',
    query: 'status:5xx | stats count by service',
    owner: 'Jordan Ma',
    shared: true,
    last_run_at: '__T-5h',
    result_count: 8,
  },
  {
    id: 'saved-4',
    name: 'My recent searches',
    query: 'user_id:usr_4f2e91a',
    owner: 'Imani Davies',
    shared: false,
    last_run_at: '__T-6h',
    result_count: 132,
  },
  {
    id: 'saved-5',
    name: 'Stripe webhooks',
    query: 'service:billing source:webhook stripe',
    owner: 'Morgan Cho',
    shared: true,
    last_run_at: '__T-15h',
    result_count: 612,
  },
  {
    id: 'saved-6',
    name: 'Cache poisoning suspects',
    query: 'service:edge-cdn message:cache_purge_fail',
    owner: 'Imani Davies',
    shared: true,
    last_run_at: '__T-19h',
    result_count: 12,
  },
]

const LOGS: LogFixture[] = [
  {
    id: 'lg1',
    timestamp: '__T-2m',
    service: 'api-gateway',
    severity: 'fatal',
    message: 'panic: nil pointer dereference in handlers/checkout.go:142',
    trace_id: 'trc_b8d4f1a3c1',
  },
  {
    id: 'lg2',
    timestamp: '__T-3m',
    service: 'checkout',
    severity: 'error',
    message: 'stripe: charge failed — card_declined',
    trace_id: 'trc_b8d4f1a3c1',
  },
  {
    id: 'lg3',
    timestamp: '__T-3m',
    service: 'checkout',
    severity: 'warn',
    message: 'retrying upstream charge after backoff (attempt 3/5)',
    trace_id: 'trc_b8d4f1a3c1',
  },
  {
    id: 'lg4',
    timestamp: '__T-4m',
    service: 'auth-service',
    severity: 'info',
    message: 'session refreshed for user_id=usr_4f2e91a payload.iat=1714485518',
    trace_id: 'trc_19e2c7da8b',
  },
  {
    id: 'lg5',
    timestamp: '__T-5m',
    service: 'search-index',
    severity: 'info',
    message: 'indexed 2,184 documents in 312ms (collection=products)',
    trace_id: null,
  },
  {
    id: 'lg6',
    timestamp: '__T-6m',
    service: 'billing',
    severity: 'warn',
    message: 'stripe webhook duplicate event evt_1NHzZbAj8Vb received — idempotent skip',
    trace_id: null,
  },
  {
    id: 'lg7',
    timestamp: '__T-7m',
    service: 'edge-cdn',
    severity: 'info',
    message: 'cache MISS for /api/v2/products/p_392 status=200 ttl=300s',
    trace_id: 'trc_77a02bd9e3',
  },
  {
    id: 'lg8',
    timestamp: '__T-9m',
    service: 'checkout',
    severity: 'error',
    message: 'exception: TimeoutError on /v1/charges (3.00s) — peer=stripe.com',
    trace_id: 'trc_b8d4f1a3c1',
  },
  {
    id: 'lg9',
    timestamp: '__T-10m',
    service: 'auth-service',
    severity: 'info',
    message: 'oauth callback github code=AbC… exchanged successfully',
    trace_id: 'trc_19e2c7da8b',
  },
  {
    id: 'lg10',
    timestamp: '__T-11m',
    service: 'data-pipeline',
    severity: 'debug',
    message: 'scheduled snapshot kafka.offset=72_104_882 lag=14ms',
    trace_id: null,
  },
  {
    id: 'lg11',
    timestamp: '__T-12m',
    service: 'api-gateway',
    severity: 'info',
    message: 'GET /api/v2/orders 200 4ms ip=10.4.2.81 user_id=usr_8a01ed',
    trace_id: 'trc_661ab09cf2',
  },
  {
    id: 'lg12',
    timestamp: '__T-13m',
    service: 'search-index',
    severity: 'trace',
    message: 'shard rebalance complete (shard=02 replicas=3) duration=812ms',
    trace_id: null,
  },
  {
    id: 'lg13',
    timestamp: '__T-14m',
    service: 'billing',
    severity: 'info',
    message: 'subscription renewed sub_91Gb… amount=$29.00 customer=cus_8e2a',
    trace_id: 'trc_8a112d0ef9',
  },
  {
    id: 'lg14',
    timestamp: '__T-15m',
    service: 'edge-cdn',
    severity: 'info',
    message: 'cache HIT /static/img/logo-dark.svg status=200 age=14s',
    trace_id: null,
  },
  {
    id: 'lg15',
    timestamp: '__T-17m',
    service: 'auth-service',
    severity: 'warn',
    message: 'rate-limit threshold reached for ip=203.0.113.99 endpoint=/login',
    trace_id: null,
  },
]

function tStamp(token: string, now: number): Date {
  const m = /__T-(?:(\d+)h)?(?:(\d+)m)?$/.exec(token)
  if (!m) return new Date(now)
  const hours = Number(m[1] ?? 0)
  const minutes = Number(m[2] ?? 0)
  return new Date(now - (hours * 3600_000 + minutes * 60_000))
}

const CACHE: Map<string, string> = new Map()

/**
 * Seed demo content for a single user, idempotently. Returns immediately
 * if the user is already seeded (in-memory check first, DB count fallback
 * for cold-process restarts) — and de-duplicates concurrent calls.
 */
export async function seedDemoForUser(userId: string): Promise<void> {
  if (seededUsers.has(userId)) return

  const inFlight = seedingInFlight.get(userId)
  if (inFlight) return inFlight

  const promise = (async () => {
    const existing = await count('services', [{ field: 'user_id', operator: '=', value: userId }])
    if (existing > 0) {
      seededUsers.add(userId)
      return
    }

    const now = Date.now()

    for (const s of SERVICES) {
      const r = await create('services', {
        user_id: userId,
        name: s.name,
        description: s.description,
        owner_team: s.owner_team,
        health: s.health,
        error_rate_pct: s.error_rate_pct,
        log_rate_per_min: s.log_rate_per_min,
        recent_volume: JSON.stringify(s.recent_volume),
        created_at: new Date(now),
        updated_at: new Date(now),
      })
      const dbId = (r.data as { id?: string } | null)?.id
      if (dbId) CACHE.set(`${userId}:svc:${s.name}`, dbId)
    }

    for (const st of STREAMS) {
      const r = await create('log_sources', {
        user_id: userId,
        name: st.name,
        format: st.format,
        source: st.source,
        type: 'generic',
        environment: 'production',
        rate_per_sec: st.rate_per_sec,
        retention_days: st.retention_days,
        status: st.status,
        is_active: st.status === 'active',
        ingest_token: null,
        last_event_at: tStamp(st.last_event_at, now),
        created_at: new Date(now),
        updated_at: new Date(now),
      })
      const dbId = (r.data as { id?: string } | null)?.id
      if (dbId) CACHE.set(`${userId}:str:${st.name}`, dbId)
    }

    const traceIds = new Map<string, string>()
    for (const tr of TRACES) {
      const r = await create('traces', {
        user_id: userId,
        root_service: tr.root_service,
        operation: tr.operation,
        started_at: tStamp(tr.started_at, now),
        duration_ms: tr.duration_ms,
        span_count: tr.span_count,
        error_count: tr.error_count,
        status: tr.status,
        attributes: JSON.stringify({ fixture_id: tr.id }),
        created_at: new Date(now),
      })
      const dbId = (r.data as { id?: string } | null)?.id
      if (dbId) traceIds.set(tr.id, dbId)
    }

    const ruleIds = new Map<string, string>()
    for (const a of ALERTS) {
      const r = await create('alert_rules', {
        user_id: userId,
        name: a.name,
        condition: a.condition,
        severity: a.severity,
        channels: JSON.stringify(a.channels),
        status: a.status,
        threshold: 1,
        window_seconds: 60,
        fire_count_24h: a.fire_count_24h,
        last_fired_at: tStamp(a.last_fired_at, now),
        created_at: new Date(now),
        updated_at: new Date(now),
      })
      const dbId = (r.data as { id?: string } | null)?.id
      if (dbId) ruleIds.set(a.id, dbId)
    }

    for (const i of INCIDENTS) {
      const matchingAlertId =
        i.id === 'inc1'
          ? ruleIds.get('al-checkout-5xx')
          : i.id === 'inc2'
            ? ruleIds.get('al-search-lag')
            : i.id === 'inc3'
              ? ruleIds.get('al-auth-latency')
              : i.id === 'inc4'
                ? ruleIds.get('al-edge-cdn-poison')
                : i.id === 'inc5'
                  ? ruleIds.get('al-billing-webhook')
                  : i.id === 'inc6'
                    ? ruleIds.get('al-data-pipeline-lag')
                    : null
      await create('incidents', {
        user_id: userId,
        title: i.title,
        severity: i.severity,
        status: i.status,
        service: i.service,
        owner: i.owner,
        started_at: tStamp(i.started_at, now),
        resolved_at: i.resolved_at ? tStamp(i.resolved_at, now) : null,
        impacted_users: i.impacted_users,
        alert_rule_id: matchingAlertId ?? null,
        created_at: new Date(now),
        updated_at: new Date(now),
      })
    }

    for (const s of SAVED) {
      await create('saved_searches', {
        user_id: userId,
        name: s.name,
        query_string: s.query,
        filters: JSON.stringify({}),
        result_count: s.result_count,
        last_run_at: tStamp(s.last_run_at, now),
        shared: s.shared,
        owner: s.owner,
        created_at: new Date(now),
        updated_at: new Date(now),
      })
    }

    for (const log of LOGS) {
      await create('logs', {
        user_id: userId,
        source_id: null,
        service: log.service,
        severity: log.severity,
        level: log.severity,
        message: log.message,
        host: '',
        environment: 'production',
        trace_id: log.trace_id ?? null,
        span_id: null,
        fields: JSON.stringify({}),
        structured_data: null,
        timestamp: tStamp(log.timestamp, now),
        created_at: new Date(now),
      })
    }

    seededUsers.add(userId)
  })()

  seedingInFlight.set(userId, promise)
  try {
    await promise
  } catch (err) {
    logger.error('[log-viewer/_seed] Failed to seed demo data:', err)
    throw err
  } finally {
    seedingInFlight.delete(userId)
  }
}
