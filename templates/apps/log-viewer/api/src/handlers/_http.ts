/**
 * Shared route plumbing for log-viewer handlers.
 *
 * `route()` wraps an async handler so EVERY route gets the same error
 * contract: log the failure with a consistent `<domain>.<action>` event
 * name and answer 500 (once — never after headers are sent). Without it
 * a rejected handler bypassed logging entirely, and a malformed `:id`
 * surfaced as a naked 500 from the framework error handler.
 *
 * `isUuid()` guards `:id` params BEFORE they reach the database: the id
 * columns are uuid, and Postgres rejects non-uuid input with a 500. A
 * malformed id is a client error — it must 404.
 */

import type { Request, Response } from 'express'

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: string | undefined | null): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

type RouteHandler = (req: Request, res: Response) => Promise<void> | void

export function route(name: string, handler: RouteHandler) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      await handler(req, res)
    } catch (error) {
      logger.error(name, error)
      if (!res.headersSent) {
        res.status(500).json({
          error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
        })
      }
    }
  }
}
