/**
 * Tests for the external-app integration helpers (`mlcl add` / `mlcl swap`).
 *
 * @module
 */

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { detectProjectRoot, resolveAddVersion } from '../integrate.js'
import { getMoleculeVersion } from '../registry.js'

// A package that is guaranteed to exist in the bundled registry.json.
const KNOWN_MOLECULE = '@molecule/api-database'

const tempDirs: string[] = []

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((d) => rm(d, { recursive: true, force: true })))
})

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'mlcl-integrate-'))
  tempDirs.push(dir)
  return dir
}

describe('resolveAddVersion', () => {
  it('uses the published npm version when the lookup succeeds', async () => {
    const result = await resolveAddVersion(KNOWN_MOLECULE, async () => '3.2.1\n')
    expect(result).toEqual({ version: '3.2.1', source: 'npm' })
  })

  it('falls back to the local registry version for a known @molecule package when npm fails', async () => {
    const result = await resolveAddVersion(KNOWN_MOLECULE, async () => {
      throw new Error('E404 Not Found')
    })
    expect(result.source).toBe('registry')
    expect(result.version).toBe(getMoleculeVersion(KNOWN_MOLECULE))
    // Registry versions are exact pins — never a range.
    expect(result.version).not.toMatch(/[\^~*]/)
  })

  it('falls back to the registry when npm returns an empty string', async () => {
    const result = await resolveAddVersion(KNOWN_MOLECULE, async () => '   \n')
    expect(result.source).toBe('registry')
    expect(result.version).toBe(getMoleculeVersion(KNOWN_MOLECULE))
  })

  it('falls back to "latest" for an unknown @molecule package when npm fails', async () => {
    const result = await resolveAddVersion('@molecule/api-does-not-exist-zzz', async () => {
      throw new Error('E404')
    })
    expect(result).toEqual({ version: 'latest', source: 'fallback' })
  })

  it('falls back to "latest" for a non-molecule package when npm fails', async () => {
    const result = await resolveAddVersion('express', async () => {
      throw new Error('offline')
    })
    expect(result).toEqual({ version: 'latest', source: 'fallback' })
  })
})

describe('detectProjectRoot', () => {
  it('returns cwd when package.json carries the matching molecule.projectType marker', async () => {
    const dir = await makeTempDir()
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'x', molecule: { projectType: 'api' } }),
    )
    expect(await detectProjectRoot(dir, 'api')).toBe(dir)
  })

  it('does not match when the marker is for a different stack', async () => {
    const dir = await makeTempDir()
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'x', molecule: { projectType: 'app' } }),
    )
    expect(await detectProjectRoot(dir, 'api')).toBeNull()
  })

  it('returns the stack subdirectory in a full-stack layout', async () => {
    const dir = await makeTempDir()
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'root' }))
    await mkdir(join(dir, 'api'), { recursive: true })
    await writeFile(join(dir, 'api', 'package.json'), JSON.stringify({ name: 'api' }))
    expect(await detectProjectRoot(dir, 'api')).toBe(join(dir, 'api'))
  })

  it('returns cwd for a flat app that adopted the src/bonds convention (no marker)', async () => {
    const dir = await makeTempDir()
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'existing-app' }))
    await mkdir(join(dir, 'src', 'bonds'), { recursive: true })
    expect(await detectProjectRoot(dir, 'api')).toBe(dir)
  })

  it('prefers the explicit marker over the src/bonds fallback', async () => {
    const dir = await makeTempDir()
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'x', molecule: { projectType: 'app' } }),
    )
    await mkdir(join(dir, 'src', 'bonds'), { recursive: true })
    // Marker is 'app', so an 'app' query matches cwd via the marker branch.
    expect(await detectProjectRoot(dir, 'app')).toBe(dir)
  })

  it('returns null for a directory that is not a molecule project', async () => {
    const dir = await makeTempDir()
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'plain' }))
    await mkdir(join(dir, 'src'), { recursive: true })
    expect(await detectProjectRoot(dir, 'api')).toBeNull()
  })
})
