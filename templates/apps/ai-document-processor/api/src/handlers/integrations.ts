/**
 * Filing-integration switches.
 *
 * The Settings page exposes Connect/Disconnect toggles for filing
 * integrations (Google Drive, Dropbox, OneDrive, Slack). We persist
 * the connection state on the user's `oauthData.integrations` map so
 * the toggle survives reload — actual OAuth dance is out of scope for
 * this flagship; this endpoint records the user's intent and returns
 * the live state, which is the invariant the page tests against.
 *
 * @module
 */
import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

interface IntegrationDef {
  id: string
  provider: string
  name: string
  icon: string
  description: string
}

const INTEGRATIONS: IntegrationDef[] = [
  {
    id: 'gdrive',
    provider: 'google-drive',
    name: 'Google Drive',
    icon: 'cloud',
    description: 'Auto-file extracted documents into Drive folders.',
  },
  {
    id: 'dbox',
    provider: 'dropbox',
    name: 'Dropbox',
    icon: 'cloud_circle',
    description: 'Mirror filed documents into a Dropbox tree.',
  },
  {
    id: 'onedrv',
    provider: 'onedrive',
    name: 'OneDrive',
    icon: 'cloud_done',
    description: 'Sync filed documents to a OneDrive workspace.',
  },
  {
    id: 'slack',
    provider: 'slack',
    name: 'Slack',
    icon: 'forum',
    description: 'Notify a channel when documents need review.',
  },
]

const readState = (user: Record<string, unknown> | undefined | null): Set<string> => {
  if (!user) return new Set()
  const oauth = user.oauthData as Record<string, unknown> | null | undefined
  const integrations = oauth?.integrations
  if (Array.isArray(integrations)) return new Set(integrations.map(String))
  return new Set()
}

const writeState = async (userId: string, connected: Set<string>): Promise<void> => {
  const user = (await findById<Record<string, unknown>>('users', userId)) ?? {}
  const oauth = ((user.oauthData as Record<string, unknown> | null) ?? {}) as Record<
    string,
    unknown
  >
  oauth.integrations = Array.from(connected.values())
  await updateById('users', userId, { oauthData: oauth })
}

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
    })
    return
  }

  try {
    const user = (await findById<Record<string, unknown>>('users', userId)) ?? {}
    const connected = readState(user)
    res.json(
      INTEGRATIONS.map((i) => ({
        ...i,
        connected: connected.has(i.provider),
      })),
    )
  } catch (error) {
    logger.error('integrations.list', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.post('/:provider/connect', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
    })
    return
  }

  try {
    const provider = String(req.params.provider ?? '')
    if (!INTEGRATIONS.some((i) => i.provider === provider)) {
      res.status(400).json({ error: 'Unknown integration provider.' })
      return
    }

    const user = (await findById<Record<string, unknown>>('users', userId)) ?? {}
    const connected = readState(user)
    connected.add(provider)
    await writeState(userId, connected)
    res.json({ provider, connected: true })
  } catch (error) {
    logger.error('integrations.connect', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.post('/:provider/disconnect', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
    })
    return
  }

  try {
    const provider = String(req.params.provider ?? '')
    if (!INTEGRATIONS.some((i) => i.provider === provider)) {
      res.status(400).json({ error: 'Unknown integration provider.' })
      return
    }

    const user = (await findById<Record<string, unknown>>('users', userId)) ?? {}
    const connected = readState(user)
    connected.delete(provider)
    await writeState(userId, connected)
    res.json({ provider, connected: false })
  } catch (error) {
    logger.error('integrations.disconnect', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

export default router
