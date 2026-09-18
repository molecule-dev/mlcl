/**
 * Per-user dashboard stats for the LMS.
 *
 * Returns realistic, queryable values derived from `lesson_completions`,
 * `enrollments`, and `grades` for the signed-in user. The dashboard KPI
 * cards (Active Courses, Completed Lessons, Average Score) consume this
 * single endpoint instead of each card making its own request — keeps
 * the dashboard snappy and ensures the numbers come from a single
 * consistent point in time.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'

import { query } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import { requireUserId } from './_lmsAccess.js'

const router = Router()

interface MeStats {
  completedLessons: number
  completedLessonsThisWeek: number
  totalLessons: number
  activeCourses: number
  averageScore: number | null
  graded: number
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = requireUserId(res)
    if (!userId) return

    const result = await query<{
      completed_lessons: string | number
      completed_lessons_this_week: string | number
      total_lessons: string | number
      active_courses: string | number
      average_score: string | number | null
      graded: string | number
    }>(
      `
      SELECT
        (
          SELECT COUNT(*)::int
          FROM lesson_completions
          WHERE user_id = $1::uuid
        ) AS completed_lessons,
        (
          SELECT COUNT(*)::int
          FROM lesson_completions
          WHERE user_id = $1::uuid
            AND completed_at >= now() - interval '7 days'
        ) AS completed_lessons_this_week,
        (
          SELECT COALESCE(SUM(item_count)::int, 0)
          FROM (
            SELECT (
              SELECT COUNT(*)::int
              FROM module_items mi
              JOIN course_modules cm2 ON cm2.id = mi.module_id
              WHERE cm2.course_id = e.course_id
            ) AS item_count
            FROM enrollments e
            WHERE e.student_id = $1::uuid
          ) lesson_counts
        ) AS total_lessons,
        (
          SELECT COUNT(*)::int
          FROM enrollments
          WHERE student_id = $1::uuid
            AND status = 'active'
        ) AS active_courses,
        (
          SELECT AVG(
            CASE
              WHEN max_score IS NULL OR max_score <= 0 THEN NULL
              ELSE (score::numeric / max_score::numeric) * 100.0
            END
          )::float
          FROM grades
          WHERE student_id = $1::uuid
        ) AS average_score,
        (
          SELECT COUNT(*)::int
          FROM grades
          WHERE student_id = $1::uuid
            AND score IS NOT NULL
        ) AS graded
      `,
      [userId],
    )

    const row = result.rows[0]
    const num = (v: unknown): number => {
      if (typeof v === 'number') return Number.isFinite(v) ? v : 0
      if (typeof v === 'string') return Number.parseInt(v, 10) || 0
      return 0
    }
    const avg = (v: unknown): number | null => {
      if (v === null || v === undefined) return null
      const n = typeof v === 'number' ? v : Number(v)
      return Number.isFinite(n) ? Math.round(n) : null
    }

    const stats: MeStats = {
      completedLessons: num(row?.completed_lessons),
      completedLessonsThisWeek: num(row?.completed_lessons_this_week),
      totalLessons: num(row?.total_lessons),
      activeCourses: num(row?.active_courses),
      averageScore: avg(row?.average_score),
      graded: num(row?.graded),
    }
    res.json(stats)
  } catch (error) {
    logger.error(error)
    res.status(500).json({
      error: t('stats.fetchError', {}, { defaultValue: 'Failed to fetch dashboard stats' }),
    })
  }
})

export default router
