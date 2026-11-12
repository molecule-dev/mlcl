/** Execute the actual hook: a shared rule change must check every consumer. */
import { execFileSync } from 'node:child_process'
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { afterEach, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const scratch: string[] = []
afterEach(() => {
  for (const dir of scratch.splice(0)) rmSync(dir, { recursive: true, force: true })
})

function fleetCalls(staged: string): string[] {
  const root = mkdtempSync(join(tmpdir(), 'shared-eslint-hook-'))
  scratch.push(root)
  const repo = join(root, 'repo')
  const bin = join(root, 'bin')
  mkdirSync(repo)
  mkdirSync(bin)
  symlinkSync(dirname(dirname(require.resolve('eslint/package.json'))), join(root, 'node_modules'))
  copyFileSync(
    process.env.FLEET_HOOK_SOURCE ?? join(import.meta.dirname, '../../../.husky/pre-commit'),
    join(repo, 'hook.sh'),
  )
  writeFileSync(join(root, 'staged'), staged + '\n')
  writeFileSync(join(root, 'calls'), '')
  for (const [name, source] of Object.entries({
    git: '#!/bin/sh\ncat "$MOL_HOOK_STAGED"\n',
    node: '#!/bin/sh\nprintf "%s\\n" "$*" >> "$MOL_HOOK_CALLS"\n',
    npx: '#!/bin/sh\nexit 0\n',
  })) {
    writeFileSync(join(bin, name), source)
    chmodSync(join(bin, name), 0o755)
  }
  execFileSync('sh', ['-e', 'hook.sh'], {
    cwd: repo,
    env: {
      ...process.env,
      PATH: bin + ':' + process.env.PATH,
      MOL_HOOK_STAGED: join(root, 'staged'),
      MOL_HOOK_CALLS: join(root, 'calls'),
    },
    stdio: 'pipe',
  })
  return readFileSync(join(root, 'calls'), 'utf8')
    .split('\n')
    .filter((line) => line.startsWith('scripts/verify-template-lint.mjs'))
}

it.each([
  'templates/shared/eslint.config.js.tpl',
  'templates/shared/prefer-declared-clients.mjs',
  'templates/shared/no-empty-interactive-target.mjs',
])('checks every workspace after changing %s', (path) => {
  expect(fleetCalls(path)).toEqual(['scripts/verify-template-lint.mjs'])
})

it('keeps an app-only edit scoped to its template', () => {
  expect(fleetCalls('templates/apps/notes/app/src/Editor.tsx')).toEqual([
    'scripts/verify-template-lint.mjs notes',
  ])
})
it('does not add fleet work to a CLI-only edit', () => {
  expect(fleetCalls('src/commands/check.ts')).toEqual([])
})
it('does not add fleet work for unrelated template assets', () => {
  expect(fleetCalls('templates/shared/font.css')).toEqual([])
})
