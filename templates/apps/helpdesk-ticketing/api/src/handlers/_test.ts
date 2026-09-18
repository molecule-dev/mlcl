/**
 * Dev-only test endpoints. Mounted under `/api/_test/*` so e2e tests (and
 * only e2e tests) can perform setup the production app never exposes.
 *
 * SECURITY: this router can elevate the *calling* user to the operator
 * (`role = 'admin'`) role — an authorization-escalation primitive. It is
 * therefore DISABLED by default and only serves when
 * `ENABLE_E2E_TEST_ENDPOINTS=true` is explicitly set (fail-CLOSED). Gating on
 * NODE_ENV would be fail-OPEN — the scaffold ships `NODE_ENV=development`, so
 * the endpoint would be live out of the box. Never set the flag in production.
 * [P5TPL-1]
 *
 * Currently exposes:
 *   POST /_test/promote-admin
 *     → 200 { ok: true } after setting `role = 'admin'` on the authenticated
 *       caller's own `users` row. The helpdesk catalog writes (KB articles,
 *       macros, SLA policies) are gated behind `requireAdmin`, and ticket-queue
 *       writes (status transitions to resolved/closed/etc., delete) behind
 *       `isHelpdeskAdmin` — both read `users.role`. This lets the operator
 *       e2e flows sign up a fresh user and then become the operator, exercising
 *       the real operator surfaces WITHOUT weakening those gates for ordinary
 *       users. It only ever elevates the caller's own session — never an
 *       arbitrary account — and only when the flag is on.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, updateById } from '@molecule/api-database'

const router = Router()

router.use((_req: Request, res: Response, next) => {
  // Fail CLOSED: disabled unless explicitly opted in. [P5TPL-1]
  if (process.env.ENABLE_E2E_TEST_ENDPOINTS !== 'true') {
    res.status(404).end()
    return
  }
  next()
})

router.post('/promote-admin', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: 'Authentication required.' })
    return
  }
  const user = await findById<{ id: string }>('users', userId)
  if (!user) {
    res.status(404).json({ error: 'user not found' })
    return
  }
  await updateById('users', userId, { role: 'admin' })
  res.json({ ok: true })
})

export default router
