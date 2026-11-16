/** A bounded check must settle its commands before the caller cleans its workspace. */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as pause } from 'node:timers/promises'

import { expect, it, vi } from 'vitest'

import { runCheckLocal } from '../check.js'

async function waitFor(predicate: () => boolean): Promise<void> {
  const until = Date.now() + 10_000
  while (!predicate()) {
    if (Date.now() >= until) throw new Error('Fixture process did not start or settle')
    await pause(25)
  }
}

function running(pid: number): boolean {
  try {
    process.kill(pid, 0)
    // A killed grandchild can briefly await reaping by init on Linux.
    if (process.platform === 'linux')
      return !/^\d+ \(.*\) Z /.test(readFileSync(`/proc/${pid}/stat`, 'utf8'))
    return true
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ESRCH') return false
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false
    throw error
  }
}

it('stops an inventory build and its nested worker before a budget result returns', async () => {
  const root = mkdtempSync(join(tmpdir(), 'check-process-cleanup-'))
  const pids: number[] = []
  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify({ scripts: { build: 'node build.cjs' } }),
  )
  writeFileSync(
    join(root, 'build.cjs'),
    `const { spawn } = require('node:child_process')
const fs = require('node:fs')
fs.writeFileSync('build.pid', String(process.pid))
spawn(process.execPath, ['worker.cjs'], { stdio: 'ignore' })
setInterval(() => { if (fs.existsSync('release')) process.exit(0) }, 10)
`,
  )
  writeFileSync(
    join(root, 'worker.cjs'),
    `const fs = require('node:fs')
fs.writeFileSync('worker.pid', String(process.pid))
setInterval(() => {
  if (fs.existsSync('release')) { fs.writeFileSync('late-write', 'after return'); process.exit(0) }
}, 10)
`,
  )
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  const pending = runCheckLocal(root, { steps: ['build'] }, { budgetMs: 20_000 })
  try {
    await waitFor(() => existsSync(join(root, 'worker.pid')))
    for (const file of ['build.pid', 'worker.pid'])
      pids.push(Number(readFileSync(join(root, file), 'utf8')))
    await vi.advanceTimersByTimeAsync(20_000)
    const result = await pending
    if ('error' in result) throw new Error(result.error)
    expect(result.results).toMatchObject([{ kind: 'build', status: 'timeout' }])
    expect(pids.filter(running), 'commands still alive after check returned').toEqual([])
    writeFileSync(join(root, 'release'), '')
    await pause(100)
    expect(existsSync(join(root, 'late-write'))).toBe(false)
  } finally {
    vi.useRealTimers()
    writeFileSync(join(root, 'release'), '')
    await waitFor(() => pids.every((pid) => !running(pid)))
    // The defective implementation can still write its log after its child exits.
    await pause(100)
    rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
  }
})

it('does not start build-dependent e2e after the check budget has expired', async () => {
  const root = mkdtempSync(join(tmpdir(), 'check-expired-e2e-'))
  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify({
      scripts: {
        build: "node -e \"require('fs').writeFileSync('build-started', '')\"",
        e2e: "node -e \"require('fs').writeFileSync('e2e-started', '')\"",
      },
    }),
  )
  try {
    const result = await runCheckLocal(root, { steps: ['build', 'e2e'] }, { budgetMs: 0 })
    if ('error' in result) throw new Error(result.error)
    expect(result.ok).toBe(false)
    expect(result.results.every((step) => step.status === 'timeout')).toBe(true)
    await pause(500)
    expect(existsSync(join(root, 'build-started'))).toBe(false)
    expect(existsSync(join(root, 'e2e-started'))).toBe(false)
  } finally {
    await pause(500)
    rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
  }
})
