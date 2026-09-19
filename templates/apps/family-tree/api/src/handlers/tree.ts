import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import {
  buildTreeLayout,
  type PersonRecord,
  type RelationshipRecord,
  suggestRoot,
} from './_graph.js'
import { seedDemoForUser } from './_seed.js'

const router = Router()

/**
 * GET /api/tree?root=<personId> — the generational layout for the Tree
 * screen. Without `root` the layout is rooted at the suggested root (a
 * parentless person with the widest descendant reach). The client re-fetches
 * with `root` whenever the user navigates the tree from a different card.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    await seedDemoForUser(userId)
    const people = await findMany<PersonRecord>('people', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'asc' }],
    })
    if (people.length === 0) {
      return res.json({ rootId: null, nodes: [], edges: [], stats: { people: 0, generations: 0 } })
    }

    const rels = await findMany<RelationshipRecord>('relationships', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'asc' }],
    })

    let rootId: string | null = null
    const paramRoot = typeof req.query.root === 'string' ? req.query.root : ''
    if (paramRoot) {
      const root = await findById<PersonRecord>('people', paramRoot)
      if (root && root.user_id === userId) rootId = root.id
    }
    if (!rootId) rootId = suggestRoot(people, rels)
    if (!rootId) {
      return res.json({ rootId: null, nodes: [], edges: [], stats: { people: 0, generations: 0 } })
    }

    res.json(buildTreeLayout(rootId, people, rels))
  } catch (error) {
    logger.error('tree.handler', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

export default router
