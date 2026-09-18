import { Router } from 'express'
import { z } from 'zod'

import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

import { requireRole } from '../middleware/require-role.js'

const postSchema = z.object({
  title: z.string().min(1).max(300),
  body: z.string().min(1).max(50_000),
})

const router = Router()

// Anyone (even unauthenticated) can read.
router.get('/', async (_req, res) => {
  const posts = await findMany('posts', {
    orderBy: [{ field: 'created_at', direction: 'desc' }],
    limit: 50,
  })
  res.json(posts)
})

// Editor or admin can create.
router.post('/', requireRole('editor'), async (req, res) => {
  const parsed = postSchema.safeParse(req.body)
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }) })
  }
  const result = await create('posts', {
    ...parsed.data,
    author_id: res.locals.session.userId,
    created_at: new Date().toISOString(),
  })
  res.status(201).json(result.data)
})

// Editor can update their own posts; admin can update any.
router.put('/:id', requireRole('editor'), async (req, res) => {
  const post = await findById('posts', req.params.id as string)
  if (!post)
    return res
      .status(404)
      .json({ error: t('posts.notFound', undefined, { defaultValue: 'Post not found' }) })
  const isAdmin = res.locals.session.role === 'admin'
  if (!isAdmin && (post as { author_id: string }).author_id !== res.locals.session.userId) {
    return res
      .status(403)
      .json({ error: t('auth.forbidden', undefined, { defaultValue: 'Forbidden' }) })
  }
  const parsed = postSchema.partial().safeParse(req.body)
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }) })
  }
  const result = await updateById('posts', req.params.id as string, parsed.data)
  res.json(result.data)
})

// Only admin can delete.
router.delete('/:id', requireRole('admin'), async (req, res) => {
  await deleteById('posts', req.params.id as string)
  res.status(204).end()
})

export default router
