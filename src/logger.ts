/**
 * The logger, using `loglevel`.
 * 
 * @see https://www.npmjs.com/package/loglevel
 * 
 * @module
 */

import logger from 'loglevel'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    export interface ProcessEnv {
      /**
       * The log level.
       *
       * @default warn
       */
      LOG_LEVEL?: `trace` | `debug` | `info` | `warn` | `error` | `silent`
    }
  }
}

if (process.env.LOG_LEVEL) {
  logger.setLevel(process.env.LOG_LEVEL)
}

export { logger }
