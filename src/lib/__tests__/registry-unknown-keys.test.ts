// @vitest-environment node
/**
 * A registry write never deletes a key the writing build does not know.
 *
 * The registry is read and stored through its zod schema, which strips unknown keys. A build older
 * than the file, such as a `dist/` built before a field was added to the schema or an older CLI,
 * therefore removed that field from every entry the next time it wrote anything. On 2026-11-25 a
 * scoped `sync-registry` from a stale build dropped `selection` from eight unrelated entries.
 *
 * The same parse refuses a malformed intent hint, so no write stores one: a hand-built entry with
 * "serialize React style objects to CSS" reached a commit the same day, and only the full
 * `--check-intent-hints` run found it.
 *
 * @module
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, describe, expect, it } from 'vitest'

import { serializeRegistry, unknownRegistryKeys, writeRegistryFile } from '../registry.js'
import { Registry } from '../schema.js'

const __dir = dirname(fileURLToPath(import.meta.url))
const text = readFileSync(join(__dir, '..', '..', '..', 'registry.json'), 'utf-8')
const NAME = '@molecule/app-ui-react'

/**
 * The real registry, with keys no schema field names: one on a package entry and one inside the
 * top-level toolchain object.
 *
 * @returns The registry JSON as a newer build would store it.
 */
function withFutureKeys(): Record<string, unknown> {
  const raw = JSON.parse(text)
  raw.packages[NAME] = { ...raw.packages[NAME], futureField: 'kept' }
  raw.toolchain = { ...raw.toolchain, futureLane: { tool: '1.0.0' } }
  return raw
}

const dirs: string[] = []
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

/**
 * A registry file in a fresh temporary directory.
 *
 * @param contents - The JSON to store.
 * @returns The file's path.
 */
function registryFile(contents: unknown): string {
  const dir = mkdtempSync(join(tmpdir(), 'registry-unknown-keys-'))
  dirs.push(dir)
  const path = join(dir, 'registry.json')
  writeFileSync(path, `${JSON.stringify(contents, null, 2)}\n`)
  return path
}

describe('registry writes keep keys the build does not know', () => {
  it('names every key the schema would strip, at any depth', () => {
    expect(unknownRegistryKeys(withFutureKeys())).toEqual([
      `packages.${NAME}.futureField`,
      'toolchain.futureLane',
    ])
  })

  it('finds none in the committed registry', () => {
    expect(unknownRegistryKeys(JSON.parse(text))).toEqual([])
  })

  it('refuses to replace a file holding them, and leaves the file as it was', () => {
    const raw = withFutureKeys()
    const path = registryFile(raw)
    const before = readFileSync(path, 'utf-8')
    // What a stale build holds after reading the file: the parsed registry, unknown keys gone.
    const parsed = Registry.parse(raw)
    parsed.packages[NAME] = { ...parsed.packages[NAME], description: 'An unrelated edit' }

    expect(() => writeRegistryFile(path, parsed)).toThrow(
      new RegExp(`does not know \\(packages\\.${NAME}\\.futureField, toolchain\\.futureLane\\)`),
    )
    expect(readFileSync(path, 'utf-8')).toBe(before)
  })

  it('writes a file whose keys the schema knows', () => {
    const raw = JSON.parse(text)
    const path = registryFile(raw)
    const parsed = Registry.parse(raw)
    parsed.packages[NAME] = { ...parsed.packages[NAME], description: 'An unrelated edit' }

    writeRegistryFile(path, parsed)

    expect(JSON.parse(readFileSync(path, 'utf-8')).packages[NAME].description).toBe(
      'An unrelated edit',
    )
  })
})

describe('registry intent hints', () => {
  it('refuses to store a hint that is not lowercase letters, digits, spaces, - and /', () => {
    const raw = JSON.parse(text)
    raw.packages[NAME] = { ...raw.packages[NAME], intentHints: ['serialize React style objects'] }

    expect(() => serializeRegistry(raw)).toThrow(/an intent hint is lowercase letters/)
  })

  it('stores a well-formed hint', () => {
    const raw = JSON.parse(text)
    raw.packages[NAME] = { ...raw.packages[NAME], intentHints: ['a/b testing', 'react ui kit 2'] }

    expect(JSON.parse(serializeRegistry(raw)).packages[NAME].intentHints).toEqual([
      'a/b testing',
      'react ui kit 2',
    ])
  })
})
