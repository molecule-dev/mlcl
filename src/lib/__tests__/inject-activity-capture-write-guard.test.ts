/**
 * `injectActivityCaptureBoot` writes THREE things that only work together: the
 * producer module (`src/bonds/_activity-capture.ts`), the wiring in
 * `src/bonds/index.ts`, and the module's `@molecule/api-activity*` imports in the
 * workspace `package.json`. Its own comment states the rule — "nothing may be
 * left importing undeclared packages" — but only the index write was covered:
 *
 *  - a failed index write removed the module again, yet left the TRUNCATED
 *    index (writeFile truncates first) still carrying the
 *    `from './_activity-capture.js'` import it had just added — a dangling
 *    import of a module the same catch deleted, i.e. a project that no longer
 *    compiles;
 *  - a failed MANIFEST write (step 3) was worse: the index and module stayed
 *    wired while the imports they need were never declared, which is exactly
 *    the TS2307 the step exists to prevent.
 *
 * Both failure points now roll the whole step back: the index is restored to its
 * pre-injection bytes (the manifest by `writeGuarded`, the index by this
 * function's own rollback) and the module goes back to what it was — removed
 * when this call created it, restored to its own bytes when it predated the
 * call. The module's OWN write is guarded for the same reason (a truncated
 * producer is a module `bonds/index.ts` imports): a failed write there restores
 * the module instead of leaving the partial file behind. So a failed run leaves
 * the project exactly as it was.
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

describe('injectActivityCaptureBoot — a failed write rolls the wiring back', () => {
  it('restores bonds/index.ts and removes the producer module when the index write fails', async () => {
    shortWrite.path = indexPath()

    await expect(injectActivityCaptureBoot(apiDir)).rejects.toThrow(/ENOSPC/)

    // The truncated index would still carry the import of a module the cleanup
    // just deleted — a dangling import. The file must be its old self.
    expect(readFileSync(indexPath(), 'utf-8')).toBe(BONDS_INDEX)
    expect(existsSync(modulePath())).toBe(false)
  })

  it('unwires the producer when the manifest write fails, so nothing imports undeclared packages', async () => {
    const manifestPath = join(apiDir, 'package.json')
    const manifestBefore = readFileSync(manifestPath, 'utf-8')
    shortWrite.path = manifestPath

    await expect(injectActivityCaptureBoot(apiDir)).rejects.toThrow(/ENOSPC/)

    // Wiring rolled back …
    expect(readFileSync(indexPath(), 'utf-8')).toBe(BONDS_INDEX)
    expect(existsSync(modulePath())).toBe(false)
    // … and the manifest is the bytes it started as, not a truncated file.
    expect(readFileSync(manifestPath, 'utf-8')).toBe(manifestBefore)
  })

  it('restores the existing producer module when its own write fails mid-flight', async () => {
    // The idempotent path: bonds/index.ts ALREADY imports the producer, so this
    // call only refreshes the module. A write that failed mid-flight there used
    // to leave a TRUNCATED `_activity-capture.ts` — a file the index (and so
    // server.ts at boot) imports, i.e. a project that no longer starts.
    const wired = BONDS_INDEX.replace(
      "import { setupEmailsMailgun } from './emails-mailgun.js'",
      "import { setupEmailsMailgun } from './emails-mailgun.js'\nimport { setupActivityCapture } from './_activity-capture.js'",
    )
    writeFileSync(indexPath(), wired)
    writeFileSync(modulePath(), '// the producer this project shipped with\n')
    shortWrite.path = modulePath()

    await expect(injectActivityCaptureBoot(apiDir)).rejects.toThrow(/ENOSPC/)

    expect(readFileSync(modulePath(), 'utf-8')).toBe('// the producer this project shipped with\n')
    expect(readFileSync(indexPath(), 'utf-8')).toBe(wired)
  })

  it('puts a pre-existing producer module back — never deletes it — when a later write fails', async () => {
    // The module already exists (an earlier run, or a template that ships it)
    // but the index is not wired yet. The rollback must restore the module's own
    // bytes; `rm` would delete a file this call only overwrote.
    writeFileSync(modulePath(), '// the producer this project shipped with\n')
    const manifestPath = join(apiDir, 'package.json')
    const manifestBefore = readFileSync(manifestPath, 'utf-8')
    shortWrite.path = manifestPath

    await expect(injectActivityCaptureBoot(apiDir)).rejects.toThrow(/ENOSPC/)

    expect(readFileSync(indexPath(), 'utf-8')).toBe(BONDS_INDEX)
    expect(readFileSync(modulePath(), 'utf-8')).toBe('// the producer this project shipped with\n')
    expect(readFileSync(manifestPath, 'utf-8')).toBe(manifestBefore)
  })

  it('wires all three when every write succeeds', async () => {
    // The positive twin: without it, the assertions above would hold for a
    // function that never writes anything.
    expect(await injectActivityCaptureBoot(apiDir)).toBe(true)

    expect(readFileSync(indexPath(), 'utf-8')).toContain(
      "import { setupActivityCapture } from './_activity-capture.js'",
    )
    expect(existsSync(modulePath())).toBe(true)
    const manifest = JSON.parse(readFileSync(join(apiDir, 'package.json'), 'utf-8')) as {
      dependencies: Record<string, string>
    }
    expect(manifest.dependencies['@molecule/api-activity']).toBeDefined()
  })
})
