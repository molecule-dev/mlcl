/**
 * `ensureMoleculePeerClosure` adds a core's `defaultProvider` only when the
 * manifest has no provider for that core yet. An app on SQLite also got
 * Postgres, and its bond index then wired both database providers (X1 run
 * sol-m08 read that as a broken scaffold). Runs against the real registry.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { ensureMoleculePeerClosure } from '../scaffold.js'

let dir: string
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'peer-closure-'))
  mkdirSync(join(dir, 'api'))
})
afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

const apiDeps = (deps: Record<string, string>): Record<string, string> => {
  writeFileSync(join(dir, 'api', 'package.json'), JSON.stringify({ dependencies: deps }))
  return deps
}
const read = (): Record<string, string> =>
  (
    JSON.parse(readFileSync(join(dir, 'api', 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>
    }
  ).dependencies

describe('ensureMoleculePeerClosure and default providers', () => {
  it('adds no Postgres bond to an app that bonds SQLite', async () => {
    apiDeps({ '@molecule/api-database': '1.0.0', '@molecule/api-database-sqlite': '1.0.0' })
    await ensureMoleculePeerClosure(dir)
    expect(Object.keys(read())).not.toContain('@molecule/api-database-postgresql')
  })

  it("still adds the core's default when nothing provides it", async () => {
    apiDeps({ '@molecule/api-database': '1.0.0' })
    await ensureMoleculePeerClosure(dir)
    expect(Object.keys(read())).toContain('@molecule/api-database-postgresql')
  })
})
