/**
 * Tiny per-handler helpers for telemedicine. Centralised so each handler
 * file can stay focused on its CRUD shape + zod schemas.
 *
 * Note: PHI sensitivity (HIPAA-style) — every read/write goes through an
 * owner check and validates input. See `apps/telemedicine/STATUS.md` G5/G6.
 */

import type { Request, Response } from 'express'

export function getUserId(res: Response): string | null {
  return (res.locals.session as { userId?: string } | undefined)?.userId ?? null
}

export function getParamId(req: Request): string {
  const id = req.params.id
  return Array.isArray(id) ? id[0] : id
}
