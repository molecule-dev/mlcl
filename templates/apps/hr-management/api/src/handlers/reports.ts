import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { count, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

import { ON_LEAVE_STATUSES } from './_decorate.js'
import { ensureSeeded } from './_seed.js'

const router = Router()

const rangeSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
})

router.get('/headcount', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId)
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  await ensureSeeded(userId)
  const parsed = rangeSchema.safeParse(req.query)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
  }
  const total = await count('employees', [{ field: 'user_id', operator: '=', value: userId }])
  const active = await count('employees', [
    { field: 'user_id', operator: '=', value: userId },
    { field: 'status', operator: '=', value: 'active' },
  ])
  // Match both stored spellings ('on-leave' from the app write-path, 'on_leave' from the seed) so
  // app-marked on-leave employees aren't dropped from the headcount report.
  const onLeave = await count('employees', [
    { field: 'user_id', operator: '=', value: userId },
    { field: 'status', operator: 'in', value: [...ON_LEAVE_STATUSES] },
  ])
  const terminated = await count('employees', [
    { field: 'user_id', operator: '=', value: userId },
    { field: 'status', operator: '=', value: 'terminated' },
  ])
  res.json({ total, active, on_leave: onLeave, terminated })
})

router.get('/by-department', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId)
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  await ensureSeeded(userId)
  const departments = await findMany<{ id: string; name: string }>('departments', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'name', direction: 'asc' }],
  })
  const rows: Array<{ id: string | null; name: string; count: number }> = []
  for (const dept of departments) {
    const c = await count('employees', [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'department_id', operator: '=', value: dept.id },
    ])
    rows.push({ id: dept.id, name: dept.name, count: c })
  }
  const unassigned = await count('employees', [
    { field: 'user_id', operator: '=', value: userId },
    { field: 'department_id', operator: 'is_null' },
  ])
  if (unassigned > 0) rows.push({ id: null, name: 'Unassigned', count: unassigned })
  res.json(rows)
})

router.get('/pto-summary', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId)
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  await ensureSeeded(userId)
  const pending = await count('pto_requests', [
    { field: 'user_id', operator: '=', value: userId },
    { field: 'status', operator: '=', value: 'pending' },
  ])
  const approved = await count('pto_requests', [
    { field: 'user_id', operator: '=', value: userId },
    { field: 'status', operator: '=', value: 'approved' },
  ])
  const denied = await count('pto_requests', [
    { field: 'user_id', operator: '=', value: userId },
    { field: 'status', operator: '=', value: 'denied' },
  ])
  res.json({ pending, approved, denied })
})

export default router
