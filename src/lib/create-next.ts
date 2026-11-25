/**
 * What `mlcl create` tells the agent (or person) who will build on the project it just made.
 *
 * The closing output is the one thing every harness reads after a scaffold. A harness that ran
 * `mlcl create` from the parent directory has not loaded the new project's `AGENTS.md`, so the
 * output names it, says where endpoints and pages go, and names the check to run before handing
 * work back — the same orientation the Molecule harness's own prompt gives. Each line is derived
 * from the files the scaffold wrote, so it never names a path the project does not have.
 *
 * An installed create also runs that check itself and says what passed, so the agent does not run
 * it again before changing anything (in the r18 eval Claude ran it in every scaffold run, 3.5-5.2 s
 * plus a model turn each).
 *
 * @module
 */

import { existsSync } from 'node:fs'
import { join, relative } from 'node:path'

import type { CheckStepResult, runCheckLocal } from './check.js'
import { t } from './i18n.js'
import { installScriptsOff } from './install-scripts.js'

/** Where a project's API handlers live: the full-stack layout first, then a bare API. */
const HANDLER_DIRS = ['api/src/handlers', 'src/handlers']

/** Where a project's app pages live: the full-stack layout first, then a bare app. */
const PAGE_DIRS = ['app/src/pages', 'src/pages']

/**
 * The orientation lines for a scaffolded project, from the files on disk.
 *
 * @param projectPath - The project's root directory.
 * @param checked - Whether create's own check passed: the last line then says to run it after a change.
 * @returns The lines, relative to the project root, in reading order.
 */
export function projectOrientation(projectPath: string, checked = false): string[] {
  const has = (path: string): boolean => existsSync(join(projectPath, path))
  const lines: string[] = []
  if (has('AGENTS.md')) lines.push(t('commands.create.messages.orientationAgents'))
  const handlers = HANDLER_DIRS.find((dir) => has(`${dir}/index.ts`))
  if (handlers) lines.push(t('commands.create.messages.orientationHandlers', { dir: handlers }))
  const pages = PAGE_DIRS.find(has)
  if (pages) lines.push(t('commands.create.messages.orientationPages', { dir: pages }))
  lines.push(t('commands.create.messages.orientationDocs'))
  const off = installScriptsOff(projectPath)
  if (off.length)
    lines.push(t('commands.create.messages.orientationInstallScripts', { names: off.join(', ') }))
  lines.push(
    t(
      checked
        ? 'commands.create.messages.orientationRecheck'
        : 'commands.create.messages.orientationCheck',
    ),
  )
  return lines
}

/** What an installed create's own check came to. */
export interface CreateVerification {
  /** Every step passed (or had nothing to run). */
  ok: boolean
  /** Each step kind's outcome over every package, the worst one when packages differ. */
  verified: Partial<Record<CheckStepResult['kind'], CheckStepResult['status']>>
  /** The check's report, when a step did not pass: the errors to fix first. */
  report?: string
}

/** How bad an outcome is, so the worst one per kind is reported. */
const SEVERITY: Record<CheckStepResult['status'], number> = {
  skipped: 0,
  passed: 1,
  timeout: 2,
  error: 3,
  failed: 4,
}

/**
 * Summarise a check run for create's result.
 *
 * @param result - What {@link runCheckLocal} returned.
 * @returns Each step kind's outcome, and the report when one did not pass.
 */
export function summarizeVerification(
  result: Awaited<ReturnType<typeof runCheckLocal>>,
): CreateVerification {
  if ('error' in result) return { ok: false, verified: {}, report: result.error }
  const verified: CreateVerification['verified'] = {}
  for (const step of result.results) {
    const prior = verified[step.kind]
    if (!prior || SEVERITY[step.status] > SEVERITY[prior]) verified[step.kind] = step.status
  }
  return { ok: result.ok, verified, ...(result.ok ? {} : { report: result.report }) }
}

/**
 * The `--json` result's fields for create's check: `verified` (each step's outcome) and, when a
 * step did not pass, `checkReport`. Nothing when the check did not run.
 *
 * @param verification - The summarised check, or null.
 * @returns The fields to spread into the result.
 */
export function verificationFields(verification: CreateVerification | null): {
  verified?: CreateVerification['verified']
  checkReport?: string
} {
  if (!verification) return {}
  return {
    verified: verification.verified,
    ...(verification.report ? { checkReport: verification.report } : {}),
  }
}

/**
 * The lines create prints for its check: one when every step passed, else the report.
 *
 * @param verification - The summarised check.
 * @returns The lines to print.
 */
export function verificationLines(verification: CreateVerification): string[] {
  const steps = Object.entries(verification.verified)
    .filter(([, status]) => status !== 'skipped')
    .map(([kind]) => kind)
    .join(', ')
  if (verification.ok) return [t('commands.create.messages.verified', { steps })]
  return [t('commands.create.messages.verifyFailed'), ...(verification.report ?? '').split('\n')]
}

/**
 * The capability-map entries a custom stack's `--json` result carries: those of the packages the
 * caller named. The project's AGENTS.md carries the whole map, which the result used to repeat
 * (30 KB of a 34 KB result for a three-package stack in the r18 eval). A template result keeps
 * every entry: the template is what the caller asked for.
 *
 * @param entries - The project's whole map.
 * @param packages - The `--packages` value, comma-separated.
 * @returns The entries of the named packages, in map order.
 */
export function requestedCapabilityMap<T extends { name: string }>(
  entries: readonly T[],
  packages: string | undefined,
): T[] {
  const named = new Set((packages ?? '').split(',').map((name) => name.trim()))
  return entries.filter((entry) => named.has(entry.name))
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
