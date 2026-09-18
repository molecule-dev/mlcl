/**
 * {{CLEAN_NAME}} middleware for molecule.dev.
 *
 * @module
 */

import type { Request, Response, NextFunction } from 'express'

export interface {{PASCAL_NAME}}Options {
  // TODO: Define middleware options
}

export function {{CAMEL_NAME}}(options?: {{PASCAL_NAME}}Options) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    // TODO: Implement middleware
    next()
  }
}
