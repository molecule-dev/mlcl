import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import type { StudentPortalLimits } from '../tiers.js'
import { ensureStudentPortalSeeded } from './_seed.js'

const router = Router()

const createGradeSchema = z.object({
  course_id: z.string().min(1).optional(),
  course_name: z.string().min(1),
  subject: z.string().optional(),
  term_id: z.string().optional(),
  score: z.number().min(0).max(110),
  letter_grade: z.string().min(1).max(3).optional(),
  weight: z.number().min(0).max(10).optional(),
})

const isLetter = (score: number): string => {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

router.get('/', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized.' }) })
  }
  await ensureStudentPortalSeeded(userId)
  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  if (req.query.term_id) {
    where.push({ field: 'term_id', operator: '=', value: String(req.query.term_id) })
  }
  if (req.query.course_id) {
    where.push({ field: 'course_id', operator: '=', value: String(req.query.course_id) })
  }
  const orderBy: OrderBy[] = [{ field: 'graded_at', direction: 'desc' }]
  const grades = await findMany('grades', { where, orderBy })
  res.json(grades)
})

router.get('/gpa', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized.' }) })
  }
  await ensureStudentPortalSeeded(userId)
  const grades = await findMany<{ score?: number; weight?: number }>('grades', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
  })
  let totalScore = 0
  let totalWeight = 0
  for (const g of grades) {
    const w = Number(g.weight ?? 1)
    const s = Number(g.score ?? 0)
    totalScore += s * w
    totalWeight += w
  }
  // Weighted percentage average -> 4.0 GPA scale (10pts per letter grade)
  const percent = totalWeight > 0 ? totalScore / totalWeight : 0
  let gpa = 0
  if (percent >= 90) gpa = 3.5 + Math.min(0.5, (percent - 90) / 20)
  else if (percent >= 80) gpa = 2.5 + (percent - 80) / 10
  else if (percent >= 70) gpa = 1.5 + (percent - 70) / 10
  else if (percent >= 60) gpa = 0.5 + (percent - 60) / 10
  res.json({
    gpa: Number(gpa.toFixed(2)),
    percent: Number(percent.toFixed(2)),
    count: grades.length,
  })
})

router.get('/report-card', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized.' }) })
  }
  await ensureStudentPortalSeeded(userId)
  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  if (req.query.term_id) {
    where.push({ field: 'term_id', operator: '=', value: String(req.query.term_id) })
  }
  const grades = await findMany<{
    course_id?: string
    course_name?: string
    subject?: string
    score?: number
    weight?: number
    letter_grade?: string
  }>('grades', { where })

  const byCourse = new Map<
    string,
    {
      course_id: string
      course_name: string
      subject?: string
      score: number
      weight: number
      letter_grade: string
    }
  >()
  for (const g of grades) {
    const key = g.course_id ?? g.course_name ?? 'unknown'
    const cur = byCourse.get(key) ?? {
      course_id: g.course_id ?? key,
      course_name: g.course_name ?? key,
      subject: g.subject,
      score: 0,
      weight: 0,
      letter_grade: 'F',
    }
    const w = Number(g.weight ?? 1)
    cur.score += Number(g.score ?? 0) * w
    cur.weight += w
    byCourse.set(key, cur)
  }
  const courses = Array.from(byCourse.values()).map((c) => {
    const avg = c.weight > 0 ? c.score / c.weight : 0
    return { ...c, score: Number(avg.toFixed(2)), letter_grade: isLetter(avg) }
  })
  res.json({ courses, generatedAt: new Date().toISOString() })
})

router.get('/report-card/pdf', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized.' }) })
  }
  await ensureStudentPortalSeeded(userId)
  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  if (req.query.term_id) {
    where.push({ field: 'term_id', operator: '=', value: String(req.query.term_id) })
  }
  const grades = await findMany('grades', { where })
  const lines = [
    `Report Card`,
    `User: ${userId}`,
    `Generated: ${new Date().toISOString()}`,
    ``,
    ...grades.map((g) => {
      const r = g as Record<string, unknown>
      return `${String(r.course_name ?? '?')} : ${String(r.score ?? 0)} (${String(r.letter_grade ?? '')})`
    }),
  ]
  const text = lines.join('\n')
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', 'attachment; filename="report-card.pdf"')
  res.send(Buffer.from(`%PDF-1.4-TEXT\n${text}\n%%EOF`))
})

router.post(
  '/',
  enforceLimit<StudentPortalLimits>({
    limitType: 'maxGrades',
    getLimit: (limits) => limits.maxGrades,
    getCurrent: async (userId) =>
      count('grades', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createGradeSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized.' }) })
    }
    const score = Number(req.body.score)
    const result = await create('grades', {
      ...req.body,
      user_id: userId,
      score,
      letter_grade: req.body.letter_grade ?? isLetter(score),
      weight: req.body.weight ?? 1,
      graded_at: new Date(),
      created_at: new Date(),
    })
    res.status(201).json(result.data)
  },
)

router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized.' }) })
  }
  const id = getParamId(req)
  const grade = await findById<Record<string, unknown>>('grades', id)
  if (!grade || grade.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('grades.notFound', undefined, { defaultValue: 'Grade not found.' }) })
  }
  res.json(grade)
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized.' }) })
  }
  const id = getParamId(req)
  const grade = await findById<Record<string, unknown>>('grades', id)
  if (!grade || grade.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('grades.notFound', undefined, { defaultValue: 'Grade not found.' }) })
  }
  await deleteById('grades', id)
  res.status(204).end()
})

export default router
