/** Read-only README comparison with optional isolated Node processes. @module */
import { type ChildProcess, fork } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { stripGeneratedTimestamp } from './docs-generator.js'
import { generateDocs } from './docs-sync.js'
import type { Registry } from './schema.js'

/** Complete checked scope and its stale README files, in registry order. */
export interface DocsCheckResult {
  checked: string[]
  different: string[]
}

/** Full registry context and the package names assigned to one isolated worker. */
export interface DocsCheckRequest {
  registry: Registry
  moleculeDir: string
  packageNames: string[]
}

/** Compare one scope in this process, retaining the generator's full registry context. */
export async function checkDocsSerial(
  registry: Registry,
  moleculeDir: string,
  packageNames?: Iterable<string>,
): Promise<DocsCheckResult> {
  const docs = await generateDocs(registry, moleculeDir, packageNames)
  return {
    checked: docs.map((doc) => doc.name),
    different: docs
      .filter(
        ({ readmePath, md }) =>
          !existsSync(readmePath) ||
          stripGeneratedTimestamp(readFileSync(readmePath, 'utf8')) !== stripGeneratedTimestamp(md),
      )
      .map((doc) => doc.name),
  }
}

/**
 * Check README files without writing them. Jobs defaults to one; two uses at
 * most two ordinary Node children, each capped at a 2 GiB heap. A one-package
 * scope stays in this process. Every extraction retains its own compiler Project.
 *
 * @param registry - Full registry, including unselected providers and locales
 * @param moleculeDir - Absolute source tree root
 * @param packageNames - Optional selection; it never narrows registry context
 * @param options - Jobs (1 or 2) and an optional cancellation signal
 * @returns Complete checked scope and stale names, both in registry order
 * @throws On cancellation, worker failure, or incomplete/invalid worker coverage;
 *   every started child is terminated and awaited before rejection
 */
export async function checkDocs(
  registry: Registry,
  moleculeDir: string,
  packageNames?: Iterable<string>,
  options: { jobs?: 1 | 2; signal?: AbortSignal } = {},
): Promise<DocsCheckResult> {
  const jobs = options.jobs ?? 1
  if (jobs !== 1 && jobs !== 2) throw new Error('README check jobs must be 1 or 2')
  options.signal?.throwIfAborted()
  const scope = packageNames ? new Set(packageNames) : undefined
  const names = Object.entries(registry.packages)
    .filter(
      ([name, entry]) =>
        (!scope || scope.has(name)) && existsSync(join(moleculeDir, entry.path, 'package.json')),
    )
    .map(([name]) => name)
  if (jobs === 1 || names.length < 2) {
    const result = await checkDocsSerial(registry, moleculeDir, names)
    options.signal?.throwIfAborted()
    return result
  }

  // Node's process isolation supplies separate compiler/ambient state. The
  // existing generator supplies selection; no custom task scheduler is needed.
  const children = new Set<ChildProcess>()
  let failure: Error | undefined
  let killTimer: ReturnType<typeof setTimeout> | undefined
  const fail = (error: Error): void => {
    failure ??= error
    for (const child of children) child.kill('SIGTERM')
    killTimer ??= setTimeout(() => {
      for (const child of children) child.kill('SIGKILL')
    }, 2000)
  }
  const abort = (): void =>
    fail(
      options.signal?.reason instanceof Error
        ? options.signal.reason
        : new Error('README check cancelled'),
    )
  options.signal?.addEventListener('abort', abort, { once: true })
  const pending: Array<Promise<DocsCheckResult | undefined>> = []
  try {
    for (let index = 0; index < 2; index++) {
      const assigned = names.filter((_, position) => position % 2 === index)
      let child: ChildProcess
      try {
        child = fork(new URL('./docs-check-worker.js', import.meta.url), [], {
          execArgv: ['--max-old-space-size=2048'],
          stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
        })
      } catch (error) {
        fail(error instanceof Error ? error : new Error(String(error)))
        break
      }
      children.add(child)
      pending.push(
        new Promise((resolve) => {
          let result: DocsCheckResult | undefined
          let stderr = ''
          child.stderr?.on('data', (chunk: Buffer) => {
            stderr = (stderr + chunk.toString()).slice(-8192)
          })
          child.on('error', fail)
          child.on('message', (message: unknown) => {
            const value = message as Partial<DocsCheckResult> | null
            if (
              result ||
              !value ||
              !Array.isArray(value.checked) ||
              !Array.isArray(value.different) ||
              value.checked.length !== assigned.length ||
              new Set(value.checked).size !== assigned.length ||
              !assigned.every((name) => value.checked?.includes(name)) ||
              !value.different.every(
                (name) => typeof name === 'string' && assigned.includes(name),
              ) ||
              new Set(value.different).size !== value.different.length
            ) {
              fail(new Error('README worker returned invalid or incomplete package coverage'))
              return
            }
            result = { checked: value.checked, different: value.different }
          })
          child.on('close', (code, signal) => {
            children.delete(child)
            if (code !== 0 || !result) {
              fail(
                new Error(
                  `README worker failed (${signal ?? code ?? 'no result'})${stderr ? `: ${stderr.trim()}` : ''}`,
                ),
              )
            }
            resolve(result)
          })
          child.send(
            { registry, moleculeDir, packageNames: assigned } satisfies DocsCheckRequest,
            (error) => {
              if (error) fail(error)
            },
          )
        }),
      )
    }
    const results = await Promise.all(pending)
    options.signal?.throwIfAborted()
    if (failure) throw failure
    const different = new Set(results.flatMap((result) => result?.different ?? []))
    return { checked: names, different: names.filter((name) => different.has(name)) }
  } finally {
    options.signal?.removeEventListener('abort', abort)
    clearTimeout(killTimer)
  }
}
