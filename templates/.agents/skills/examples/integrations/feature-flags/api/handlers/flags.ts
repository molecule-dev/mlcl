/**
 * Flags endpoint — `GET /flags` returns `{ [name]: boolean }`, every flag
 * evaluated for the current user. The client's `useFlag()` hook fetches this
 * ONCE on mount and reads the map; without it, `fetch('/api/flags')` 404s and
 * every `useFlag(...)` silently returns `false`.
 *
 * Auth is OPTIONAL by design: a signed-in user gets their per-user bucketed
 * rollout flags; an anonymous visitor still gets the fully-enabled (100%) flags
 * (percentage-rollout flags evaluate to `false` without a user id). Do NOT
 * `requireAuth` here — that would hide 100%-on flags from logged-out pages.
 */
import { Router } from 'express'

import { evaluateAll } from '../lib/flags.js'

const router = Router()

router.get('/', async (_req, res) => {
  const userId = res.locals.session?.userId as string | undefined
  res.json(await evaluateAll(userId ? { id: userId } : undefined))
})

export default router
