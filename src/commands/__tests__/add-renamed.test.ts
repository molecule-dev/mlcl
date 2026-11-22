/**
 * `mlcl add` of a package the registry marks `replacedBy` (renamed): the project gets the package
 * that replaced it, and a warning names both. An exact version asked for is a version of the old
 * name, so that request installs the old name as asked.
 *
 * @module
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import * as prompts from '@clack/prompts'
import { Config } from '@oclif/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getRawRegistry } from '../../lib/registry.js'
import Add from '../add.js'

vi.mock('@clack/prompts', async (original) => {
  const actual = await original<typeof prompts>()
  return { ...actual, log: { ...actual.log, warn: vi.fn() } }
})

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')
const OLD = '@molecule/app-i18n-default-react'
const NEW = '@molecule/app-i18n-default'

describe('mlcl add of a renamed package', () => {
  let dir: string
  let prevCwd: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-add-renamed-'))
    prevCwd = process.cwd()
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'package.json'), '{"name":"x","dependencies":{}}\n')
    process.chdir(dir)
  })

  afterEach(async () => {
    process.chdir(prevCwd)
    vi.clearAllMocks()
    await rm(dir, { recursive: true, force: true })
  })

  const add = async (argument: string): Promise<Record<string, string>> => {
    const config = await Config.load(MLCL_ROOT)
    const cmd = new Add([argument, '--no-install'], config)
    vi.spyOn(cmd, 'log').mockImplementation(() => undefined)
    vi.spyOn(cmd, 'warn').mockImplementation((input) => input)
    await cmd.run()
    return JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).dependencies
  }

  it('is the registry rename this command follows', () => {
    expect(getRawRegistry().packages[OLD]?.replacedBy).toBe(NEW)
  })

  it('adds the package that replaced it, and says so', async () => {
    const deps = await add(OLD)
    expect(deps).toHaveProperty(NEW)
    expect(deps).not.toHaveProperty(OLD)
    expect(prompts.log.warn).toHaveBeenCalledWith(`${OLD} was renamed to ${NEW}; adding ${NEW}.`)
  })

  it('installs an exact version of the old name as asked', async () => {
    const deps = await add(`${OLD}@1.0.8`)
    expect(deps[OLD]).toBe('1.0.8')
    expect(prompts.log.warn).not.toHaveBeenCalled()
  })

  it('counterexample: a package that was not renamed is added under its own name', async () => {
    const deps = await add(NEW)
    expect(deps).toHaveProperty(NEW)
    expect(prompts.log.warn).not.toHaveBeenCalled()
  })
})
