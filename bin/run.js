#!/usr/bin/env node

import process from 'node:process'
import { fileURLToPath, URL } from 'node:url'

import { execute } from '@oclif/core'

import { lastFailedBuild, staleBuildWarning } from './stale-build.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const stale = staleBuildWarning(root)
if (stale && lastFailedBuild(root)) {
  // Compiling the same source and installed tree again would fail the same way.
  process.stderr.write(
    `mlcl: ${stale}, and the last rebuild of this source failed, so this run uses the previous build. ` +
      `To see the errors: cd ${root} && npm run build\n`,
  )
} else if (stale) {
  const { spawnSync } = await import('node:child_process')
  const result = spawnSync(process.execPath, ['scripts/build.mjs', '--if-stale'], {
    cwd: root,
    stdio: ['ignore', 2, 2],
  })
  if (result.status !== 0) {
    const reason = result.error?.message ?? result.signal ?? `exit ${result.status}`
    const { existsSync } = await import('node:fs')
    const fallback = existsSync(new URL('../dist/index.js', import.meta.url))
      ? ' Using the previous build.'
      : ''
    process.stderr.write(`mlcl: rebuild failed (${reason}).${fallback}\n`)
  }
}

await execute({ dir: import.meta.url })
