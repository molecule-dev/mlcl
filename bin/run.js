#!/usr/bin/env node

import process from 'node:process'
import { fileURLToPath, URL } from 'node:url'

import { execute } from '@oclif/core'

import { staleBuildWarning } from './stale-build.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
if (staleBuildWarning(root)) {
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
