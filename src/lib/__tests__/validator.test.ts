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
})
