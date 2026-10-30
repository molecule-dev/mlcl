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
  it('autofixes a storage catch once without changing its fallback', async () => {
    const source = [
      'export function readToken(): string | null {',
      '  try {',
      "    const token = window.localStorage.getItem('token')",
      "    return token && token.trim() !== '' ? token : null",
      '  } catch /* storage may be unavailable */ {',
      '    return null',
      '  }',
      '}',
      '',
    ].join('\n')
    const [before] = await eslint.lintText(source, { filePath: 'storage.ts' })
    expect(before.messages.map((message) => message.ruleId)).toContain(
      'molecule-local/require-catch-binding',
    )
    const fixer = new ESLint({
      cwd: dir,
      overrideConfigFile: join(dir, 'eslint.config.mjs'),
      overrideConfig: { languageOptions: { parserOptions: { tsconfigRootDir: dir } } },
      fix: true,
    })
    const [fixed] = await fixer.lintText(source, { filePath: 'storage.ts' })
    expect(fixed.messages).toEqual([])
    expect(fixed.output).toBe(source.replace('catch /*', 'catch (_error) /*'))
    const [again] = await fixer.lintText(fixed.output!, { filePath: 'storage.ts' })
    expect(again.messages).toEqual([])
    expect(again.output).toBeUndefined()
  })

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

  describe('molecule-local/router-commits-with-url', () => {
    it.each([
      {
        name: 'a BrowserRouter with no prop',
        source:
          "import { BrowserRouter } from 'react-router'\nexport const app = <BrowserRouter />\n",
      },
      {
        name: 'an aliased router import',
        source: "import { BrowserRouter as R } from 'react-router'\nexport const app = <R />\n",
      },
      {
        name: 'a RouterProvider with no prop',
        source:
          "import { RouterProvider } from 'react-router'\nexport const app = <RouterProvider />\n",
      },
      {
        name: 'useTransitions={true}',
        source:
          "import { BrowserRouter } from 'react-router'\nexport const app = <BrowserRouter useTransitions={true} />\n",
      },
      {
        name: 'a bare useTransitions prop',
        source:
          "import { BrowserRouter } from 'react-router'\nexport const app = <BrowserRouter useTransitions />\n",
      },
      {
        name: 'a react-router-dom import',
        source:
          "import { BrowserRouter } from 'react-router-dom'\nexport const app = <BrowserRouter />\n",
      },
      {
        name: 'a spread after the false prop',
        source:
          "import { BrowserRouter } from 'react-router'\nconst props = { useTransitions: true }\nexport const app = <BrowserRouter useTransitions={false} {...props} />\n",
      },
      {
        name: 'a spread with no explicit prop',
        source:
          "import { BrowserRouter } from 'react-router'\nconst props = { useTransitions: true }\nexport const app = <BrowserRouter {...props} />\n",
      },
      {
        name: 'a namespaced BrowserRouter',
        source: "import * as RR from 'react-router'\nexport const app = <RR.BrowserRouter />\n",
      },
      {
        name: 'a namespaced RouterProvider from react-router/dom',
        source:
          "import * as RR from 'react-router/dom'\nexport const app = <RR.RouterProvider />\n",
      },
    ])('reports $name at error severity', async ({ source }) => {
      const [result] = await eslint.lintText(source, { filePath: 'app.tsx' })
      expect(result.messages).toHaveLength(1)
      expect(result.messages[0]).toMatchObject({
        ruleId: 'molecule-local/router-commits-with-url',
        severity: 2,
      })
      expect(result.messages[0]?.message).toContain('URL')
      expect(result.messages[0]?.message).toContain('useTransitions={false}')
    })

    it.each([
      {
        name: 'useTransitions={false}',
        source:
          "import { BrowserRouter } from 'react-router'\nexport const app = <BrowserRouter useTransitions={false} />\n",
        filePath: 'app.tsx',
      },
      {
        name: 'a Router from another package',
        source: "import { Router } from 'wouter'\nexport const router = <Router />\n",
        filePath: 'app.tsx',
      },
      {
        name: 'a local component named Router',
        source: 'const Router = () => <div />\nexport const router = <Router />\n',
        filePath: 'app.tsx',
      },
      {
        name: 'a .ts API file',
        source: "export function readRouter(): string {\n  return 'ready'\n}\n",
        filePath: 'api.ts',
      },
      {
        name: 'useTransitions={false} after a spread',
        source:
          "import { BrowserRouter } from 'react-router'\nconst props = { useTransitions: true }\nexport const app = <BrowserRouter {...props} useTransitions={false} />\n",
        filePath: 'app.tsx',
      },
      {
        name: 'useTransitions={false as const}',
        source:
          "import { BrowserRouter } from 'react-router'\nexport const app = <BrowserRouter useTransitions={false as const} />\n",
        filePath: 'app.tsx',
      },
      {
        name: 'useTransitions={false satisfies boolean}',
        source:
          "import { BrowserRouter } from 'react-router'\nexport const app = <BrowserRouter useTransitions={false satisfies boolean} />\n",
        filePath: 'app.tsx',
      },
      {
        name: 'useTransitions={(false)}',
        source:
          "import { BrowserRouter } from 'react-router'\nexport const app = <BrowserRouter useTransitions={(false)} />\n",
        filePath: 'app.tsx',
      },
      {
        name: 'useTransitions={false!}',
        source:
          "import { BrowserRouter } from 'react-router'\nexport const app = <BrowserRouter useTransitions={false!} />\n",
        filePath: 'app.tsx',
      },
      {
        name: 'a namespace import from another package',
        source: "import * as W from 'wouter'\nexport const router = <W.Router />\n",
        filePath: 'app.tsx',
      },
      {
        name: 'a non-router re-export',
        source: "export { useNavigate } from 'react-router'\n",
        filePath: 'routing.ts',
      },
    ])('allows $name', async ({ source, filePath }) => {
      const [result] = await eslint.lintText(source, { filePath })
      expect(result.messages).toEqual([])
    })

    it.each([
      {
        name: 'a function parameter shadowing BrowserRouter',
        source:
          "import { BrowserRouter } from 'react-router'\nexport const root = <BrowserRouter useTransitions={false} />\nexport function Local({ BrowserRouter }: { BrowserRouter: () => null }) { return <BrowserRouter /> }\n",
      },
      {
        name: 'a function parameter shadowing a router namespace',
        source:
          "import * as RR from 'react-router'\nexport const root = <RR.BrowserRouter useTransitions={false} />\nexport function Local({ RR }: { RR: { BrowserRouter: () => null } }) { return <RR.BrowserRouter /> }\n",
      },
    ])('allows $name', async ({ source }) => {
      const [result] = await eslint.lintText(source, { filePath: 'app.tsx' })
      expect(
        result.messages.filter(
          (message) => message.ruleId === 'molecule-local/router-commits-with-url',
        ),
      ).toEqual([])
    })

    it.each([
      "export { BrowserRouter } from 'react-router'\n",
      "export { BrowserRouter as AppRouter } from 'react-router-dom'\n",
      "export { RouterProvider } from 'react-router/dom'\n",
      "export * from 'react-router'\n",
      "export * from 'react-router-dom'\n",
      "export * from 'react-router/dom'\n",
    ])('reports a router re-export without an autofix: %s', async (source) => {
      const [result] = await eslint.lintText(source, { filePath: 'routing.ts' })
      expect(result.messages).toHaveLength(1)
      expect(result.messages[0]).toMatchObject({
        ruleId: 'molecule-local/router-commits-with-url',
        messageId: 'reexport',
        severity: 2,
        message:
          'render the router where it is imported from React Router so the lint rule can check it.',
      })
      expect(result.messages[0]).not.toHaveProperty('fix')
    })

    it('autofixes missing and incorrect useTransitions values', async () => {
      const fixer = new ESLint({
        cwd: dir,
        overrideConfigFile: join(dir, 'eslint.config.mjs'),
        overrideConfig: { languageOptions: { parserOptions: { tsconfigRootDir: dir } } },
        fix: true,
      })
      const cases = [
        {
          source:
            "import { BrowserRouter } from 'react-router'\nexport const app = <BrowserRouter />\n",
          output:
            "import { BrowserRouter } from 'react-router'\nexport const app = <BrowserRouter useTransitions={false} />\n",
        },
        {
          source:
            "import { BrowserRouter } from 'react-router'\nexport const app = <BrowserRouter useTransitions={true} />\n",
          output:
            "import { BrowserRouter } from 'react-router'\nexport const app = <BrowserRouter useTransitions={false} />\n",
        },
        {
          source:
            "import { BrowserRouter } from 'react-router'\nexport const app = <BrowserRouter useTransitions />\n",
          output:
            "import { BrowserRouter } from 'react-router'\nexport const app = <BrowserRouter useTransitions={false} />\n",
        },
        {
          source:
            "import { BrowserRouter } from 'react-router'\nconst props = { useTransitions: true }\nexport const app = <BrowserRouter {...props} />\n",
          output:
            "import { BrowserRouter } from 'react-router'\nconst props = { useTransitions: true }\nexport const app = <BrowserRouter {...props} useTransitions={false} />\n",
        },
        {
          source:
            "import { BrowserRouter } from 'react-router'\nconst props = { useTransitions: true }\nexport const app = <BrowserRouter useTransitions={true} {...props} />\n",
          output:
            "import { BrowserRouter } from 'react-router'\nconst props = { useTransitions: true }\nexport const app = <BrowserRouter {...props} useTransitions={false} />\n",
        },
        {
          source:
            "import { BrowserRouter } from 'react-router'\nconst props = { useTransitions: true }\nexport const app = <BrowserRouter useTransitions={false} {...props} />\n",
          output:
            "import { BrowserRouter } from 'react-router'\nconst props = { useTransitions: true }\nexport const app = <BrowserRouter {...props} useTransitions={false} />\n",
        },
      ]
      for (const { source, output } of cases) {
        const [fixed] = await fixer.lintText(source, { filePath: 'app.tsx' })
        expect(fixed.output).toBe(output)
        expect(fixed.messages).toEqual([])
      }
    })
  })
})
