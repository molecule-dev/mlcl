import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

/**
 * Server-side channel for the Settings page's per-user app preferences.
 *
 * WHY THIS EXISTS: the platform user resource strips `oauthData` on every
 * READ (`stripSensitiveUserColumns`), so a Settings form that persists its
 * slice into `users.oauthData` via `PATCH /api/users/:id` could never read
 * its own values back — the form silently reset to defaults on every load
 * even though the values were persisted and the /qa/ask retrieval used them.
 * This handler reads/merges the slice SERVER-side, where the column is
 * visible, and returns only the non-sensitive app preferences.
 */

interface UserWithOauthData {
  oauthData?: Record<string, unknown> | null
}

const DEFAULT_EMBEDDING_SIZE = 'large'

const ragSettingsSchema = z.object({
  retrievalK: z.number().int().min(1).max(32),
  chunkSize: z.number().int().min(50).max(2048),
  chunkOverlap: z.number().int().min(0).max(512),
  embeddingSize: z.enum(['large', 'small']),
})

const patchSchema = z.object({
  rag: ragSettingsSchema,
})

/** The `rag` slice as stored — every field optional so partial rows resolve. */
interface StoredRagSettings {
  retrievalK?: number
  chunkSize?: number
  chunkOverlap?: number
  embeddingSize?: 'large' | 'small'
}

function readStoredRag(user: UserWithOauthData | null | undefined): StoredRagSettings {
  const oauth = user?.oauthData
  if (!oauth || typeof oauth !== 'object') return {}
  const rag = (oauth as { rag?: unknown }).rag
  if (!rag || typeof rag !== 'object') return {}
  return rag as StoredRagSettings
}

async function loadUser(userId: string): Promise<UserWithOauthData | null> {
  return findById<UserWithOauthData>('users', userId)
}

function unauthorized(res: Response): Response {
  return res.status(401).json({
    error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
  })
}

const router = Router()

/** GET /api/settings — the user's retrieval defaults, resolved server-side. */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const user = await loadUser(userId)
    const rag = readStoredRag(user)
    res.json({
      rag: {
        retrievalK: rag.retrievalK ?? 5,
        chunkSize: rag.chunkSize ?? 350,
        chunkOverlap: rag.chunkOverlap ?? 0,
        embeddingSize: rag.embeddingSize ?? DEFAULT_EMBEDDING_SIZE,
      },
    })
  } catch (error) {
    logger.error('settings.get', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

/**
 * PATCH /api/settings — merge the `rag` slice into `users.oauthData`
 * (read-modify-write so any OTHER oauthData keys are preserved) and return
 * the persisted values so the form's read-after-write check holds.
 */
router.patch('/', validateBody(patchSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const body = req.body as z.infer<typeof patchSchema>
    const user = await loadUser(userId)
    const oauth: Record<string, unknown> =
      user?.oauthData && typeof user.oauthData === 'object' ? { ...user.oauthData } : {}
    oauth.rag = { ...readStoredRag(user), ...body.rag }
    await updateById('users', userId, { oauthData: oauth })
    const rag = oauth.rag as StoredRagSettings
    res.json({
      rag: {
        retrievalK: rag.retrievalK ?? 5,
        chunkSize: rag.chunkSize ?? 350,
        chunkOverlap: rag.chunkOverlap ?? 0,
        embeddingSize: rag.embeddingSize ?? DEFAULT_EMBEDDING_SIZE,
      },
    })
  } catch (error) {
    logger.error('settings.patch', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

export default router
