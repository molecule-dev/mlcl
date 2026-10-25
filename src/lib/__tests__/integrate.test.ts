/**
 * Tests for the external-app integration helpers (`mlcl add` / `mlcl swap`).
 *
 * @module
 */

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { detectProjectRoot, parseAddArgument, resolveAddVersion } from '../integrate.js'
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

describe('parseAddArgument', () => {
  it('splits a trailing @version off a scoped name', () => {
    expect(parseAddArgument('@molecule/api-resource-user@1.2.3')).toEqual({
      name: '@molecule/api-resource-user',
      requestedVersion: '1.2.3',
    })
    expect(parseAddArgument('express@4.18.2')).toEqual({
      name: 'express',
      requestedVersion: '4.18.2',
    })
  })

  it('leaves a bare scoped name whole (the leading @ is not a separator)', () => {
    expect(parseAddArgument('@molecule/api-resource-user')).toEqual({
      name: '@molecule/api-resource-user',
    })
  })
})

describe('resolveAddVersion', () => {
  it('uses the REGISTRY pin for a registered @molecule package, not npm latest', async () => {
    // The registry's shipped metadata (sqlCapabilities, setupSql +
    // setupSqlVersion) describes the registry's version. A standalone CLI is
    // routinely older than the newest molecule publish, so `npm view <pkg>
    // version` names bytes this CLI does not carry — pinning it would make the
    // preflight judge one release and the install run another.
    const result = await resolveAddVersion(KNOWN_MOLECULE, async () => '99.0.0\n')
    expect(result).toEqual({ version: getMoleculeVersion(KNOWN_MOLECULE), source: 'registry' })
  })

  it('does not consult npm at all for a registered @molecule package', async () => {
    let called = false
    await resolveAddVersion(KNOWN_MOLECULE, async () => {
      called = true
      return '1.2.3'
    })
    expect(called).toBe(false)
  })

  it('pins an explicitly requested exact version without any lookup', async () => {
    let called = false
    const result = await resolveAddVersion(
      KNOWN_MOLECULE,
      async () => {
        called = true
        return '9.9.9'
      },
      { requestedVersion: '1.2.2' },
    )
    expect(result).toEqual({ version: '1.2.2', source: 'requested' })
    expect(called).toBe(false)
  })

  it('refuses an explicitly requested range/tag instead of writing a floating pin', async () => {
    for (const requestedVersion of ['^1.2.2', '~1.2.2', 'latest', 'workspace:*', 'file:../x']) {
      await expect(
        resolveAddVersion(KNOWN_MOLECULE, async () => '9.9.9', { requestedVersion }),
      ).rejects.toThrow(/does not name one exact version/)
    }
  })

  it('gives a REGISTERED package the registry-pin remedy it actually has', async () => {
    // The registry carries an exact pin and the setup SQL for this package, so
    // naming them — and `mlcl add <pkg>` — is actionable here.
    await expect(
      resolveAddVersion(KNOWN_MOLECULE, async () => '9.9.9', { requestedVersion: '^1.2.2' }),
    ).rejects.toThrow(/registry's setup SQL[\s\S]*registry pin/)
  })

  it('gives a THIRD-PARTY package its own remedy — no registry pin, no setup SQL (R11-14)', async () => {
    // `express` has no registry entry, no setup SQL and no pin: the registered
    // package's message told its user to lean on two mechanisms that do not
    // exist for it (P18 r11 review, R11-14).
    let message = ''
    try {
      await resolveAddVersion('express', async () => '4.21.2', { requestedVersion: '^4' })
    } catch (error) {
      message = error instanceof Error ? error.message : String(error)
    }
    expect(message).toContain('does not name one exact version')
    expect(message).toContain('mlcl pins exact versions')
    expect(message).toContain('npm view express version')
    expect(message).not.toContain("registry's setup SQL")
    expect(message).not.toContain('registry pin')
    expect(message).toContain('omit the version')
  })

  it('still resolves a non-registry package from npm', async () => {
    const result = await resolveAddVersion('express', async () => '4.18.2\n')
    expect(result).toEqual({ version: '4.18.2', source: 'npm' })
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
