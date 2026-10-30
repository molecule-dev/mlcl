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

import { copyFile, mkdtemp, readFile, rm, symlink } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { ESLint } from 'eslint'
import ts from 'typescript'
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
    const ruleId = 'molecule-local/router-commits-with-url'
    const bond = '@molecule/app-routing-react-router'

    const fixer = (): ESLint =>
      new ESLint({
        cwd: dir,
        overrideConfigFile: join(dir, 'eslint.config.mjs'),
        overrideConfig: { languageOptions: { parserOptions: { tsconfigRootDir: dir } } },
        fix: true,
      })

    const expectFixed = async (source: string, output: string): Promise<void> => {
      const [before] = await eslint.lintText(source, { filePath: 'app.tsx' })
      const messages = before.messages.filter((message) => message.ruleId === ruleId)
      expect(messages).toHaveLength(1)
      expect(messages[0]).toMatchObject({ severity: 2 })
      expect(messages[0]?.message).toContain(bond)
      expect(messages[0]?.message).toContain('URL and rendered page')

      const [fixed] = await fixer().lintText(source, { filePath: 'app.tsx' })
      expect(fixed.output).toBe(output)
      expect(fixed.messages).toEqual([])

      const [reparsed] = await eslint.lintText(output, { filePath: 'app.tsx' })
      expect(reparsed.messages).toEqual([])
      const transpiled = ts.transpileModule(output, {
        fileName: 'app.tsx',
        reportDiagnostics: true,
        compilerOptions: { jsx: ts.JsxEmit.Preserve, target: ts.ScriptTarget.ESNext },
      })
      expect(transpiled.diagnostics).toEqual([])
    }

    const expectReportedWithoutFix = async (source: string): Promise<void> => {
      const [before] = await eslint.lintText(source, { filePath: 'app.tsx' })
      const messages = before.messages.filter((message) => message.ruleId === ruleId)
      expect(messages).toHaveLength(1)
      expect(messages[0]).not.toHaveProperty('fix')
      expect(messages[0]?.message).toContain('namespace uses are not tracked')
      const [fixed] = await fixer().lintText(source, { filePath: 'app.tsx' })
      expect(fixed.output).toBeUndefined()
    }

    const expectNoRouterReport = async (source: string): Promise<void> => {
      const [result] = await eslint.lintText(source, { filePath: 'app.tsx' })
      expect(result.messages.filter((message) => message.ruleId === ruleId)).toEqual([])
    }

    describe('Sol regressions on 670e25510', () => {
      it('1: moves the import without corrupting JSX type arguments', async () => {
        await expectFixed(
          "import { BrowserRouter } from 'react-router'; // @ts-expect-error -- generic JSX regression\nexport const app = <BrowserRouter<unknown> />\n",
          `import { BrowserRouter } from '${bond}'; // @ts-expect-error -- generic JSX regression\nexport const app = <BrowserRouter<unknown> />\n`,
        )
      })

      it('2: moves RouterProvider from react-router/dom', async () => {
        await expectFixed(
          "import { RouterProvider } from 'react-router/dom';\nexport const app = <RouterProvider router={router} />\n",
          `import { RouterProvider } from '${bond}';\nexport const app = <RouterProvider router={router} />\n`,
        )
      })

      it('3: moves the import used through a const alias', async () => {
        await expectFixed(
          "import { BrowserRouter } from 'react-router';\nconst AppRouter = BrowserRouter;\nexport const app = <AppRouter />\n",
          `import { BrowserRouter } from '${bond}';\nconst AppRouter = BrowserRouter;\nexport const app = <AppRouter />\n`,
        )
      })

      it.each(['_Router', '$Router', 'ÉRouter'])(
        '4: preserves the %s import alias',
        async (alias) => {
          await expectFixed(
            `import { BrowserRouter as ${alias} } from 'react-router'\nexport const app = <${alias} />\n`,
            `import { BrowserRouter as ${alias} } from '${bond}'\nexport const app = <${alias} />\n`,
          )
        },
      )

      it('5: moves the import without inspecting a computed spread key', async () => {
        await expectFixed(
          "import { BrowserRouter } from 'react-router'\nRegExp.prototype.toString = () => 'useTransitions'\nexport const app = <BrowserRouter useTransitions={false} {...{ [/x/]: true }} />\n",
          `import { BrowserRouter } from '${bond}'\nRegExp.prototype.toString = () => 'useTransitions'\nexport const app = <BrowserRouter useTransitions={false} {...{ [/x/]: true }} />\n`,
        )
      })
    })

    it('splits a mixed import and moves only router specifiers in order', async () => {
      await expectFixed(
        "import { BrowserRouter as B, Link, RouterProvider, Routes, useNavigate } from 'react-router'\nexport const app = <B><Routes /></B>\nexport { Link, RouterProvider, useNavigate }\n",
        `import { Link, Routes, useNavigate } from 'react-router'\n\nimport { BrowserRouter as B, RouterProvider } from '${bond}'\nexport const app = <B><Routes /></B>\nexport { Link, RouterProvider, useNavigate }\n`,
      )
    })

    it.each([
      'HashRouter',
      'MemoryRouter',
      'Router',
      'RouterProvider',
      'HydratedRouter',
      'unstable_HistoryRouter',
    ])('moves %s from every supported react-router entry point', async (component) => {
      for (const entryPoint of ['react-router', 'react-router-dom', 'react-router/dom']) {
        await expectFixed(
          `import { ${component} } from '${entryPoint}'\nexport { ${component} }\n`,
          `import { ${component} } from '${bond}'\nexport { ${component} }\n`,
        )
      }
    })

    it.each(['react-router', 'react-router-dom', 'react-router/dom'])(
      'reports a namespace import from %s without a fix',
      async (entryPoint) => {
        await expectReportedWithoutFix(
          `import * as RR from '${entryPoint}'\nexport const app = <RR.BrowserRouter />\n`,
        )
      },
    )

    it('leaves non-router react-router imports untouched', async () => {
      await expectNoRouterReport(
        "import { Link, Routes, useNavigate } from 'react-router'\nexport { Link, Routes, useNavigate }\n",
      )
    })

    it('leaves a local component named BrowserRouter untouched', async () => {
      await expectNoRouterReport(
        'const BrowserRouter = () => <div />\nexport const router = <BrowserRouter />\n',
      )
    })

    it('leaves type-only router imports untouched', async () => {
      await expectNoRouterReport(
        "import type { BrowserRouter } from 'react-router'\nimport { type RouterProvider, Routes } from 'react-router/dom'\nexport type { BrowserRouter, RouterProvider }\nexport { Routes }\n",
      )
    })

    it('does not report a template that does not use react-router', async () => {
      const source = await readFile(
        fileURLToPath(new URL('../../../templates/app/vue/main.ts.tpl', import.meta.url)),
        'utf8',
      )
      await expectNoRouterReport(source)
    })
  })
})
