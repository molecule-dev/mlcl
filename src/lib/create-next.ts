/**
 * What `mlcl create` tells the agent (or person) who will build on the project it just made.
 *
 * The closing output is the one thing every harness reads after a scaffold. A harness that ran
 * `mlcl create` from the parent directory has not loaded the new project's `AGENTS.md`, so the
 * output names it, says where endpoints and pages go, and names the check to run before handing
 * work back — the same orientation the Molecule harness's own prompt gives. Each line is derived
 * from the files the scaffold wrote, so it never names a path the project does not have.
 *
 * @module
 */

import { existsSync } from 'node:fs'
import { join, relative } from 'node:path'

import { t } from './i18n.js'

/** Where a project's API handlers live: the full-stack layout first, then a bare API. */
const HANDLER_DIRS = ['api/src/handlers', 'src/handlers']

/** Where a project's app pages live: the full-stack layout first, then a bare app. */
const PAGE_DIRS = ['app/src/pages', 'src/pages']

/**
 * The orientation lines for a scaffolded project, from the files on disk.
 *
 * @param projectPath - The project's root directory.
 * @returns The lines, relative to the project root, in reading order.
 */
export function projectOrientation(projectPath: string): string[] {
  const has = (path: string): boolean => existsSync(join(projectPath, path))
  const lines: string[] = []
  if (has('AGENTS.md')) lines.push(t('commands.create.messages.orientationAgents'))
  const handlers = HANDLER_DIRS.find((dir) => has(`${dir}/index.ts`))
  if (handlers) lines.push(t('commands.create.messages.orientationHandlers', { dir: handlers }))
  const pages = PAGE_DIRS.find(has)
  if (pages) lines.push(t('commands.create.messages.orientationPages', { dir: pages }))
  lines.push(t('commands.create.messages.orientationDocs'))
  lines.push(t('commands.create.messages.orientationCheck'))
  return lines
}

/**
 * The `cd` that starts the next steps, or nothing when the project is the current directory
 * (`mlcl create .`).
 *
 * @param projectPath - The project's root directory.
 * @param cwd - The directory the command ran in.
 * @returns The command, or null.
 */
export function changeDirectoryStep(projectPath: string, cwd = process.cwd()): string | null {
  const path = relative(cwd, projectPath)
  if (path === '') return null
  return /^[\w./-]+$/.test(path) ? `cd ${path}` : `cd '${path.replaceAll("'", "'\\''")}'`
}
