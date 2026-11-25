/**
 * `injectActivityCaptureBoot` writes two things that only work together: the import and call in
 * `src/bonds/index.ts` and the package's declaration in the workspace `package.json`. An index that
 * imports an undeclared package fails tsc, so a failed write must leave both as they were, and a
 * short write (ENOSPC) must not leave either truncated.
 *
 * @module
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import type * as fsPromises from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/** When non-null, the NEXT write to this exact path truncates and then throws. */
const shortWrite = vi.hoisted(() => ({ path: null as string | null }))

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof fsPromises>()
  type WriteFileArgs = Parameters<typeof actual.writeFile>
  return {
    ...actual,
    writeFile: async (
      path: WriteFileArgs[0],
      data: WriteFileArgs[1],
      options?: WriteFileArgs[2],
    ): Promise<void> => {
      if (shortWrite.path !== null && String(path) === shortWrite.path) {
        // Truncate first, then fail — the shape of a short write on ENOSPC.
        // Fires ONCE so the rollback's own restore write can land.
        shortWrite.path = null
        await actual.writeFile(path, 'TRUNCATED-BEFORE-FAILURE', options)
        throw Object.assign(new Error(`ENOSPC: no space left on device, write '${String(path)}'`), {
          code: 'ENOSPC',
        })
      }
      return actual.writeFile(path, data, options)
    },
  }
})

import { injectActivityCaptureBoot } from '../scaffold.js'

/** A minimal hand-curated bonds/index.ts, the shape every flagship ships. */
const BONDS_INDEX = `import { resolveAll } from '@molecule/api-secrets'

import { setupEmailsMailgun } from './emails-mailgun.js'

export async function setupBonds(): Promise<void> {
  await resolveAll(['MAILGUN_API_KEY'])
  setupEmailsMailgun()
}
`

let apiDir: string

beforeEach(() => {
  shortWrite.path = null
  apiDir = mkdtempSync(join(tmpdir(), 'mlcl-activity-capture-guard-'))
  mkdirSync(join(apiDir, 'src', 'bonds'), { recursive: true })
  writeFileSync(join(apiDir, 'src', 'bonds', 'index.ts'), BONDS_INDEX)
  writeFileSync(
    join(apiDir, 'package.json'),
    JSON.stringify({ name: 'demo-api', dependencies: {} }, null, 2) + '\n',
  )
})

afterEach(() => {
  shortWrite.path = null
  rmSync(apiDir, { recursive: true, force: true })
})

const indexPath = (): string => join(apiDir, 'src', 'bonds', 'index.ts')
const modulePath = (): string => join(apiDir, 'src', 'bonds', '_activity-capture.ts')

const LEGACY_INDEX = BONDS_INDEX.replace(
  "import { setupEmailsMailgun } from './emails-mailgun.js'\n",
  "import { setupActivityCapture } from './_activity-capture.js'\nimport { setupEmailsMailgun } from './emails-mailgun.js'\n",
).replace('  setupEmailsMailgun()\n', '  setupEmailsMailgun()\n  await setupActivityCapture()\n')

describe('injectActivityCaptureBoot — a failed write leaves the API as it was', () => {
  it('restores bonds/index.ts when its write fails', async () => {
    const manifestBefore = readFileSync(join(apiDir, 'package.json'), 'utf-8')
    shortWrite.path = indexPath()

    await expect(injectActivityCaptureBoot(apiDir)).rejects.toThrow(/ENOSPC/)

    expect(readFileSync(indexPath(), 'utf-8')).toBe(BONDS_INDEX)
    expect(readFileSync(join(apiDir, 'package.json'), 'utf-8')).toBe(manifestBefore)
  })

  it('unwires the index when the manifest write fails, so nothing imports an undeclared package', async () => {
    const manifestPath = join(apiDir, 'package.json')
    const manifestBefore = readFileSync(manifestPath, 'utf-8')
    shortWrite.path = manifestPath

    await expect(injectActivityCaptureBoot(apiDir)).rejects.toThrow(/ENOSPC/)

    expect(readFileSync(indexPath(), 'utf-8')).toBe(BONDS_INDEX)
    expect(readFileSync(manifestPath, 'utf-8')).toBe(manifestBefore)
  })

  it('keeps the old generated module when moving its index onto the package fails', async () => {
    writeFileSync(indexPath(), LEGACY_INDEX)
    writeFileSync(modulePath(), 'export async function setupActivityCapture() {}\n')
    shortWrite.path = join(apiDir, 'package.json')

    await expect(injectActivityCaptureBoot(apiDir)).rejects.toThrow(/ENOSPC/)

    expect(readFileSync(indexPath(), 'utf-8')).toBe(LEGACY_INDEX)
    expect(existsSync(modulePath())).toBe(true)
  })

  it('wires and declares the package when every write succeeds', async () => {
    expect(await injectActivityCaptureBoot(apiDir)).toBe(true)

    expect(readFileSync(indexPath(), 'utf-8')).toContain(
      "import { setupActivityCapture } from '@molecule/api-activity-capture'",
    )
    const manifest = JSON.parse(readFileSync(join(apiDir, 'package.json'), 'utf-8')) as {
      dependencies: Record<string, string>
    }
    expect(manifest.dependencies['@molecule/api-activity-capture']).toMatch(/^\d+\.\d+\.\d+$/)
  })
})
