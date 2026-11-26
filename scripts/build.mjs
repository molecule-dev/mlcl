#!/usr/bin/env node
/**
 * Compile in a staging directory and replace `dist/` only after a successful compile.
 * Both CLI-triggered and manual builds use the same checkout lock. A CLI-triggered
 * build rechecks freshness after taking the lock, since whoever held it may have
 * already compiled the changes.
 */
import { spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  renameSync,
  rmdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { createRequire } from 'node:module'
import { basename, join } from 'node:path'
import { performance } from 'node:perf_hooks'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'

import {
  BUILD_STAMP,
  buildInputs,
  FAILED_BUILD,
  lastFailedBuild,
  staleBuildWarning,
} from '../bin/stale-build.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const dist = join(root, 'dist')
const backup = join(root, 'dist.old-build')
const lock = join(root, 'dist.build-lock')
const lockTimeoutMs = 10 * 60_000

function releaseLock(owner) {
  if (owner) {
    try {
      rmdirSync(join(lock, owner))
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
  }
  try {
    rmdirSync(lock)
  } catch (error) {
    if (!['ENOENT', 'ENOTEMPTY', 'EEXIST'].includes(error.code)) throw error
  }
}

function lockOwner() {
  try {
    return readdirSync(lock)[0]
  } catch (error) {
    if (error.code === 'ENOENT') return undefined
    throw error
  }
}

function isRunning(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    if (error.code === 'EPERM') return true
    if (error.code === 'ESRCH') return false
    throw error
  }
}

async function acquireLock() {
  const pending = mkdtempSync(`${lock}-`)
  const owner = `${process.pid}-${basename(pending)}`
  const deadline = performance.now() + lockTimeoutMs
  let reportedWait = false
  try {
    // Publish the lock with its owner already present. Reaping removes only that
    // owner's marker and then attempts rmdir, so two reapers cannot remove a
    // replacement lock, which already has its own marker when it appears.
    mkdirSync(join(pending, owner))
    for (;;) {
      try {
        renameSync(pending, lock)
        return owner
      } catch (error) {
        const current = lstatSync(lock, { throwIfNoEntry: false })
        if (current && !current.isDirectory()) throw error
        // Windows may report access denied when the target directory already exists.
        if (
          !['EEXIST', 'ENOTEMPTY'].includes(error.code) &&
          !(current && ['EACCES', 'EPERM'].includes(error.code))
        )
          throw error
      }
      const holder = lockOwner()
      const pid = Number(holder?.split('-', 1)[0])
      if (holder && (!Number.isSafeInteger(pid) || pid <= 0))
        throw new Error(`invalid owner in build lock ${lock}`)
      if (!holder || !isRunning(pid)) {
        releaseLock(holder)
        continue
      }
      if (performance.now() >= deadline)
        throw new Error(`timed out waiting for mlcl build (pid ${pid})`)
      if (!reportedWait) {
        process.stderr.write(`mlcl: waiting for build (pid ${pid})\n`)
        reportedWait = true
      }
      await delay(100)
    }
  } finally {
    rmSync(pending, { recursive: true, force: true })
  }
}

function build() {
  const tsc = createRequire(import.meta.url).resolve('typescript/bin/tsc')
  // Compile at the same depth as dist/ to keep relative source map paths valid.
  const next = join(root, `dist.build-${randomUUID()}`)
  try {
    // A source file saved during compilation can still make this new build stale.
    const startedAt = Date.now()
    const inputs = buildInputs(root)
    const result = spawnSync(
      process.execPath,
      [tsc, '-p', join(root, 'tsconfig.json'), '--outDir', next],
      {
        cwd: root,
        stdio: 'inherit',
      },
    )
    if (result.error) throw result.error
    if (result.signal) throw new Error(`TypeScript was terminated by ${result.signal}`)
    if (result.status !== 0) {
      // The CLI then runs the dist/ it kept and does not compile these same inputs again.
      if (existsSync(dist))
        writeFileSync(
          join(dist, FAILED_BUILD),
          `${JSON.stringify({ inputs, status: result.status })}\n`,
        )
      return result.status ?? 1
    }

    writeFileSync(join(next, BUILD_STAMP), `${startedAt}\n`)
    const hadDist = existsSync(dist)
    if (hadDist) {
      rmSync(backup, { recursive: true, force: true })
      renameSync(dist, backup)
    }
    try {
      renameSync(next, dist)
    } catch (error) {
      if (hadDist) renameSync(backup, dist)
      throw error
    }
    rmSync(backup, { recursive: true, force: true })
    return 0
  } finally {
    rmSync(next, { recursive: true, force: true })
  }
}

try {
  const owner = await acquireLock()
  try {
    // Recover if the last builder exited between the two publication renames.
    if (!existsSync(dist) && existsSync(backup)) renameSync(backup, dist)
    const ifStale = process.argv.includes('--if-stale')
    const reason = ifStale ? staleBuildWarning(root) : null
    if (reason && lastFailedBuild(root)) {
      // Another caller compiled these inputs while this one waited for the lock, and it failed.
      process.stderr.write(`mlcl: ${reason}; the last rebuild of this source failed.\n`)
      process.exitCode = 1
    } else {
      if (reason) process.stderr.write(`mlcl: rebuilding dist/ because ${reason}.\n`)
      if (!ifStale || reason) process.exitCode = build()
    }
  } finally {
    releaseLock(owner)
  }
} catch (error) {
  process.stderr.write(`mlcl build: ${error.message}\n`)
  process.exitCode = 1
}
