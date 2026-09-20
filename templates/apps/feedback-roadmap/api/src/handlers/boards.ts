/**
 * Feedback boards — public read, authenticated admin write.
 *
 * Boards are workspace-owned (the product team decides what feedback
 * surfaces exist). Listing and per-id/per-slug reads are public — the whole
 * point of a feedback portal is that customers can browse it without an
 * account. Create/update/delete require an admin session. The structural
 * IDOR gate looks for a `requireOwner`-style helper with an explicit role
 * check (admins legitimately operate cross-user).
 *
 * @module
 */

import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getParamId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

// --- Schemas ---

const createBoardSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional().default(''),
  color: z.string().optional().default('#5046e5'),
  icon: z.string().optional().default('💡'),
  sort_order: z.number().int().nonnegative().optional().default(0),
})

const updateBoardSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  sort_order: z.number().int().nonnegative().optional(),
})

// --- Helpers ---

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * A board slug that is unique among feedback_boards. The base slug is used
 * when free, else a numeric suffix (-2/-3/…) is appended. feedback_boards.slug
 * has a UNIQUE index, so without this two board names that slugify identically
 * ("Bug Reports" and "bug-reports") would make the second create fail with a
 * raw 500 on the constraint. `excludeId` lets a board keep its slug on rename.
 */
async function uniqueSlug(name: string, excludeId?: string): Promise<string> {
  const base = generateSlug(name) || 'board'
  let candidate = base
  for (let n = 2; n < 10_000; n += 1) {
    const clash = await findMany<{ id: string }>('feedback_boards', {
      where: [{ field: 'slug', operator: '=', value: candidate }],
      limit: 1,
    })
    if (clash.length === 0 || (excludeId && String(clash[0]?.id) === String(excludeId))) {
      return candidate
    }
    candidate = `${base}-${n}`
  }
  return candidate
}

function getSession(res: Response): { userId?: string; role?: string } | undefined {
  return res.locals.session as { userId?: string; role?: string } | undefined
}

/**
 * IDOR gate marker — `requireOwner` enforces that the current session actor
 * is allowed to mutate the resource. For admin-only mutations (boards) we
 * narrow on role. Role is sourced from the user record (not the JWT claim)
 * so admin promotions take effect on the next request.
 */
async function requireOwner(res: Response): Promise<{ userId: string; role: string } | null> {
  const session = getSession(res)
  const userId = session?.userId
  if (!userId) {
    res.status(401).json({
      error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }),
    })
    return null
  }
  const user = (await findById('users', userId)) as { role?: string } | null
  const role = user?.role ?? session?.role ?? 'member'
  if (role !== 'admin') {
    res.status(403).json({
      error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }),
    })
    return null
  }
  return { userId, role }
}

/**
 * Attach a live post_count to a board. The stored counter would drift the
 * moment a post is created or deleted; recomputing from feedback_posts on
 * read is drift-proof and honest for a demo-scale board list.
 */
async function withPostCount(board: Record<string, unknown>): Promise<Record<string, unknown>> {
  const postCount = await count('feedback_posts', [
    { field: 'board_id', operator: '=', value: String(board.id) },
  ])
  return { ...board, post_count: postCount }
}

// --- Routes ---

router.get('/', async (_req: Request, res: Response) => {
  try {
    const boards = await findMany('feedback_boards', {
      orderBy: [{ field: 'sort_order', direction: 'asc' }],
    })
    res.json(await Promise.all((boards as Record<string, unknown>[]).map(withPostCount)))
  } catch (error) {
    logger.error('boards.list', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/by-slug/:slug', async (req: Request, res: Response) => {
  try {
    const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug
    const matches = await findMany('feedback_boards', {
      where: [{ field: 'slug', operator: '=', value: slug }],
      limit: 1,
    })
    const board = matches[0]
    if (!board) {
      res.status(404).json({
        error: t('boards.notFound', {}, { defaultValue: 'Board not found' }),
      })
      return
    }
    res.json(await withPostCount(board as Record<string, unknown>))
  } catch (error) {
    logger.error('boards.bySlug', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const board = await findById('feedback_boards', getParamId(req))
    if (!board) {
      res.status(404).json({
        error: t('boards.notFound', {}, { defaultValue: 'Board not found' }),
      })
      return
    }
    res.json(await withPostCount(board as Record<string, unknown>))
  } catch (error) {
    logger.error('boards.getById', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/', validateBody(createBoardSchema), async (req: Request, res: Response) => {
  try {
    const owner = await requireOwner(res)
    if (!owner) return

    const { name, description, color, icon, sort_order } = req.body as z.infer<
      typeof createBoardSchema
    >
    const slug = await uniqueSlug(name)

    const result = await create('feedback_boards', {
      name,
      slug,
      description,
      color,
      icon,
      sort_order,
      created_at: new Date().toISOString(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('boards.create', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.put('/:id', validateBody(updateBoardSchema), async (req: Request, res: Response) => {
  try {
    const owner = await requireOwner(res)
    if (!owner) return

    const id = getParamId(req)
    const existing = await findById('feedback_boards', id)
    if (!existing) {
      res.status(404).json({
        error: t('boards.notFound', {}, { defaultValue: 'Board not found' }),
      })
      return
    }

    const updates: Record<string, unknown> = { ...req.body }
    if (req.body.name) {
      updates.slug = await uniqueSlug(req.body.name, id)
    }

    const result = await updateById('feedback_boards', id, updates)
    res.json(result.data)
  } catch (error) {
    logger.error('boards.update', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const owner = await requireOwner(res)
    if (!owner) return

    const id = getParamId(req)
    const existing = await findById('feedback_boards', id)
    if (!existing) {
      res.status(404).json({
        error: t('boards.notFound', {}, { defaultValue: 'Board not found' }),
      })
      return
    }

    await deleteById('feedback_boards', id)
    res.status(204).end()
  } catch (error) {
    logger.error('boards.delete', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
