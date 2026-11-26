/**
 * `envVariablesLeftToSet` is the one rule for which `.env` values a developer must still set: the
 * scaffold README names them and `generateEnvFile` reports them, so the two cannot disagree.
 *
 * @module
 */

import { readFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { envVariablesLeftToSet, generateEnvFile, readmeEnvStep } from '../scaffold.js'
import type { MoleculeSecret } from '../schema.js'

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'mlcl-env-left-to-set-'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

/** The variables a `.env` file leaves empty. */
function blankVariables(file: string): string[] {
  return readFileSync(file, 'utf8')
    .split('\n')
    .flatMap((line) => /^([A-Z][A-Z0-9_]*)=$/.exec(line)?.[1] ?? [])
}

describe('envVariablesLeftToSet', () => {
  const secrets: MoleculeSecret[] = [
    { name: 'NEEDED_KEY', required: true },
    { name: 'OPTIONAL_KEY', required: false },
    { name: 'DEFAULTED_URL', required: true, default: 'http://localhost:7700' },
    { name: 'JWT_PRIVATE_KEY', required: true, generate: 'rsa-keypair-private' },
    { name: 'JWT_PUBLIC_KEY', required: true, generate: 'rsa-keypair-public' },
    { name: 'DATABASE_URL', required: true },
    { name: 'VITE_PUBLIC_KEY', required: true },
  ] as MoleculeSecret[]

  it('lists only required variables with no default and nothing generated', () => {
    expect(envVariablesLeftToSet(secrets, 'api')).toEqual(['NEEDED_KEY'])
    expect(envVariablesLeftToSet(secrets, 'app')).toEqual(['VITE_PUBLIC_KEY'])
  })

  it('is what generateEnvFile reports and leaves empty', async () => {
    const reported = await generateEnvFile(dir, secrets, 'api', 'proj')
    expect(reported).toEqual(envVariablesLeftToSet(secrets, 'api'))
    expect(blankVariables(join(dir, '.env'))).toEqual(expect.arrayContaining(reported))
  })
})

describe('readmeEnvStep', () => {
  it('names each file that needs values and skips the rest', () => {
    expect(
      readmeEnvStep([
        ['api/.env', ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET']],
        ['app/.env', []],
      ]),
    ).toBe('# set in api/.env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET\n')
    expect(readmeEnvStep([['api/.env', []]])).toBe('')
  })
})
