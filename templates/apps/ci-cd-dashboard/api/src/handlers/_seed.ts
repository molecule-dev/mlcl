/**
 * Demo seed for ci-cd-dashboard.
 *
 * Per-user (`seedDemoForUser`) — a starter set of repositories +
 * pipelines + builds + environments + artifacts + notifications +
 * secrets + webhooks so a fresh signup lands on Pipelines / Repositories
 * / Environments / Artifacts / Notifications / Settings pages that
 * actually show something. Idempotent on user_id (returns early if any
 * repository row already exists for the user).
 *
 * Called lazily on the first GET /pipelines (and a few other read
 * endpoints) — never blocks boot, never blocks render on failure.
 *
 * @module
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { count, create } from '@molecule/api-database'
import { logger } from '@molecule/api-logger'

const here = dirname(fileURLToPath(import.meta.url))

function resolveFixture(name: string): string | null {
  const candidates = [
    resolve(here, '../../fixtures', name),
    resolve(here, '../../../fixtures', name),
    resolve(process.cwd(), 'fixtures', name),
    resolve(process.cwd(), 'api/fixtures', name),
  ]
  for (const c of candidates) {
    if (existsSync(c)) return c
  }
  return null
}

function loadFixture<T = unknown>(name: string): T[] {
  const path = resolveFixture(name)
  if (!path) {
    logger.warn(`[ci-cd-dashboard seed] fixture missing: ${name}`)
    return []
  }
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as T[]
  } catch (err) {
    logger.error(err)
    return []
  }
}

interface RepositoryFixture {
  slug: string
  name: string
  description: string
  language: string
  default_branch: string
  provider: 'github' | 'gitlab'
  is_public: boolean
  config_yml: string
  webhooks: Array<{ id: string; url: string; events: string[]; active: boolean }>
  stats: { total_builds: number; success_rate_pct: number; mean_duration_seconds: number }
  branches: Array<{ name: string; last_commit: string; ahead: number; behind: number }>
}

interface PipelineFixture {
  repo_slug: string
  name: string
  branch: string
  trigger_type: 'manual' | 'push' | 'cron'
  status: string
  minutes_ago: number
  build: {
    commit_sha: string
    commit_message: string
    author: string
    duration_ms: number | null
    exit_code: number | null
    coverage_pct: number | null
  }
  stages: Array<{
    name: string
    status: string
    duration_seconds: number | null
    log_excerpt: string[]
  }>
  artifacts: Array<{
    name: string
    filename: string
    mime_type: string
    size_bytes: number
    type: string
    retention_days: number
  }>
}

interface EnvironmentFixture {
  name: string
  url: string
  status: 'healthy' | 'degraded' | 'down'
  traffic_pct: number
  current_deploy: {
    sha: string
    branch: string
    status: 'success' | 'failed' | 'rolled_back' | 'queued' | 'running' | 'cancelled'
    deployed_by: string
    minutes_ago: number
  }
  recent_deploys: Array<{
    sha: string
    branch: string
    status: 'success' | 'failed' | 'rolled_back' | 'queued' | 'running' | 'cancelled'
    deployed_by: string
    minutes_ago: number
  }>
}

interface NotificationFixture {
  type: string
  title: string
  body: string
  href: string
  minutes_ago: number
  unread: boolean
}

interface SecretFixture {
  name: string
  scope: string
  value_preview: string
  last_used_minutes_ago: number
}

interface WebhookFixture {
  name: string
  url: string
  events: string[]
  active: boolean
  last_delivery_status: string
}

const TERMINAL_BUILD_STATUSES = new Set(['success', 'failed', 'cancelled'])

function minutesAgo(n: number): Date {
  return new Date(Date.now() - n * 60_000)
}

interface SeedResult {
  reposCreated: number
  pipelinesCreated: number
  buildsCreated: number
  stepsCreated: number
  artifactsCreated: number
  envsCreated: number
  notificationsCreated: number
  secretsCreated: number
  webhooksCreated: number
}

const EMPTY: SeedResult = {
  reposCreated: 0,
  pipelinesCreated: 0,
  buildsCreated: 0,
  stepsCreated: 0,
  artifactsCreated: 0,
  envsCreated: 0,
  notificationsCreated: 0,
  secretsCreated: 0,
  webhooksCreated: 0,
}

/**
 * Per-user in-flight seed promises. The seed runs many INSERTs in
 * sequence; if a fresh sign-up triggers two concurrent reads (e.g.
 * a page load fires GET /api/pipelines while a test makes a direct
 * GET /api/environments call) both handlers race into seedDemoForUser.
 * Without a mutex, the second caller sees count(repositories) > 0
 * (created by the first caller's first few INSERTs) and returns EMPTY
 * before the first caller has finished inserting environments /
 * notifications / etc., so the second caller queries an only-partially-
 * seeded user and gets empty result sets.
 *
 * The mutex collapses concurrent calls onto the same in-flight promise,
 * so the second caller awaits the first caller's full completion.
 */
const seedingInFlight = new Map<string, Promise<SeedResult>>()

/**
 * Seed a freshly signed-up user with a starter repo set, recent
 * pipelines + builds + steps + artifacts, environments, notifications,
 * secrets, and outgoing webhooks. Idempotent: returns EMPTY early if
 * the user already has any repository rows. Concurrent callers for the
 * same userId share a single in-flight promise so partial-seed races
 * (page loads + direct API calls within the same signup) can't see a
 * half-populated user.
 */
export async function seedDemoForUser(userId: string): Promise<SeedResult> {
  if (!userId) return EMPTY
  const inFlight = seedingInFlight.get(userId)
  if (inFlight) return inFlight

  const promise = (async (): Promise<SeedResult> => {
    return doSeedDemoForUser(userId)
  })()
  seedingInFlight.set(userId, promise)
  try {
    return await promise
  } finally {
    seedingInFlight.delete(userId)
  }
}

async function doSeedDemoForUser(userId: string): Promise<SeedResult> {
  const existing = await count('repositories', [{ field: 'user_id', operator: '=', value: userId }])
  if (existing > 0) return EMPTY

  const result: SeedResult = { ...EMPTY }

  // ---------------- Repositories
  const repoFixtures = loadFixture<RepositoryFixture>('repositories.json')
  const repoIdBySlug = new Map<string, string>()
  for (const r of repoFixtures) {
    const created = await create<{ id: string }>('repositories', {
      user_id: userId,
      slug: r.slug,
      name: r.name,
      description: r.description,
      language: r.language,
      default_branch: r.default_branch,
      provider: r.provider,
      is_public: r.is_public,
      config_yml: r.config_yml,
      webhooks: JSON.stringify(r.webhooks ?? []),
      stats: JSON.stringify({ ...r.stats, branches: r.branches }),
      created_at: new Date(),
      updated_at: new Date(),
    })
    const repoId = (created.data?.id ?? (created as unknown as { id?: string }).id) as
      string | undefined
    if (repoId) repoIdBySlug.set(r.slug, repoId)
    result.reposCreated++
  }

  // ---------------- Pipelines + builds + steps + artifacts
  const pipelineFixtures = loadFixture<PipelineFixture>('pipelines.json')
  for (const p of pipelineFixtures) {
    const repoId = repoIdBySlug.get(p.repo_slug) ?? null
    const startedAt = minutesAgo(p.minutes_ago)
    const finishedAt =
      p.build.duration_ms != null ? new Date(startedAt.getTime() + p.build.duration_ms) : null

    const pipelineCreated = await create<{ id: string }>('pipelines', {
      user_id: userId,
      project_id: null,
      repository_id: repoId,
      name: p.name,
      branch: p.branch,
      trigger_type: p.trigger_type,
      config: JSON.stringify({}),
      status: p.status,
      last_build_at: startedAt,
      created_at: startedAt,
      updated_at: startedAt,
    })
    const pipelineId = (pipelineCreated.data?.id ??
      (pipelineCreated as unknown as { id?: string }).id) as string | undefined
    if (!pipelineId) continue
    result.pipelinesCreated++

    const buildCreated = await create<{ id: string }>('builds', {
      user_id: userId,
      pipeline_id: pipelineId,
      status: p.status === 'queued' ? 'queued' : p.status === 'running' ? 'running' : p.status,
      branch: p.branch,
      commit_sha: p.build.commit_sha,
      commit_message: p.build.commit_message,
      author: p.build.author,
      triggered_by: p.trigger_type,
      duration_ms: p.build.duration_ms,
      exit_code: p.build.exit_code,
      coverage_pct: p.build.coverage_pct,
      started_at: startedAt,
      finished_at: TERMINAL_BUILD_STATUSES.has(p.status) ? finishedAt : null,
      created_at: startedAt,
      updated_at: startedAt,
    })
    const buildId = (buildCreated.data?.id ?? (buildCreated as unknown as { id?: string }).id) as
      string | undefined
    if (!buildId) continue
    result.buildsCreated++

    let order = 0
    let stepCursor = startedAt.getTime()
    for (const stage of p.stages) {
      const stepStart = stage.duration_seconds != null ? new Date(stepCursor) : null
      const stepEnd =
        stage.duration_seconds != null ? new Date(stepCursor + stage.duration_seconds * 1000) : null
      if (stage.duration_seconds != null) stepCursor += stage.duration_seconds * 1000
      await create('pipeline_steps', {
        user_id: userId,
        pipeline_id: pipelineId,
        build_id: buildId,
        name: stage.name,
        sort_order: order++,
        status: stage.status,
        log_text: stage.log_excerpt.join('\n'),
        exit_code: stage.status === 'failed' ? 1 : stage.status === 'success' ? 0 : null,
        started_at: stepStart,
        finished_at: stepEnd,
        created_at: stepStart ?? startedAt,
      })
      result.stepsCreated++
    }

    for (const a of p.artifacts) {
      await create('artifacts', {
        user_id: userId,
        build_id: buildId,
        pipeline_id: pipelineId,
        name: a.name,
        filename: a.filename,
        mime_type: a.mime_type,
        size_bytes: a.size_bytes,
        type: a.type,
        storage_key: `seed/${pipelineId}/${a.filename}`,
        retention_days: a.retention_days,
        created_at: startedAt,
      })
      result.artifactsCreated++
    }
  }

  // ---------------- Environments
  const envFixtures = loadFixture<EnvironmentFixture>('environments.json')
  for (const e of envFixtures) {
    const currentDeploy = {
      sha: e.current_deploy.sha,
      branch: e.current_deploy.branch,
      status: e.current_deploy.status,
      deployed_by: e.current_deploy.deployed_by,
      build_id: null as string | null,
      deployed_at: minutesAgo(e.current_deploy.minutes_ago).toISOString(),
    }
    const recentDeploys = e.recent_deploys.map((d) => ({
      sha: d.sha,
      branch: d.branch,
      status: d.status,
      deployed_by: d.deployed_by,
      build_id: null,
      deployed_at: minutesAgo(d.minutes_ago).toISOString(),
    }))
    await create('environments', {
      user_id: userId,
      name: e.name,
      url: e.url,
      status: e.status,
      traffic_pct: e.traffic_pct,
      current_deploy: currentDeploy,
      recent_deploys: JSON.stringify(recentDeploys),
      created_at: minutesAgo(e.current_deploy.minutes_ago),
      updated_at: minutesAgo(e.current_deploy.minutes_ago),
    })
    result.envsCreated++
  }

  // ---------------- Notifications
  const notifFixtures = loadFixture<NotificationFixture>('notifications.json')
  for (const n of notifFixtures) {
    await create('notifications', {
      user_id: userId,
      type: n.type,
      title: n.title,
      body: n.body,
      href: n.href,
      unread: n.unread,
      created_at: minutesAgo(n.minutes_ago),
    })
    result.notificationsCreated++
  }

  // ---------------- Secrets
  const secretFixtures = loadFixture<SecretFixture>('secrets.json')
  for (const s of secretFixtures) {
    await create('repository_secrets', {
      user_id: userId,
      repository_id: null,
      name: s.name,
      scope: s.scope,
      value_preview: s.value_preview,
      last_used_at: minutesAgo(s.last_used_minutes_ago),
      created_at: new Date(),
      updated_at: new Date(),
    })
    result.secretsCreated++
  }

  // ---------------- Outgoing webhooks
  const webhookFixtures = loadFixture<WebhookFixture>('webhooks.json')
  for (const w of webhookFixtures) {
    await create('outgoing_webhooks', {
      user_id: userId,
      repository_id: null,
      name: w.name,
      url: w.url,
      events: JSON.stringify(w.events),
      active: w.active,
      last_delivery_at: minutesAgo(60),
      last_delivery_status: w.last_delivery_status,
      created_at: new Date(),
      updated_at: new Date(),
    })
    result.webhooksCreated++
  }

  return result
}
