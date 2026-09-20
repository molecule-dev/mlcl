import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import {
  getParamId,
  getUserId,
  uuidParamSchema as idParamSchema,
} from '@molecule/api-bonds-default-express'
import { create, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

import {
  buildLookups,
  decorateClaim,
  findOverlappingShifts,
  type RawClaim,
  type RawShift,
} from './_decorate.js'
import { ensureSeeded } from './_seed.js'

const router = Router()

const listQuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'denied']).optional(),
  shift_id: z.string().uuid().optional(),
  staff_id: z.string().uuid().optional(),
})

const createBodySchema = z.object({
  shift_id: z.string().uuid(),
  staff_id: z.string().uuid(),
})

const reviewBodySchema = z.object({
  status: z.enum(['approved', 'denied']),
})

router.get('/', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId)
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  await ensureSeeded(userId)
  const parsed = listQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
  }
  const { status, shift_id, staff_id } = parsed.data
  const where = [{ field: 'user_id', operator: '=' as const, value: userId }]
  if (status) where.push({ field: 'status', operator: '=' as const, value: status })
  if (shift_id) where.push({ field: 'shift_id', operator: '=' as const, value: shift_id })
  if (staff_id) where.push({ field: 'staff_id', operator: '=' as const, value: staff_id })
  const items = await findMany<RawClaim>('claims', {
    where,
    orderBy: [{ field: 'created_at', direction: 'desc' }],
  })
  const lookups = await buildLookups(userId)
  res.json(items.map((c) => decorateClaim(c, lookups)))
})

router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId)
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  const params = idParamSchema.safeParse({ id: getParamId(req) })
  if (!params.success) {
    return res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      errors: params.error.issues,
    })
  }
  const item = await findById<RawClaim>('claims', params.data.id)
  if (!item || item.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('claims.notFound', {}, { defaultValue: 'Claim not found' }) })
  }
  const lookups = await buildLookups(userId)
  res.json(decorateClaim(item, lookups))
})

/** Staff claim an open shift — always lands as pending for manager approval. */
router.post('/', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId)
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  await ensureSeeded(userId)
  const parsed = createBodySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
  }
  const body = parsed.data
  const shift = await findById<RawShift>('shifts', body.shift_id)
  if (!shift || shift.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('shifts.notFound', {}, { defaultValue: 'Shift not found' }) })
  }
  if (shift.staff_id != null) {
    return res.status(409).json({
      error: t('claims.alreadyAssigned', {}, { defaultValue: 'This shift is no longer open.' }),
      code: 'not_open',
    })
  }
  // A pending claim on the same shift by the same staff is idempotent.
  const existing = await findMany<RawClaim>('claims', {
    where: [
      { field: 'user_id', operator: '=' as const, value: userId },
      { field: 'shift_id', operator: '=' as const, value: body.shift_id },
      { field: 'staff_id', operator: '=' as const, value: body.staff_id },
      { field: 'status', operator: '=' as const, value: 'pending' },
    ],
  })
  if (existing[0]) {
    const lookups0 = await buildLookups(userId)
    return res.status(200).json(decorateClaim(existing[0], lookups0))
  }
  const result = await create<RawClaim>('claims', {
    user_id: userId,
    shift_id: body.shift_id,
    staff_id: body.staff_id,
    status: 'pending',
    reviewed_by: null,
    reviewed_at: null,
    created_at: new Date(),
    updated_at: new Date(),
  })
  const raw = (result.data ?? result) as RawClaim
  const lookups = await buildLookups(userId)
  res.status(201).json(decorateClaim(raw, lookups))
})

/**
 * Manager approves or denies a claim. Approval assigns the shift (through
 * the same no-double-booking choke point — a conflicting claim 409s and
 * stays pending) and denies every OTHER pending claim on the shift, since
 * there is now nothing left to claim.
 */
async function reviewHandler(req: Request, res: Response): Promise<void> {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const params = idParamSchema.safeParse({ id: getParamId(req) })
  const body = reviewBodySchema.safeParse(req.body)
  if (!params.success || !body.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      errors: [
        ...(params.success ? [] : params.error.issues),
        ...(body.success ? [] : body.error.issues),
      ],
    })
    return
  }
  const existing = await findById<RawClaim>('claims', params.data.id)
  if (!existing || existing.user_id !== userId) {
    res.status(404).json({ error: t('claims.notFound', {}, { defaultValue: 'Claim not found' }) })
    return
  }
  if (existing.status !== 'pending') {
    res.status(409).json({
      error: t('claims.alreadyReviewed', {}, { defaultValue: 'This claim was already reviewed.' }),
      status: existing.status,
    })
    return
  }
  const shift = await findById<RawShift>('shifts', existing.shift_id)
  if (!shift || shift.user_id !== userId) {
    res.status(404).json({ error: t('shifts.notFound', {}, { defaultValue: 'Shift not found' }) })
    return
  }

  if (body.data.status === 'approved') {
    if (shift.staff_id != null) {
      res.status(409).json({
        error: t('claims.alreadyAssigned', {}, { defaultValue: 'This shift is no longer open.' }),
        code: 'not_open',
      })
      return
    }
    const conflicts = await findOverlappingShifts(
      userId,
      existing.staff_id,
      shift,
      String(shift.id),
    )
    if (conflicts.length > 0) {
      res.status(409).json({
        error: t(
          'claims.conflict',
          {},
          { defaultValue: 'This staff member has an overlapping shift.' },
        ),
        code: 'shift_conflict',
        conflict_with: conflicts[0].id,
      })
      return
    }
    await updateById<RawShift>('shifts', String(shift.id), {
      staff_id: existing.staff_id,
      assigned_via: 'claim',
      updated_at: new Date(),
    })
    // Deny sibling claims on the now-taken shift.
    const siblings = await findMany<RawClaim>('claims', {
      where: [
        { field: 'user_id', operator: '=' as const, value: userId },
        { field: 'shift_id', operator: '=' as const, value: existing.shift_id },
        { field: 'status', operator: '=' as const, value: 'pending' },
      ],
    })
    for (const sibling of siblings) {
      if (String(sibling.id) === String(existing.id)) continue
      await updateById<RawClaim>('claims', String(sibling.id), {
        status: 'denied',
        reviewed_by: userId,
        reviewed_at: new Date(),
        updated_at: new Date(),
      })
    }
  }

  const result = await updateById<RawClaim>('claims', params.data.id, {
    status: body.data.status,
    reviewed_by: userId,
    reviewed_at: new Date(),
    updated_at: new Date(),
  })
  const raw = (result.data ?? result) as RawClaim
  const lookups = await buildLookups(userId)
  res.json(decorateClaim(raw, lookups))
}

router.patch('/:id', reviewHandler)
router.put('/:id', reviewHandler)

export default router
