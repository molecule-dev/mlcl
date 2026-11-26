/** Which bash runs a check step, and what the check says when there is none. */
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, expect, it } from 'vitest'

import { spawnCheckCommand } from '../check-process.js'

const platform = Object.getOwnPropertyDescriptor(process, 'platform')!
const path = process.env.PATH

afterEach(() => {
  Object.defineProperty(process, 'platform', platform)
  process.env.PATH = path
})

function onPlatform(name: NodeJS.Platform): void {
  Object.defineProperty(process, 'platform', { ...platform, value: name })
}

async function run(command: string): Promise<{ code: number | null; error?: string; out: string }> {
  const child = spawnCheckCommand(command, process.cwd(), () => {})
  const exit = await child.exited
  await child.closed
  return { code: exit.code, error: exit.error?.message, out: child.output().stdout }
}

it('runs a step with the bash on PATH on Windows, which has no /bin/bash', async () => {
  // OLD MUSTFAIL: every step spawned /bin/bash, so on native Windows each one failed with
  // "spawn /bin/bash ENOENT" (Astra's review of the check, 2026-11-26).
  // A bash on PATH that says it ran, so the test tells it from /bin/bash.
  const dir = mkdtempSync(join(tmpdir(), 'check-shell-'))
  writeFileSync(join(dir, 'bash'), '#!/bin/sh\necho path-bash\nexec /bin/bash "$@"\n')
  chmodSync(join(dir, 'bash'), 0o755)
  onPlatform('win32')
  process.env.PATH = `${dir}:/usr/bin:/bin`
  try {
    expect(await run('echo ok')).toMatchObject({ code: 0, out: 'path-bash\nok\n' })
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

it('says what to install when Windows has no bash on PATH', async () => {
  onPlatform('win32')
  process.env.PATH = '/nonexistent'
  const result = await run('echo ok')
  expect(result.code).toBeNull()
  expect(result.error).toBe(
    'mlcl check runs each step in bash, and none is on PATH: install Git for Windows (it provides bash) or run mlcl in WSL.',
  )
})

it('keeps /bin/bash elsewhere, whatever PATH holds', async () => {
  // Counterexample: Linux and macOS run /bin/bash by path.
  onPlatform('linux')
  process.env.PATH = '/nonexistent'
  expect(await run('echo ok')).toMatchObject({ code: 0, out: 'ok\n' })
})
