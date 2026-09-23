/**
 * `mlcl create --template` copies the template as built, so a `--framework` or
 * `--packages` the caller also passed never reached the project — and nothing
 * said so. The command now names what it did not apply and how to get it.
 *
 * Runs the REAL oclif command against a temp directory (the template copy takes
 * about a second; `--skip-install` keeps npm out of it).
 *
 * @module
 */

import { existsSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Config } from '@oclif/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import Create from '../create.js'

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')

describe('mlcl create --template with flags the template does not take', () => {
  let dir: string
  let prevCwd: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-create-template-flags-'))
    prevCwd = process.cwd()
    process.chdir(dir)
  })

  afterEach(async () => {
    process.chdir(prevCwd)
    await rm(dir, { recursive: true, force: true })
  })

  async function warningsFor(flags: string[]): Promise<string[]> {
    const config = await Config.load(MLCL_ROOT)
    const cmd = new Create(['proj', '--template', 'blog', '--skip-install', ...flags], config)
    const warn = vi.spyOn(cmd, 'warn').mockImplementation((input) => input)
    vi.spyOn(cmd, 'log').mockImplementation(() => undefined)
    await cmd.run()
    return warn.mock.calls.map(([w]) => String(w))
  }

  it('says a different --framework and extra --packages were not applied', async () => {
    const warnings = await warningsFor([
      '--framework',
      'vue',
      '--packages',
      '@molecule/api-cache-redis',
    ])
    expect(existsSync(join(dir, 'proj', 'app', 'package.json'))).toBe(true)
    expect(warnings.some((w) => w.includes('--framework vue was not applied'))).toBe(true)
    expect(warnings.some((w) => w.includes('mlcl create <name> --type'))).toBe(true)
    expect(warnings.some((w) => w.includes('@molecule/api-cache-redis were not added'))).toBe(true)
    expect(warnings.some((w) => w.includes('mlcl add <package> --inject'))).toBe(true)
  })

  it('stays quiet when the flags match the template', async () => {
    const warnings = await warningsFor(['--framework', 'react'])
    expect(warnings.filter((w) => w.includes('was not applied'))).toHaveLength(0)
    expect(warnings.filter((w) => w.includes('were not added'))).toHaveLength(0)
  })
})
