/**
 * `mlcl create` says that the pages it wrote are part of the scaffold.
 *
 * Asked for "a full-stack app with sign-up and log-in; do not add other features", Codex scaffolded
 * a custom stack, read its settings, password-reset and about pages as features it had added, and
 * spent about 90 s deleting them and the API routes beside them, against 113 s for writing the whole
 * app by hand (harness eval `scaffold`, 2026-11-24). The closing orientation now names those pages
 * as the scaffold's own, with the count and directory read from disk.
 *
 * @module
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { projectOrientation } from '../create-next.js'

const made: string[] = []

/** A project directory holding `files` (relative paths, empty contents). */
function project(files: string[]): string {
  const root = mkdtempSync(join(tmpdir(), 'create-next-'))
  made.push(root)
  for (const file of files) {
    mkdirSync(join(root, file, '..'), { recursive: true })
    writeFileSync(join(root, file), '')
  }
  return root
}

afterEach(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('the orientation after a scaffold', () => {
  it('names the full-stack pages and API routes as the scaffold’s own (OLD MUSTFAIL)', () => {
    const root = project([
      'AGENTS.md',
      'api/src/handlers/index.ts',
      'app/src/pages/Login.tsx',
      'app/src/pages/Signup.tsx',
      'app/src/pages/Settings.tsx',
    ])
    const starter = projectOrientation(root).find((line) => line.includes('not a blank one'))
    expect(starter).toContain('its 3 pages in app/src/pages/')
    expect(starter).toContain('the API routes its packages mount')
    expect(starter).toContain('remove one only when the user asks')
  })

  it('counts page components only, and leaves out the API for an app alone (OLD MUSTFAIL)', () => {
    const root = project(['src/pages/Home.vue', 'src/pages/About.vue', 'src/pages/notes.md'])
    const starter = projectOrientation(root).find((line) => line.includes('not a blank one'))
    expect(starter).toContain('its 2 pages in src/pages/')
    expect(starter).not.toContain('API routes')
  })

  it('counterexample: a project with no pages gets no such line', () => {
    const root = project(['api/src/handlers/index.ts'])
    const lines = projectOrientation(root)
    expect(lines.some((line) => line.includes('not a blank one'))).toBe(false)
    expect(lines).toContain(
      'Endpoints: one file per feature in api/src/handlers/, registered in api/src/handlers/index.ts',
    )
  })
})
