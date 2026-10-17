#!/usr/bin/env node
/**
 * Builds `dist/` without a window in which it does not exist.
 *
 * The old script was `rm -rf dist && tsc -b`: for the whole compile (minutes on a
 * loaded machine) there was no `dist/`, so every `mlcl` command run meanwhile —
 * another session's `sync-docs --check`, a release gate, a scaffold — failed with
 * "command not found". This compiles into a directory of its own, and only a
 * successful compile replaces `dist/`, by two renames. A failed compile leaves the
 * previous `dist/` in place. Each build uses its own directory, so two builds at
 * once do not write into each other's output.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, renameSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const next = join(root, `dist.build-${process.pid}`)
const old = join(root, `dist.old-${process.pid}`)
const dist = join(root, 'dist')
const tsc = createRequire(import.meta.url).resolve('typescript/bin/tsc')

const res = spawnSync(
  process.execPath,
  [tsc, '-p', join(root, 'tsconfig.json'), '--outDir', next],
  {
    cwd: root,
    stdio: 'inherit',
  },
)
if (res.status !== 0) {
  rmSync(next, { recursive: true, force: true })
  process.exit(res.status ?? 1)
}
if (existsSync(dist)) renameSync(dist, old)
renameSync(next, dist)
rmSync(old, { recursive: true, force: true })
