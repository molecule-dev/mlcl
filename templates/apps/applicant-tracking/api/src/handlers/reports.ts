import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

const dateRangeSchema = z.object({
  from: z.string().date().optional(),
  to: z.string().date().optional(),
})

const STAGE_COLORS: Record<string, string> = {
  sourced: '#94a3b8',
  screening: '#0ea5e9',
  interview: '#6366f1',
  offer: '#a855f7',
  hired: '#10b981',
  rejected: '#ef4444',
}

router.get('/dashboard_stats', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    const parsed = dateRangeSchema.safeParse(req.query)
    if (!parsed.success) {
      return res.status(400).json({
        error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
        errors: parsed.error.issues,
      })
    }
    const candidates = await findMany<{ stage?: string }>('candidates', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
    })
    const jobs = await findMany<{ status?: string }>('jobs', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
    })
    const interviews = await findMany<{ scheduled_at?: string | Date }>('interviews', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
    }).catch((err) => {
      logger.error('reports.dashboard_stats_interviews_failed', err)
      return []
    })

    const funnel: Record<string, number> = {
      sourced: 0,
      screening: 0,
      interview: 0,
      offer: 0,
      hired: 0,
    }
    for (const c of candidates) {
      const stage = c.stage ?? 'sourced'
      funnel[stage] = (funnel[stage] ?? 0) + 1
    }

    const openJobs = jobs.filter((j) => j.status === 'open' || j.status === 'draft').length
    const activeCandidates = candidates.filter(
      (c) => c.stage !== 'hired' && c.stage !== 'rejected',
    ).length
    const hiresMtd = candidates.filter((c) => c.stage === 'hired').length

    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - 7)
    const interviewsThisWeek = interviews.filter((iv) => {
      if (!iv.scheduled_at) return false
      const dt = typeof iv.scheduled_at === 'string' ? new Date(iv.scheduled_at) : iv.scheduled_at
      return dt >= weekStart && dt <= now
    }).length

    res.json({
      open_jobs: openJobs,
      active_candidates: activeCandidates,
      interviews_this_week: interviewsThisWeek,
      hires_mtd: hiresMtd,
      funnel: Object.entries(funnel).map(([stage, count]) => ({
        stage,
        count,
        color: STAGE_COLORS[stage] ?? '#6366f1',
      })),
    })
  } catch (err) {
    logger.error('reports.dashboard_stats_failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

const STAGE_ORDER = ['sourced', 'screening', 'interview', 'offer', 'hired'] as const
type StageName = (typeof STAGE_ORDER)[number]

router.get('/full', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    const parsed = dateRangeSchema.safeParse(req.query)
    if (!parsed.success) {
      return res.status(400).json({
        error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
        errors: parsed.error.issues,
      })
    }

    const candidates = await findMany<{
      stage?: string
      source?: string
      job_id?: string | null
      ai_score?: number
      created_at?: string | Date
      updated_at?: string | Date
    }>('candidates', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
    })
    const jobs = await findMany<{
      id: string
      title?: string
      department?: string
      status?: string
      created_at?: string | Date
    }>('jobs', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
    })
    const interviews = await findMany<{ scheduled_at?: string | Date }>('interviews', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
    }).catch(() => [])

    const stageCounts: Record<StageName, number> = {
      sourced: 0,
      screening: 0,
      interview: 0,
      offer: 0,
      hired: 0,
    }
    for (const c of candidates) {
      const stage = (c.stage ?? 'sourced') as StageName
      if (stage in stageCounts) stageCounts[stage] += 1
    }

    const now = new Date()
    const weekAgo = new Date(now)
    weekAgo.setDate(now.getDate() - 7)
    const interviewsThisWeek = interviews.filter((iv) => {
      if (!iv.scheduled_at) return false
      const dt = typeof iv.scheduled_at === 'string' ? new Date(iv.scheduled_at) : iv.scheduled_at
      return dt >= weekAgo && dt <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    }).length
    const openJobs = jobs.filter((j) => j.status === 'open' || j.status === 'draft').length
    const activeCandidates = candidates.filter(
      (c) => c.stage !== 'hired' && c.stage !== 'rejected',
    ).length
    const hiresMtd = candidates.filter((c) => c.stage === 'hired').length

    const kpi = [
      { label: 'Active candidates', value: String(activeCandidates) },
      { label: 'Open jobs', value: String(openJobs) },
      { label: 'Interviews (7d)', value: String(interviewsThisWeek) },
      { label: 'Hires MTD', value: String(hiresMtd) },
    ]

    // Funnel conversion: cumulative count from stage onward (treating the pipeline as a forward funnel).
    const cumulativeFrom: Record<StageName, number> = {
      sourced: 0,
      screening: 0,
      interview: 0,
      offer: 0,
      hired: 0,
    }
    let runningTotal = 0
    for (let i = STAGE_ORDER.length - 1; i >= 0; i--) {
      runningTotal += stageCounts[STAGE_ORDER[i]]
      cumulativeFrom[STAGE_ORDER[i]] = runningTotal
    }
    const funnelConversion: { from: string; to: string; rate_pct: number }[] = []
    for (let i = 0; i < STAGE_ORDER.length - 1; i++) {
      const from = STAGE_ORDER[i]
      const to = STAGE_ORDER[i + 1]
      const fromCount = cumulativeFrom[from]
      const toCount = cumulativeFrom[to]
      const ratePct = fromCount > 0 ? (toCount / fromCount) * 100 : 0
      funnelConversion.push({ from, to, rate_pct: ratePct })
    }

    // Median days-in-stage proxy: time between created_at and updated_at,
    // grouped by current stage.
    const stageDays: Record<StageName, number[]> = {
      sourced: [],
      screening: [],
      interview: [],
      offer: [],
      hired: [],
    }
    for (const c of candidates) {
      const stage = (c.stage ?? 'sourced') as StageName
      if (!(stage in stageDays)) continue
      const created = c.created_at ? new Date(c.created_at as string) : null
      const updated = c.updated_at ? new Date(c.updated_at as string) : created
      if (!created || !updated) continue
      const days = Math.max(0, (updated.getTime() - created.getTime()) / (24 * 60 * 60 * 1000))
      stageDays[stage].push(days)
    }
    const median = (xs: number[]): number => {
      if (xs.length === 0) return 0
      const sorted = [...xs].sort((a, b) => a - b)
      const mid = Math.floor(sorted.length / 2)
      return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
    }
    const timeInStage = STAGE_ORDER.filter((s) => s !== 'hired').map((stage) => ({
      stage,
      days: median(stageDays[stage]),
    }))

    const sources: Record<string, number> = {}
    for (const c of candidates) {
      const src = c.source ?? 'unknown'
      sources[src] = (sources[src] ?? 0) + 1
    }
    const sourceBreakdown = Object.entries(sources).map(([source, count]) => ({
      source,
      count,
      color: '#6366f1',
    }))

    const byDepartmentMap: Record<string, number> = {}
    for (const c of candidates) {
      if (c.stage !== 'hired') continue
      const j = jobs.find((jj) => jj.id === c.job_id)
      const dept = j?.department ?? 'Unassigned'
      byDepartmentMap[dept] = (byDepartmentMap[dept] ?? 0) + 1
    }
    const byDepartment = Object.entries(byDepartmentMap).map(([department, hires]) => ({
      department,
      hires,
    }))

    // Top jobs: applicants per job_id (only jobs that exist for this user),
    // plus per-job pipeline conversion (share of candidates still active in
    // the pipeline) and average AI score for the requisitions table.
    const jobApplicantCounts: Record<string, number> = {}
    for (const c of candidates) {
      if (!c.job_id) continue
      jobApplicantCounts[c.job_id] = (jobApplicantCounts[c.job_id] ?? 0) + 1
    }
    const jobAgg = new Map<string, { inPipeline: number; scoreSum: number; scoreCount: number }>()
    for (const c of candidates) {
      if (!c.job_id) continue
      const agg = jobAgg.get(c.job_id) ?? { inPipeline: 0, scoreSum: 0, scoreCount: 0 }
      if (c.stage !== 'hired' && c.stage !== 'rejected') agg.inPipeline += 1
      if (typeof c.ai_score === 'number') {
        agg.scoreSum += c.ai_score
        agg.scoreCount += 1
      }
      jobAgg.set(c.job_id, agg)
    }
    const topJobs = jobs
      .filter((j) => j.status === 'open' || j.status === 'draft')
      .map((j) => {
        const created = j.created_at ? new Date(j.created_at as string) : null
        const daysOpen = created
          ? Math.max(0, Math.floor((now.getTime() - created.getTime()) / (24 * 60 * 60 * 1000)))
          : 0
        const agg = jobAgg.get(j.id)
        return {
          title: j.title ?? 'Untitled',
          department: (j as { department?: string }).department ?? null,
          applicants: jobApplicantCounts[j.id] ?? 0,
          in_pipeline_pct:
            agg && (jobApplicantCounts[j.id] ?? 0) > 0
              ? Math.round((agg.inPipeline / (jobApplicantCounts[j.id] ?? 1)) * 100)
              : 0,
          avg_score: agg && agg.scoreCount > 0 ? Math.round(agg.scoreSum / agg.scoreCount) : null,
          days_open: daysOpen,
        }
      })
      .sort((a, b) => b.applicants - a.applicants || b.days_open - a.days_open)
      .slice(0, 10)

    res.json({
      kpi,
      funnel_conversion: funnelConversion,
      time_in_stage: timeInStage,
      source_breakdown: sourceBreakdown,
      by_department: byDepartment,
      top_jobs: topJobs,
      fairness: [],
    })
  } catch (err) {
    logger.error('reports.full_failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
