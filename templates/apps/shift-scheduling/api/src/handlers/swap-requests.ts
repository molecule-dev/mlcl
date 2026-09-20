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
  decorateSwapRequest,
  findOverlappingShifts,
  type RawShift,
  type RawSwapRequest,
} from './_decorate.js'
import { ensureSeeded } from './_seed.js'

const router = Router()

const listQuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'denied']).optional(),
  kind: z.enum(['swap', 'drop']).optional(),
  staff_id: z.string().uuid().optional(),
})

const createBodySchema = z.object({
  kind: z.enum(['swap', 'drop']),
  from_shift: z.string().uuid(),
  requester_staff_id: z.string().uuid().optional().nullable(),
  // target is who the requester wants to hand the shift to (swap only;
  // drops reopen the shift for anyone).
  target_staff_id: z
    .string()
    .uuid()
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
  note: z.string().max(2000).optional().nullable(),
})

const reviewBodySchema = z.object({
  status: z.enum(['approved', 'denied']),
  note: z.string().max(2000).optional().nullable(),
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
  const { status, kind, staff_id } = parsed.data
  const where = [{ field: 'user_id', operator: '=' as const, value: userId }]
  if (status) where.push({ field: 'status', operator: '=' as const, value: status })
  if (kind) where.push({ field: 'kind', operator: '=' as const, value: kind })
  const items = await findMany<RawSwapRequest>('swap_requests', {
    where,
    orderBy: [{ field: 'created_at', direction: 'desc' }],
  })
  const lookups = await buildLookups(userId)
  let decorated = items.map((s) => decorateSwapRequest(s, lookups))
  if (staff_id) {
    decorated = decorated.filter((d) => d.requester_id === staff_id || d.target_id === staff_id)
  }
  res.json(decorated)
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
  const item = await findById<RawSwapRequest>('swap_requests', params.data.id)
  if (!item || item.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('swaps.notFound', {}, { defaultValue: 'Swap request not found' }) })
  }
  const lookups = await buildLookups(userId)
  res.json(decorateSwapRequest(item, lookups))
})

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
  const shift = await findById<RawShift>('shifts', body.from_shift)
  if (!shift || shift.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('shifts.notFound', {}, { defaultValue: 'Shift not found' }) })
  }
  if (shift.staff_id == null) {
    return res.status(400).json({
      error: t(
        'swaps.openShift',
        {},
        { defaultValue: 'Open shifts are claimed, not swapped — nothing to give up.' },
      ),
    })
  }
  // Default requester to the shift's assignee (the common "give up my shift"
  // case) when not supplied.
  const requesterId = body.requester_staff_id ?? shift.staff_id
  if (requesterId !== shift.staff_id) {
    return res.status(400).json({
      error: t(
        'swaps.notAssigned',
        {},
        { defaultValue: 'Only the assigned staff member can request off this shift.' },
      ),
    })
  }
  if (body.kind === 'swap' && !body.target_staff_id) {
    return res.status(400).json({
      error: t(
        'swaps.targetRequired',
        {},
        { defaultValue: 'A swap needs a target staff member to hand the shift to.' },
      ),
    })
  }
  const result = await create<RawSwapRequest>('swap_requests', {
    user_id: userId,
    kind: body.kind,
    from_shift: body.from_shift,
    requester_staff_id: requesterId,
    target_staff_id: body.target_staff_id ?? null,
    status: 'pending',
    note: body.note ?? null,
    reviewed_by: null,
    reviewed_at: null,
    created_at: new Date(),
    updated_at: new Date(),
  })
  const raw = (result.data ?? result) as RawSwapRequest
  const lookups = await buildLookups(userId)
  res.status(201).json(decorateSwapRequest(raw, lookups))
})

/**
 * Approve or deny. Approval moves the assignment ATOMICALLY:
 *  - swap → the target staff member takes the shift (assigned_via: 'swap');
 *  - drop → the shift reopens (staff_id null) so others can claim it.
 * The no-double-booking rule re-runs for swaps — if the target has since
 * picked up an overlapping shift, approval 409s and the request stays
 * pending for the manager to deny or renegotiate.
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
  const existing = await findById<RawSwapRequest>('swap_requests', params.data.id)
  if (!existing || existing.user_id !== userId) {
    res
      .status(404)
      .json({ error: t('swaps.notFound', {}, { defaultValue: 'Swap request not found' }) })
    return
  }
  if (existing.status !== 'pending') {
    res.status(409).json({
      error: t('swaps.alreadyReviewed', {}, { defaultValue: 'This request was already reviewed.' }),
      status: existing.status,
    })
    return
  }
  const shift = await findById<RawShift>('shifts', existing.from_shift)
  if (!shift || shift.user_id !== userId) {
    res.status(404).json({ error: t('shifts.notFound', {}, { defaultValue: 'Shift not found' }) })
    return
  }

  if (body.data.status === 'approved') {
    if (existing.kind === 'swap' && existing.target_staff_id) {
      // Atomic assignment move: conflict-check the target FIRST; only then
      // flip the request and the shift together.
      const conflicts = await findOverlappingShifts(
        userId,
        existing.target_staff_id,
        shift,
        String(shift.id),
      )
      if (conflicts.length > 0) {
        res.status(409).json({
          error: t(
            'swaps.targetConflict',
            {},
            { defaultValue: 'The target staff member has an overlapping shift.' },
          ),
          code: 'shift_conflict',
          conflict_with: conflicts[0].id,
        })
        return
      }
      await updateById<RawShift>('shifts', String(shift.id), {
        staff_id: existing.target_staff_id,
        assigned_via: 'swap',
        updated_at: new Date(),
      })
    } else {
      // Drop (or a target-less swap, which behaves as a drop): reopen.
      await updateById<RawShift>('shifts', String(shift.id), {
        staff_id: null,
        assigned_via: 'assigned',
        updated_at: new Date(),
      })
    }
  }

  const result = await updateById<RawSwapRequest>('swap_requests', params.data.id, {
    status: body.data.status,
    reviewed_by: userId,
    reviewed_at: new Date(),
    updated_at: new Date(),
  })
  const raw = (result.data ?? result) as RawSwapRequest
  const lookups = await buildLookups(userId)
  res.json(decorateSwapRequest(raw, lookups))
}

router.patch('/:id', reviewHandler)
router.put('/:id', reviewHandler)

export default router
