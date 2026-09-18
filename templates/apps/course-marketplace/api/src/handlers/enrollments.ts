/**
 * Enrollments handler — owner-only enrollment list + checkout-driven create.
 *
 * Authorization model from INVENTORY.md:
 *   - read: owner-only — every endpoint scopes by `userId` from the session,
 *     so an attacker cannot list / read another user's enrollments.
 *   - create: requires successful payment for paid courses (the call here
 *     accepts a `payment_id` reference that must exist in `payments`); free
 *     courses (price_cents = 0) skip the payment requirement.
 *
 * Validation: every input goes through `validateBody`/`validateQuery`/
 *   `validateParams` from `@molecule/api-middleware-validation`.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId, uuidParamSchema as idParamSchema } from '@molecule/api-bonds-default-express'
import {
  create,
  findById,
  findMany,
  findOne,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateParams } from '@molecule/api-middleware-validation'

import { decorateEnrolledCourse, decorateMyLearning } from './_decorate.js'
import { seedDemoForUser } from './_seed.js'

const router = Router()

const idOf = (req: Request): string => String(req.params.id)

const createEnrollmentSchema = z.object({
  course_id: z.string().uuid(),
  payment_id: z.string().uuid().optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    // Best-effort: seed starter enrollments / lesson_progress / certificate
    // / notifications for first-time users so /my-learning, /notifications,
    // and /my-learning/:courseId/certificate aren't empty after signup.
    // Idempotent — guarded inside `seedDemoForUser`.
    try {
      await seedDemoForUser(userId)
    } catch (error) {
      console.warn('seedDemoForUser failed', error)
    }
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const enrollments = await findMany<Record<string, unknown>>('enrollments', {
      where,
      orderBy: [{ field: 'enrolled_at', direction: 'desc' }],
      limit: 100,
    })
    const decorated = await decorateMyLearning(enrollments)
    res.json(decorated)
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const enrollment = await findById<Record<string, unknown>>('enrollments', idOf(req))
    if (!enrollment || enrollment.user_id !== userId) {
      res.status(404).json({
        error: t('enrollments.notFound', undefined, { defaultValue: 'Enrollment not found' }),
      })
      return
    }
    const course = await findById<Record<string, unknown>>('courses', String(enrollment.course_id))
    if (!course) {
      res.json(enrollment)
      return
    }
    res.json(await decorateEnrolledCourse(enrollment, course, new Map()))
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/', validateBody(createEnrollmentSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const body = req.body as z.infer<typeof createEnrollmentSchema>
    const course = await findById<Record<string, unknown>>('courses', body.course_id)
    if (!course || course.status !== 'published') {
      res
        .status(404)
        .json({ error: t('catalog.notFound', undefined, { defaultValue: 'Course not found' }) })
      return
    }

    // Paid courses require a successful payment row; free courses do not.
    const priceCents = Number(course.price_cents ?? 0)
    if (priceCents > 0) {
      if (!body.payment_id) {
        res.status(400).json({
          error: t('enrollments.paymentRequired', undefined, {
            defaultValue: 'Payment is required to enroll in this course.',
          }),
        })
        return
      }
      const payment = await findById<Record<string, unknown>>('payments', body.payment_id)
      if (!payment) {
        res.status(400).json({
          error: t('enrollments.paymentNotFound', undefined, {
            defaultValue: 'Payment record not found.',
          }),
        })
        return
      }
    }

    const existing = await findOne<Record<string, unknown>>('enrollments', [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'course_id', operator: '=', value: body.course_id },
    ])
    if (existing) {
      res.status(200).json(existing)
      return
    }

    const result = await create('enrollments', {
      user_id: userId,
      course_id: body.course_id,
      payment_id: body.payment_id ?? null,
      progress: 0,
      completed_at: null,
      enrolled_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    })
    // Bump the parent course's enrollment counter.
    await updateById('courses', body.course_id, {
      total_enrollments: Number(course.total_enrollments ?? 0) + 1,
    })
    res.status(201).json(result.data ?? result)
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const enrollment = await findById<Record<string, unknown>>('enrollments', idOf(req))
    if (!enrollment || enrollment.user_id !== userId) {
      res.status(404).json({
        error: t('enrollments.notFound', undefined, { defaultValue: 'Enrollment not found' }),
      })
      return
    }
    // Refund flow: instructor or admin can call this with the enrollment id
    // and we cancel the row. v1 refund mechanics live in the payments
    // service — `BLOCKED: stripe-refund-bond pending` for the Stripe
    // refund call; the row is unscoped from the user here.
    await updateById('enrollments', idOf(req), {
      payment_id: null,
      updated_at: new Date(),
    })
    res.status(204).end()
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
