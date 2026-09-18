import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, describe, expect, it } from 'vitest'

import { validateInjectionOutput } from '../validator.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a minimal temp project directory and return its path */
async function createTempProject(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'mlcl-validator-test-'))
}

/** Write a file inside a project, creating parent dirs as needed */
async function writeProjectFile(
  projectPath: string,
  relPath: string,
  content: string,
): Promise<void> {
  const fullPath = join(projectPath, relPath)
  const dir = fullPath.substring(0, fullPath.lastIndexOf('/'))
  await mkdir(dir, { recursive: true })
  await writeFile(fullPath, content, 'utf-8')
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('validateInjectionOutput', () => {
  // Temp dirs to clean up
  const tempDirs: string[] = []

  afterAll(async () => {
    for (const dir of tempDirs) {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('returns valid=true for a minimal valid project (no errors)', async () => {
    const tmp = await createTempProject()
    tempDirs.push(tmp)

    await writeProjectFile(
      tmp,
      'src/server.ts',
      `import express from 'express'\nimport { router } from './App/router.js'\nimport { setupBonds } from './bonds/index.js'\nsetupBonds()\nconst app = express()\napp.use(router)\n`,
    )
    await writeProjectFile(
      tmp,
      'src/App/router.ts',
      `import { Router } from 'express'\nexport const router = Router()\nrouter.get(\`/health\`, (req, res) => res.json({ ok: true }))\n`,
    )
    await writeProjectFile(tmp, 'src/bonds/index.ts', `export function setupBonds(): void {}\n`)

    const result = await validateInjectionOutput(tmp)

    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('reports missing critical files when they do not exist (empty temp dir)', async () => {
    const tmp = await createTempProject()
    tempDirs.push(tmp)

    const result = await validateInjectionOutput(tmp)

    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Missing critical file: src/server.ts')
    expect(result.errors).toContain('Missing critical file: src/App/router.ts')
    expect(result.errors).toContain('Missing critical file: src/bonds/index.ts')
  })

  it('reports "Missing critical file: src/server.ts" for project without server.ts', async () => {
    const tmp = await createTempProject()
    tempDirs.push(tmp)

    // Provide router.ts and bonds/index.ts but no server.ts
    await writeProjectFile(
      tmp,
      'src/App/router.ts',
      `import { Router } from 'express'\nexport const router = Router()\n`,
    )
    await writeProjectFile(tmp, 'src/bonds/index.ts', `export function setupBonds(): void {}\n`)

    const result = await validateInjectionOutput(tmp)

    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Missing critical file: src/server.ts')
  })

  it('reports "Server missing setupBonds() call" for server without setupBonds', async () => {
    const tmp = await createTempProject()
    tempDirs.push(tmp)

    await writeProjectFile(
      tmp,
      'src/server.ts',
      `import express from 'express'\nimport { router } from './App/router.js'\nconst app = express()\n`,
    )
    await writeProjectFile(
      tmp,
      'src/App/router.ts',
      `import { Router } from 'express'\nexport const router = Router()\n`,
    )
    await writeProjectFile(tmp, 'src/bonds/index.ts', `export function setupBonds(): void {}\n`)

    const result = await validateInjectionOutput(tmp)

    expect(result.errors).toContain('Server missing setupBonds() call')
  })

  it('reports "Router imports non-existent file" when router references bad import', async () => {
    const tmp = await createTempProject()
    tempDirs.push(tmp)

    await writeProjectFile(
      tmp,
      'src/App/router.ts',
      [
        `import { requestHandlerMap as Widget } from './Resource/Widget/index.js'`,
        `import { Router } from 'express'`,
        `export const router = Router()`,
        `router.get(\`/widgets\`, Widget.query)`,
      ].join('\n'),
    )
    await writeProjectFile(tmp, 'src/bonds/index.ts', `export function setupBonds(): void {}\n`)
    await writeProjectFile(
      tmp,
      'src/server.ts',
      `import express from 'express'\nimport { router } from './App/router.js'\nimport { setupBonds } from './bonds/index.js'\nsetupBonds()\n`,
    )

    const result = await validateInjectionOutput(tmp)

    expect(result.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('Router imports non-existent file')]),
    )
  })

  it('reports duplicate routes when router has same method+path twice', async () => {
    const tmp = await createTempProject()
    tempDirs.push(tmp)

    await writeProjectFile(
      tmp,
      'src/App/router.ts',
      [
        `import { Router } from 'express'`,
        `export const router = Router()`,
        `router.get(\`/users\`, () => {})`,
        `router.get(\`/users\`, () => {})`,
      ].join('\n'),
    )
    await writeProjectFile(tmp, 'src/bonds/index.ts', `export function setupBonds(): void {}\n`)
    await writeProjectFile(
      tmp,
      'src/server.ts',
      `import express from 'express'\nimport { router } from './App/router.js'\nimport { setupBonds } from './bonds/index.js'\nsetupBonds()\n`,
    )

    const result = await validateInjectionOutput(tmp)

    expect(result.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('Duplicate route: GET /users')]),
    )
  })

  it('reports resource wrapper issues when index.ts is missing requestHandlerMap', async () => {
    const tmp = await createTempProject()
    tempDirs.push(tmp)

    // Create a minimal valid project
    await writeProjectFile(
      tmp,
      'src/App/router.ts',
      `import { Router } from 'express'\nexport const router = Router()\n`,
    )
    await writeProjectFile(tmp, 'src/bonds/index.ts', `export function setupBonds(): void {}\n`)
    await writeProjectFile(
      tmp,
      'src/server.ts',
      `import express from 'express'\nimport { router } from './App/router.js'\nimport { setupBonds } from './bonds/index.js'\nsetupBonds()\n`,
    )

    // Create a Resource directory with an index.ts that is missing the expected exports
    await writeProjectFile(
      tmp,
      'src/App/Resource/Broken/index.ts',
      `// Intentionally incomplete wrapper\nexport const handlers = {}\n`,
    )

    const result = await validateInjectionOutput(tmp)

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Broken/index.ts missing requestHandlerMap'),
      ]),
    )
  })
})
