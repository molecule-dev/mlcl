/**
 * The shared scaffold eslint config must let the standard Express `Request`
 * augmentation lint clean. `mlcl create` copies `templates/shared/
 * eslint.config.js.tpl` into every project, so a config that flags
 * `declare global { namespace Express { … } }` makes a brand-new project fail
 * `npm run lint` (zero warnings allowed) the moment it types `req.user` — and
 * the only ways out are a cast or a disable comment, both worse than the
 * augmentation.
 *
 * Driven through real ESLint against the real .tpl, so this proves the rule
 * option does what the comment says rather than that a line of text exists. The
 * negative control (a non-declaration namespace is still an error) proves the
 * gate can fail.
 *
 * @module
 */

import { copyFile, mkdtemp, rm, symlink } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { ESLint } from 'eslint'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)

/** The one config every scaffolded workspace receives. */
const TEMPLATE = fileURLToPath(
  new URL('../../../templates/shared/eslint.config.js.tpl', import.meta.url),
)

/** The node_modules the config's own imports resolve from. */
const NODE_MODULES = dirname(dirname(require.resolve('eslint/package.json')))

let dir: string
let eslint: ESLint

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'mlcl-eslint-config-'))
  // The .tpl's extension is not loadable as a config file, and its bare
  // imports have to resolve from a directory under node_modules — so it is
  // copied to .mjs next to a link to the installed tree.
  await copyFile(TEMPLATE, join(dir, 'eslint.config.mjs'))
  await symlink(NODE_MODULES, join(dir, 'node_modules'), 'dir')
  eslint = new ESLint({
    cwd: dir,
    overrideConfigFile: join(dir, 'eslint.config.mjs'),
    // typescript-estree accumulates one candidate tsconfig root per temp
    // directory it has parsed in a process, and refuses to infer with more than
    // one. Each linted file gets an explicit root; nothing about the RULES under
    // test changes.
    overrideConfig: { languageOptions: { parserOptions: { tsconfigRootDir: dir } } },
  })
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('the shared scaffold eslint config', () => {
  it('allows both standard Express Request augmentations', async () => {
    const [result] = await eslint.lintText(
      [
        'declare global {',
        '  namespace Express {',
        '    interface Request {',
        '      conduitUserId?: string',
        '    }',
        '  }',
        '}',
        '',
        "declare module 'express-serve-static-core' {",
        '  interface Request {',
        '    conduitUserId?: string',
        '  }',
        '}',
        '',
        'export {}',
        '',
      ].join('\n'),
      { filePath: 'augmentation.ts' },
    )
    expect(result.messages).toEqual([])
  })

  it('still fails a namespace declaration without `declare`', async () => {
    const [result] = await eslint.lintText('namespace Foo {\n  export const x = 1\n}\n', {
      filePath: 'plain.ts',
    })
    expect(result.messages.map((m) => m.ruleId)).toContain('@typescript-eslint/no-namespace')
  })
})
