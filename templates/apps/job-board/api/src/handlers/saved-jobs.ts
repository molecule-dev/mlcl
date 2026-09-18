import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, findOne } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const saveJobSchema = z.object({
  job_id: z.string().uuid(),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const saved = await findMany('saved_jobs', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'saved_at', direction: 'desc' }],
    })
    res.json(saved)
  } catch (err) {
    console.error('[saved-jobs] handler failed:', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', validateBody(saveJobSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const { job_id } = req.body as z.infer<typeof saveJobSchema>

    const job = await findById('jobs', job_id)
    if (!job) {
      res.status(404).json({ error: t('jobs.notFound', {}, { defaultValue: 'Job not found' }) })
      return
    }

    const existing = await findOne<Record<string, unknown>>('saved_jobs', [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'job_id', operator: '=', value: job_id },
    ])
    if (existing) {
      res.status(200).json(existing)
      return
    }

    const result = await create('saved_jobs', {
      user_id: userId,
      job_id,
      saved_at: new Date().toISOString(),
    })
    res.status(201).json(result.data)
  } catch (err) {
    console.error('[saved-jobs] handler failed:', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const saved = await findById<Record<string, unknown>>('saved_jobs', id)
    if (!saved) {
      res
        .status(404)
        .json({ error: t('savedJobs.notFound', {}, { defaultValue: 'Saved job not found' }) })
      return
    }
    if (saved.user_id !== userId) {
      res.status(403).json({
        error: t(
          'savedJobs.notOwner',
          {},
          { defaultValue: 'You can only remove your own saved jobs' },
        ),
      })
      return
    }
    await deleteById('saved_jobs', id)
    res.status(204).end()
  } catch (err) {
    console.error('[saved-jobs] handler failed:', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
