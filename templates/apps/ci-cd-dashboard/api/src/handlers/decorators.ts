/**
 * Server-side row decorators.
 *
 * Frontend pages expect already-shaped fields like `commit_sha`,
 * `commit_message`, `author`, `duration_seconds`, `repository`, `stages`,
 * `artifacts`, `coverage_pct`, `last_build_status`, `recent_build_durations`,
 * etc. that are NOT direct columns on the source table — they require
 * SQL JOINs or small derivations. We compute those on the server so every
 * page gets consistent, ready-to-render data with no client-side transforms.
 *
 * @module
 */

import { query } from '@molecule/api-database'

const TERMINAL_BUILD_STATUSES = new Set(['success', 'failed', 'cancelled'])

interface RawPipelineRow {
  id: string
  user_id: string
  repository_id: string | null
  name: string
  branch: string
  status: string
  trigger_type: string
  config: unknown
  last_build_at: string | Date | null
  created_at: string | Date
  updated_at: string | Date
  // joined
  repository_name: string | null
  repository_slug: string | null
  build_id: string | null
  commit_sha: string | null
  commit_message: string | null
  author: string | null
  build_status: string | null
  duration_ms: number | null
  exit_code: number | null
  coverage_pct: number | null
  started_at: string | Date | null
  finished_at: string | Date | null
}

export interface DecoratedPipeline {
  id: string
  name: string
  repository: string
  repository_id: string | null
  repository_slug: string | null
  branch: string
  commit_sha: string
  commit_message: string
  author: string
  /** Alias kept for the PipelineDetail page which reads commit_author. */
  commit_author: string
  status: string
  trigger_type: string
  started_at: string
  duration_seconds: number | null
  coverage_pct: number | null
}

const SELECT_PIPELINES = `
  SELECT
    p.id,
    p.user_id,
    p.repository_id,
    p.name,
    p.branch,
    p.status,
    p.trigger_type,
    p.config,
    p.last_build_at,
    p.created_at,
    p.updated_at,
    r.name AS repository_name,
    r.slug AS repository_slug,
    b.id AS build_id,
    b.commit_sha,
    b.commit_message,
    b.author,
    b.status AS build_status,
    b.duration_ms,
    b.exit_code,
    b.coverage_pct,
    b.started_at,
    b.finished_at
  FROM public.pipelines p
  LEFT JOIN public.repositories r ON r.id = p.repository_id
  LEFT JOIN LATERAL (
    SELECT id, commit_sha, commit_message, author, status, duration_ms,
           exit_code, coverage_pct, started_at, finished_at
      FROM public.builds
     WHERE pipeline_id = p.id AND user_id = p.user_id
     ORDER BY started_at DESC
     LIMIT 1
  ) b ON true
`

function toIso(v: string | Date | null): string {
  if (v == null) return new Date().toISOString()
  return v instanceof Date ? v.toISOString() : new Date(v).toISOString()
}

function decoratePipeline(row: RawPipelineRow): DecoratedPipeline {
  const durationSeconds = row.duration_ms != null ? Math.round(row.duration_ms / 1000) : null
  return {
    id: row.id,
    name: row.name,
    repository: row.repository_name ?? row.repository_slug ?? '—',
    repository_id: row.repository_id,
    repository_slug: row.repository_slug,
    branch: row.branch,
    commit_sha: row.commit_sha ?? '',
    commit_message: row.commit_message ?? '',
    author: row.author ?? '',
    commit_author: row.author ?? '',
    status: row.status,
    trigger_type: row.trigger_type,
    started_at: toIso(row.started_at ?? row.last_build_at ?? row.created_at),
    duration_seconds: durationSeconds,
    coverage_pct: row.coverage_pct == null ? null : Number(row.coverage_pct),
  }
}

export async function listDecoratedPipelines(
  userId: string,
  filters: {
    project_id?: string
    repository_id?: string
    status?: string
    limit?: number
  } = {},
): Promise<DecoratedPipeline[]> {
  const where: string[] = ['p.user_id = $1']
  const args: unknown[] = [userId]
  if (filters.project_id) {
    args.push(filters.project_id)
    where.push(`p.project_id = $${args.length}`)
  }
  if (filters.repository_id) {
    args.push(filters.repository_id)
    where.push(`p.repository_id = $${args.length}`)
  }
  if (filters.status) {
    args.push(filters.status)
    where.push(`p.status = $${args.length}`)
  }
  const limit = Math.min(Math.max(filters.limit ?? 100, 1), 500)
  const sql = `${SELECT_PIPELINES} WHERE ${where.join(' AND ')}
              ORDER BY COALESCE(p.last_build_at, p.created_at) DESC
              LIMIT ${limit}`
  const result = await query<RawPipelineRow>(sql, args)
  return result.rows.map(decoratePipeline)
}

export interface PipelineDetail extends DecoratedPipeline {
  stages: Array<{
    name: string
    status: string
    duration_seconds: number | null
    log_excerpt: string[]
  }>
  artifacts: Array<{
    id: string
    name: string
    size_bytes: number
    type: string
  }>
}

export async function readDecoratedPipeline(
  userId: string,
  pipelineId: string,
): Promise<PipelineDetail | null> {
  const result = await query<RawPipelineRow>(
    `${SELECT_PIPELINES} WHERE p.user_id = $1 AND p.id = $2 LIMIT 1`,
    [userId, pipelineId],
  )
  const row = result.rows[0]
  if (!row) return null
  const base = decoratePipeline(row)

  const stepsResult = await query<{
    name: string
    status: string
    started_at: string | Date | null
    finished_at: string | Date | null
    log_text: string
  }>(
    `SELECT name, status, started_at, finished_at, log_text
       FROM public.pipeline_steps
      WHERE user_id = $1 AND pipeline_id = $2 AND build_id = $3
      ORDER BY sort_order ASC`,
    [userId, pipelineId, row.build_id ?? '00000000-0000-0000-0000-000000000000'],
  )
  const stages = stepsResult.rows.map((s) => {
    const dur =
      s.started_at && s.finished_at
        ? Math.max(
            0,
            Math.round(
              (new Date(s.finished_at).getTime() - new Date(s.started_at).getTime()) / 1000,
            ),
          )
        : null
    const logExcerpt = (s.log_text ?? '').split('\n').filter((l) => l.length > 0)
    return {
      name: s.name,
      status: s.status,
      duration_seconds: dur,
      log_excerpt: logExcerpt,
    }
  })

  const artifactsResult = await query<{
    id: string
    name: string
    size_bytes: number | string
    type: string
  }>(
    `SELECT id, name, size_bytes, type
       FROM public.artifacts
      WHERE user_id = $1 AND build_id = $2
      ORDER BY created_at DESC`,
    [userId, row.build_id ?? '00000000-0000-0000-0000-000000000000'],
  )
  const artifacts = artifactsResult.rows.map((a) => ({
    id: a.id,
    name: a.name,
    size_bytes: Number(a.size_bytes),
    type: a.type,
  }))

  return { ...base, stages, artifacts }
}

interface RawRepoRow {
  id: string
  user_id: string
  slug: string
  name: string
  description: string | null
  language: string | null
  default_branch: string
  provider: string
  is_public: boolean
  config_yml: string
  webhooks: unknown
  stats: unknown
  last_build_at: string | Date | null
  last_build_status: string | null
  created_at: string | Date
  updated_at: string | Date
  // joined
  recent_build_status: string | null
  recent_build_at: string | Date | null
  recent_build_durations: unknown
}

export interface DecoratedRepository {
  id: string
  slug: string
  name: string
  description: string
  language: string
  default_branch: string
  provider: string
  is_public: boolean
  last_build_status: 'success' | 'failed' | 'running' | 'queued'
  last_build_at: string
  recent_build_durations: number[]
  created_at: string
  updated_at: string
}

const SELECT_REPOS = `
  SELECT
    r.id,
    r.user_id,
    r.slug,
    r.name,
    r.description,
    r.language,
    r.default_branch,
    r.provider,
    r.is_public,
    r.config_yml,
    r.webhooks,
    r.stats,
    r.last_build_at,
    r.last_build_status,
    r.created_at,
    r.updated_at,
    lb.status AS recent_build_status,
    lb.started_at AS recent_build_at,
    durations.values AS recent_build_durations
  FROM public.repositories r
  LEFT JOIN LATERAL (
    SELECT b.status, b.started_at
      FROM public.builds b
      JOIN public.pipelines p ON p.id = b.pipeline_id
     WHERE p.repository_id = r.id AND b.user_id = r.user_id
     ORDER BY b.started_at DESC
     LIMIT 1
  ) lb ON true
  LEFT JOIN LATERAL (
    SELECT json_agg(d.duration_seconds ORDER BY d.started_at DESC) AS values
      FROM (
        SELECT b.started_at, COALESCE(b.duration_ms / 1000, 0) AS duration_seconds
          FROM public.builds b
          JOIN public.pipelines p ON p.id = b.pipeline_id
         WHERE p.repository_id = r.id
           AND b.user_id = r.user_id
           AND b.duration_ms IS NOT NULL
         ORDER BY b.started_at DESC
         LIMIT 12
      ) d
  ) durations ON true
`

function normalizeBuildStatus(s: string | null): DecoratedRepository['last_build_status'] {
  if (s === 'success' || s === 'failed' || s === 'running' || s === 'queued') return s
  return 'success'
}

function decorateRepo(row: RawRepoRow): DecoratedRepository {
  const recentDurations = Array.isArray(row.recent_build_durations)
    ? (row.recent_build_durations as unknown[]).map((v) => Number(v) || 0)
    : []
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? '',
    language: row.language ?? '',
    default_branch: row.default_branch,
    provider: row.provider,
    is_public: row.is_public,
    last_build_status: normalizeBuildStatus(row.recent_build_status ?? row.last_build_status),
    last_build_at: toIso(row.recent_build_at ?? row.last_build_at ?? row.updated_at),
    recent_build_durations: recentDurations.length > 0 ? recentDurations : [0],
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
  }
}

export async function listDecoratedRepositories(
  userId: string,
  filters: { project_id?: string; provider?: string; limit?: number } = {},
): Promise<DecoratedRepository[]> {
  const where: string[] = ['r.user_id = $1']
  const args: unknown[] = [userId]
  if (filters.project_id) {
    args.push(filters.project_id)
    where.push(`r.project_id = $${args.length}`)
  }
  if (filters.provider) {
    args.push(filters.provider)
    where.push(`r.provider = $${args.length}`)
  }
  const limit = Math.min(Math.max(filters.limit ?? 100, 1), 500)
  const sql = `${SELECT_REPOS} WHERE ${where.join(' AND ')}
              ORDER BY r.created_at DESC
              LIMIT ${limit}`
  const result = await query<RawRepoRow>(sql, args)
  return result.rows.map(decorateRepo)
}

export interface RepositoryDetail extends DecoratedRepository {
  config_yml: string
  webhooks: Array<{ id: string; url: string; events: string[]; active: boolean }>
  stats: { total_builds: number; success_rate_pct: number; mean_duration_seconds: number }
  branches: Array<{ name: string; last_commit: string; ahead: number; behind: number }>
  recent_pipelines: Array<{ id: string; name: string; status: string; started_at: string }>
}

function parseStats(raw: unknown): {
  total_builds: number
  success_rate_pct: number
  mean_duration_seconds: number
  branches?: Array<{ name: string; last_commit: string; ahead: number; behind: number }>
} {
  if (!raw || typeof raw !== 'object') {
    return { total_builds: 0, success_rate_pct: 0, mean_duration_seconds: 0 }
  }
  const o = raw as Record<string, unknown>
  return {
    total_builds: Number(o.total_builds ?? 0),
    success_rate_pct: Number(o.success_rate_pct ?? 0),
    mean_duration_seconds: Number(o.mean_duration_seconds ?? 0),
    branches: Array.isArray(o.branches) ? (o.branches as RepositoryDetail['branches']) : undefined,
  }
}

function parseWebhooks(raw: unknown): RepositoryDetail['webhooks'] {
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch (_error) {
      // JSON.parse failed; fall back to empty array.
      return []
    }
  }
  if (Array.isArray(raw)) return raw as RepositoryDetail['webhooks']
  return []
}

export async function readDecoratedRepository(
  userId: string,
  slugOrId: string,
): Promise<RepositoryDetail | null> {
  const result = await query<RawRepoRow>(
    `${SELECT_REPOS} WHERE r.user_id = $1 AND (r.slug = $2 OR r.id::text = $2) LIMIT 1`,
    [userId, slugOrId],
  )
  const row = result.rows[0]
  if (!row) return null
  const base = decorateRepo(row)

  const stats = parseStats(row.stats)

  const recentResult = await query<{
    id: string
    name: string
    status: string
    started_at: string | Date
  }>(
    `SELECT p.id, p.name, b.status, COALESCE(b.started_at, p.last_build_at, p.created_at) AS started_at
       FROM public.pipelines p
       LEFT JOIN LATERAL (
         SELECT status, started_at FROM public.builds
          WHERE pipeline_id = p.id AND user_id = p.user_id
          ORDER BY started_at DESC LIMIT 1
       ) b ON true
      WHERE p.user_id = $1 AND p.repository_id = $2
      ORDER BY COALESCE(b.started_at, p.last_build_at, p.created_at) DESC
      LIMIT 10`,
    [userId, row.id],
  )

  return {
    ...base,
    config_yml: row.config_yml ?? '',
    webhooks: parseWebhooks(row.webhooks),
    stats: {
      total_builds: stats.total_builds,
      success_rate_pct: stats.success_rate_pct,
      mean_duration_seconds: stats.mean_duration_seconds,
    },
    branches: stats.branches ?? [],
    recent_pipelines: recentResult.rows.map((r) => ({
      id: r.id,
      name: r.name,
      status: r.status,
      started_at: toIso(r.started_at),
    })),
  }
}

interface RawArtifactRow {
  id: string
  user_id: string
  build_id: string | null
  pipeline_id: string | null
  name: string
  filename: string
  mime_type: string
  size_bytes: number | string
  storage_key: string
  type: string | null
  retention_days: number
  created_at: string | Date
  pipeline_name: string | null
}

export interface DecoratedArtifact {
  id: string
  name: string
  pipeline_id: string | null
  pipeline_name: string
  size_bytes: number
  type: string
  retention_days: number
  created_at: string
  download_url: string
  filename: string
  mime_type: string
  storage_key: string
}

const ARTIFACT_TYPES = new Set(['docker', 'tarball', 'binary', 'sourcemap', 'sbom', 'log'])

function decorateArtifact(row: RawArtifactRow): DecoratedArtifact {
  const t = row.type && ARTIFACT_TYPES.has(row.type) ? row.type : 'binary'
  return {
    id: row.id,
    name: row.name,
    pipeline_id: row.pipeline_id,
    pipeline_name: row.pipeline_name ?? '—',
    size_bytes: Number(row.size_bytes),
    type: t,
    retention_days: row.retention_days,
    created_at: toIso(row.created_at),
    download_url: `/api/artifacts/${row.id}/download`,
    filename: row.filename,
    mime_type: row.mime_type,
    storage_key: row.storage_key,
  }
}

export async function listDecoratedArtifacts(
  userId: string,
  filters: { build_id?: string; limit?: number } = {},
): Promise<DecoratedArtifact[]> {
  const where: string[] = ['a.user_id = $1']
  const args: unknown[] = [userId]
  if (filters.build_id) {
    args.push(filters.build_id)
    where.push(`a.build_id = $${args.length}`)
  }
  const limit = Math.min(Math.max(filters.limit ?? 100, 1), 500)
  const sql = `
    SELECT a.id, a.user_id, a.build_id, a.pipeline_id, a.name, a.filename,
           a.mime_type, a.size_bytes, a.storage_key, a.type, a.retention_days,
           a.created_at, p.name AS pipeline_name
      FROM public.artifacts a
      LEFT JOIN public.pipelines p ON p.id = a.pipeline_id
     WHERE ${where.join(' AND ')}
     ORDER BY a.created_at DESC
     LIMIT ${limit}
  `
  const result = await query<RawArtifactRow>(sql, args)
  return result.rows.map(decorateArtifact)
}

export async function readDecoratedArtifact(
  userId: string,
  id: string,
): Promise<DecoratedArtifact | null> {
  const result = await query<RawArtifactRow>(
    `SELECT a.id, a.user_id, a.build_id, a.pipeline_id, a.name, a.filename,
            a.mime_type, a.size_bytes, a.storage_key, a.type, a.retention_days,
            a.created_at, p.name AS pipeline_name
       FROM public.artifacts a
       LEFT JOIN public.pipelines p ON p.id = a.pipeline_id
      WHERE a.user_id = $1 AND a.id = $2
      LIMIT 1`,
    [userId, id],
  )
  const row = result.rows[0]
  return row ? decorateArtifact(row) : null
}

interface RawEnvRow {
  id: string
  user_id: string
  name: string
  url: string
  status: string
  traffic_pct: number
  current_deploy: unknown
  recent_deploys: unknown
  created_at: string | Date
  updated_at: string | Date
}

export interface DecoratedEnvironment {
  id: string
  name: string
  url: string
  status: 'healthy' | 'degraded' | 'down'
  traffic_pct: number
  current_deploy: {
    sha: string
    branch: string
    status: string
    deployed_by: string
    deployed_at: string
  }
  recent_deploys: Array<{
    sha: string
    branch: string
    status: string
    deployed_by: string
    deployed_at: string
  }>
}

function parseDeploy(raw: unknown): DecoratedEnvironment['current_deploy'] {
  const o = (
    typeof raw === 'string'
      ? (() => {
          try {
            return JSON.parse(raw) as Record<string, unknown>
          } catch (_error) {
            // JSON.parse failed; fall back to empty object.
            return {}
          }
        })()
      : ((raw as Record<string, unknown> | undefined) ?? {})
  ) as Record<string, unknown>
  return {
    sha: String(o.sha ?? ''),
    branch: String(o.branch ?? 'main'),
    status: String(o.status ?? 'success'),
    deployed_by: String(o.deployed_by ?? ''),
    deployed_at: String(o.deployed_at ?? new Date().toISOString()),
  }
}

function parseDeploys(raw: unknown): DecoratedEnvironment['recent_deploys'] {
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed.map((d) => parseDeploy(d)) : []
    } catch (_error) {
      // JSON.parse failed; fall back to empty array.
      return []
    }
  }
  if (Array.isArray(raw)) return raw.map((d) => parseDeploy(d))
  return []
}

function decorateEnv(row: RawEnvRow): DecoratedEnvironment {
  const status =
    row.status === 'healthy' || row.status === 'degraded' || row.status === 'down'
      ? row.status
      : 'healthy'
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    status,
    traffic_pct: row.traffic_pct,
    current_deploy: parseDeploy(row.current_deploy),
    recent_deploys: parseDeploys(row.recent_deploys),
  }
}

export async function listDecoratedEnvironments(
  userId: string,
  filters: { status?: string; limit?: number } = {},
): Promise<DecoratedEnvironment[]> {
  const where: string[] = ['user_id = $1']
  const args: unknown[] = [userId]
  if (filters.status) {
    args.push(filters.status)
    where.push(`status = $${args.length}`)
  }
  const limit = Math.min(Math.max(filters.limit ?? 100, 1), 500)
  const sql = `SELECT id, user_id, name, url, status, traffic_pct,
                      current_deploy, recent_deploys, created_at, updated_at
                 FROM public.environments
                WHERE ${where.join(' AND ')}
                ORDER BY created_at ASC
                LIMIT ${limit}`
  const result = await query<RawEnvRow>(sql, args)
  return result.rows.map(decorateEnv)
}

export interface DoraInsights {
  deploy_frequency_per_day: number
  lead_time_hours: number
  change_failure_rate_pct: number
  mttr_minutes: number
  success_rate_series: Array<{ date: string; pct: number }>
  slowest_steps: Array<{ name: string; mean_seconds: number; p95_seconds: number }>
  activity_heatmap: Array<{ day: string; hours: number[] }>
}

export async function computeInsights(userId: string): Promise<DoraInsights> {
  // Deploy frequency: count of successful deploys (=builds with status=success)
  // in the last 14 days, divided by 14.
  const freqResult = await query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM public.builds
       WHERE user_id = $1 AND status = 'success'
         AND started_at >= (NOW() - INTERVAL '14 days')`,
    [userId],
  )
  const successCount14d = Number(freqResult.rows[0]?.c ?? 0)
  const deployFrequencyPerDay = Math.round((successCount14d / 14) * 10) / 10

  // Lead time: average duration_ms of successful builds in last 14 days,
  // converted to hours (proxy for lead-time-to-prod given we lack PR data).
  const leadResult = await query<{ avg_ms: string | null }>(
    `SELECT AVG(duration_ms)::text AS avg_ms
       FROM public.builds
      WHERE user_id = $1 AND status = 'success' AND duration_ms IS NOT NULL
        AND started_at >= (NOW() - INTERVAL '14 days')`,
    [userId],
  )
  const leadTimeMs = Number(leadResult.rows[0]?.avg_ms ?? 0)
  const leadTimeHours = Math.round((leadTimeMs / (3600 * 1000)) * 10) / 10

  // Change failure rate: failed / total terminal builds (last 14d).
  const cfrResult = await query<{ failed: string; total: string }>(
    `SELECT
       SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)::text AS failed,
       COUNT(*) FILTER (WHERE status IN ('success','failed','cancelled'))::text AS total
       FROM public.builds
      WHERE user_id = $1
        AND started_at >= (NOW() - INTERVAL '14 days')`,
    [userId],
  )
  const failedCount = Number(cfrResult.rows[0]?.failed ?? 0)
  const totalTerminal = Number(cfrResult.rows[0]?.total ?? 0)
  const changeFailureRatePct =
    totalTerminal === 0 ? 0 : Math.round((failedCount / totalTerminal) * 1000) / 10

  // MTTR: mean time-to-recovery — for each failed build, time until the
  // next successful build on the same pipeline. Proxy in minutes.
  const mttrResult = await query<{ avg_minutes: string | null }>(
    `WITH terminal AS (
       SELECT pipeline_id, started_at, status,
              LEAD(started_at) OVER (PARTITION BY pipeline_id ORDER BY started_at)
                AS next_started,
              LEAD(status) OVER (PARTITION BY pipeline_id ORDER BY started_at)
                AS next_status
         FROM public.builds
        WHERE user_id = $1
          AND status IN ('success','failed')
          AND started_at >= (NOW() - INTERVAL '14 days')
     )
     SELECT AVG(EXTRACT(EPOCH FROM (next_started - started_at)) / 60)::text
              AS avg_minutes
       FROM terminal
      WHERE status = 'failed' AND next_status = 'success'`,
    [userId],
  )
  const mttrMinutes = Math.round(Number(mttrResult.rows[0]?.avg_minutes ?? 0))

  // Success rate per day for last 14 days.
  const seriesResult = await query<{ day: string; success: string; total: string }>(
    `SELECT to_char(date_trunc('day', started_at), 'YYYY-MM-DD') AS day,
            SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END)::text AS success,
            COUNT(*) FILTER (WHERE status IN ('success','failed','cancelled'))::text AS total
       FROM public.builds
      WHERE user_id = $1
        AND started_at >= (NOW() - INTERVAL '14 days')
      GROUP BY 1
      ORDER BY 1 ASC`,
    [userId],
  )
  // Fill all 14 days even if no builds.
  const seriesByDay = new Map<string, { success: number; total: number }>()
  for (const r of seriesResult.rows) {
    seriesByDay.set(r.day, { success: Number(r.success), total: Number(r.total) })
  }
  const successRateSeries: Array<{ date: string; pct: number }> = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 3600 * 1000)
    const key = d.toISOString().slice(0, 10)
    const e = seriesByDay.get(key)
    const pct = !e || e.total === 0 ? 0 : (e.success / e.total) * 100
    successRateSeries.push({ date: key, pct: Math.round(pct * 10) / 10 })
  }

  // Slowest steps: top 5 by mean duration over the last 14 days.
  const slowestResult = await query<{
    name: string
    mean_seconds: string
    p95_seconds: string
  }>(
    `SELECT name,
            AVG(EXTRACT(EPOCH FROM (finished_at - started_at)))::text AS mean_seconds,
            PERCENTILE_CONT(0.95) WITHIN GROUP (
              ORDER BY EXTRACT(EPOCH FROM (finished_at - started_at))
            )::text AS p95_seconds
       FROM public.pipeline_steps
      WHERE user_id = $1
        AND started_at IS NOT NULL AND finished_at IS NOT NULL
        AND status = 'success'
      GROUP BY name
      ORDER BY AVG(EXTRACT(EPOCH FROM (finished_at - started_at))) DESC
      LIMIT 5`,
    [userId],
  )
  const slowestSteps = slowestResult.rows.map((r) => ({
    name: r.name,
    mean_seconds: Math.round(Number(r.mean_seconds)),
    p95_seconds: Math.round(Number(r.p95_seconds)),
  }))

  // Activity heatmap: count of builds per (day-of-week, hour) over last 14 days.
  const heatmapResult = await query<{ dow: string; hour: string; c: string }>(
    `SELECT to_char(date_trunc('hour', started_at), 'D') AS dow,
            to_char(date_trunc('hour', started_at), 'HH24') AS hour,
            COUNT(*)::text AS c
       FROM public.builds
      WHERE user_id = $1 AND started_at >= (NOW() - INTERVAL '14 days')
      GROUP BY 1, 2`,
    [userId],
  )
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const heatmap: Map<string, number[]> = new Map()
  for (const d of days) heatmap.set(d, new Array(24).fill(0))
  for (const r of heatmapResult.rows) {
    const dayIdx = (Number(r.dow) - 1) % 7
    const day = days[dayIdx]
    const hour = Math.max(0, Math.min(23, Number(r.hour)))
    heatmap.get(day)![hour] += Number(r.c)
  }
  const activityHeatmap = days.map((d) => ({ day: d, hours: heatmap.get(d)! }))

  return {
    deploy_frequency_per_day: deployFrequencyPerDay,
    lead_time_hours: leadTimeHours,
    change_failure_rate_pct: changeFailureRatePct,
    mttr_minutes: mttrMinutes,
    success_rate_series: successRateSeries,
    slowest_steps: slowestSteps,
    activity_heatmap: activityHeatmap,
  }
}

// Re-export for use in handlers that need to filter terminal vs not.
export { TERMINAL_BUILD_STATUSES }
