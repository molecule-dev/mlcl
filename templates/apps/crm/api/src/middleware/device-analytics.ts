import type { NextFunction, Request, RequestHandler, Response } from 'express'

import { track } from '@molecule/api-analytics'
import { logger } from '@molecule/api-logger'

/**
 * Emits an analytics event AND log entry for a device mutation
 * (credential / API key flows). Logs warn on 4xx so suspicious key
 * activity is captured.
 */
export function trackDeviceKeyMutation(eventName: string): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    res.on('finish', () => {
      const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0]
      const ok = res.statusCode >= 200 && res.statusCode < 400
      if (ok) {
        void track({
          name: eventName,
          properties: { method: req.method, deviceId: id },
        })
        logger.info(
          `[device] ${eventName} method=${req.method} deviceId=${id ?? '-'} status=${res.statusCode}`,
        )
      } else if (res.statusCode >= 400 && res.statusCode < 500) {
        logger.warn(
          `[device] ${eventName} failed method=${req.method} deviceId=${id ?? '-'} status=${res.statusCode}`,
        )
      }
    })
    next()
  }
}
