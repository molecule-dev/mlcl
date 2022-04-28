import { promisify } from 'util'
import { exec } from 'child_process'

/**
 * Promisified version of `exec`.
 */
export const asyncExec = promisify(exec)
