import { readdir, readFile, readlink, rm } from 'node:fs/promises'
import { join } from 'node:path'

import { expect, it, vi } from 'vitest'

import { createTestProject, TEST_MOLECULES } from './create-test-project.js'

vi.mock(import('node:fs/promises'), async (importOriginal) => {
  const fs = await importOriginal()
  return { ...fs, readdir: vi.fn(fs.readdir) }
})

it('links the requested fixture packages without walking the Molecule tree', async () => {
  const project = await createTestProject()
  try {
    for (const name of TEST_MOLECULES) {
      const source = await readlink(join(project, 'node_modules', name))
      const manifest = JSON.parse(await readFile(join(source, 'package.json'), 'utf8'))
      expect(manifest.name).toBe(name)
    }
    expect(vi.mocked(readdir).mock.calls.length).toBe(0)
  } finally {
    await rm(project, { recursive: true, force: true })
  }
})
