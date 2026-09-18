/**
 * Device creation handler — `POST /api/devices`.
 *
 * The shared `@molecule/api-resource-device` package only exposes a
 * `createOrUpdate` service method (called internally during login/signup),
 * not a public REST handler. This template-level handler wraps that
 * service so authenticated clients can register additional named devices
 * — e.g. for the e2e revoke flow, or for users syncing from a fresh
 * machine via the desktop app's pairing handshake.
 *
 * The route reads the caller's authenticated session (set by
 * `userAuthorization.verifyMiddleware()` upstream in `App/router.ts`), so
 * the `userId` is taken from the JWT, not the request body. A `name`
 * field is required and identifies the device.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { findById } from '@molecule/api-database'

import { deviceService } from '../App/Resource/Device/index.js'

const router = Router()

const createSchema = z.object({
  name: z.string().min(1).max(128),
})

router.post('/', async (req: Request, res: Response) => {
  const session = res.locals.session as { userId?: string } | undefined
  if (!session?.userId) {
    res.status(401).end()
    return
  }
  const parse = createSchema.safeParse(req.body)
  if (!parse.success) {
    res.status(400).json({ error: 'name is required' })
    return
  }
  const deviceId = await deviceService.createOrUpdate(session.userId, parse.data.name)
  if (!deviceId) {
    res.status(500).json({ error: 'failed to create device' })
    return
  }
  const row = await findById<{
    id: string
    userId: string
    name: string
    createdAt: string | Date
    updatedAt: string | Date
  }>('devices', deviceId)
  res.status(201).json(row ?? { id: deviceId })
})

export default router
