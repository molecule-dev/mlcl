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

    const expectFixed = async (source: string, output: string): Promise<void> => {
      const fixer = new ESLint({
        cwd: dir,
        overrideConfigFile: join(dir, 'eslint.config.mjs'),
        overrideConfig: { languageOptions: { parserOptions: { tsconfigRootDir: dir } } },
        fix: true,
      })
      const [fixed] = await fixer.lintText(source, { filePath: 'app.tsx' })
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
      const fixer = new ESLint({
        cwd: dir,
        overrideConfigFile: join(dir, 'eslint.config.mjs'),
        overrideConfig: { languageOptions: { parserOptions: { tsconfigRootDir: dir } } },
        fix: true,
      })
      const [fixed] = await fixer.lintText(source, { filePath: 'app.tsx' })
      expect(fixed.output).toBeUndefined()
    }

    describe('Sol regressions', () => {
      it('1: does not report a safe router re-export barrel', async () => {
        const [barrel] = await eslint.lintText("export { BrowserRouter } from 'react-router'\n", {
          filePath: 'routing.ts',
        })
        const [app] = await eslint.lintText(
          "import { BrowserRouter } from './routing'\nexport const app = <BrowserRouter useTransitions={false} />\n",
          { filePath: 'app.tsx' },
        )
        expect(barrel.messages).toEqual([])
        expect(app.messages).toEqual([])
      })

      it('2: allows a false prop followed by a harmless object-literal spread', async () => {
        const [result] = await eslint.lintText(
          "import { BrowserRouter } from 'react-router'\nexport const app = <BrowserRouter useTransitions={false} {...{ basename: '/app' }} />\n",
          { filePath: 'app.tsx' },
        )
        expect(result.messages).toEqual([])
      })

      it('3: replaces a literal value without joining the next attribute to the router name', async () => {
        await expectFixed(
          "import { BrowserRouter } from 'react-router'\nexport const app = <BrowserRouter useTransitions={true}basename='/app' />\n",
          "import { BrowserRouter } from 'react-router'\nexport const app = <BrowserRouter useTransitions={false}basename='/app' />\n",
        )
      })

      it('4: walks past a type parameter to the outer runtime router import', async () => {
        await expectFixed(
          "import { BrowserRouter } from 'react-router'\nexport function App<BrowserRouter>(value: BrowserRouter) { return <BrowserRouter>{String(value)}</BrowserRouter> }\n",
          "import { BrowserRouter } from 'react-router'\nexport function App<BrowserRouter>(value: BrowserRouter) { return <BrowserRouter useTransitions={false}>{String(value)}</BrowserRouter> }\n",
        )
      })

      it('5: does not autofix an effectful expression', async () => {
        await expectReportedWithoutFix(
          "import { BrowserRouter } from 'react-router'\nconst seen: string[] = []\nexport const app = <BrowserRouter useTransitions={(seen.push('nav'), false)} basename={'/' + seen.length} />\n",
        )
      })

      it('6: never treats a lowercase JSX tag as a router alias', async () => {
        const [result] = await eslint.lintText(
          'import { BrowserRouter as a } from \'react-router\'\nexport { a }\nexport const link = <a href="/">Home</a>\n',
          { filePath: 'app.tsx' },
        )
        expect(result.messages).toEqual([])
      })
    })

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
        name: 'a HashRouter with no prop',
        source: "import { HashRouter } from 'react-router'\nexport const app = <HashRouter />\n",
      },
      {
        name: 'a namespaced MemoryRouter from react-router-dom',
        source: "import * as RR from 'react-router-dom'\nexport const app = <RR.MemoryRouter />\n",
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
        name: 'a local component named BrowserRouter',
        source: 'const BrowserRouter = () => <div />\nexport const router = <BrowserRouter />\n',
        filePath: 'app.tsx',
      },
      {
        name: 'a generic Router imported from react-router',
        source: "import { Router } from 'react-router'\nexport const router = <Router />\n",
        filePath: 'app.tsx',
      },
      {
        name: 'a namespace import from react-router/dom',
        source:
          "import * as RR from 'react-router/dom'\nexport const app = <RR.RouterProvider />\n",
        filePath: 'app.tsx',
      },
      {
        name: 'a type-only router import',
        source:
          "import type { BrowserRouter } from 'react-router'\nexport const app = <BrowserRouter />\n",
        filePath: 'app.tsx',
      },
      {
        name: 'a type-only named router specifier',
        source:
          "import { type BrowserRouter, Routes } from 'react-router'\nexport const app = <Routes><BrowserRouter /></Routes>\n",
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
    ])('ignores export declarations: %s', async (source) => {
      const [result] = await eslint.lintText(source, { filePath: 'routing.ts' })
      expect(result.messages).toEqual([])
    })

    it.each([
      {
        name: 'a missing prop',
        source:
          "import { BrowserRouter } from 'react-router'\nexport const app = <BrowserRouter />\n",
        output:
          "import { BrowserRouter } from 'react-router'\nexport const app = <BrowserRouter useTransitions={false} />\n",
      },
      {
        name: 'a missing prop after another attribute',
        source:
          "import { BrowserRouter } from 'react-router'\nexport const app = <BrowserRouter basename='/app' />\n",
        output:
          "import { BrowserRouter } from 'react-router'\nexport const app = <BrowserRouter basename='/app' useTransitions={false} />\n",
      },
      {
        name: 'a literal true',
        source:
          "import { BrowserRouter } from 'react-router'\nexport const app = <BrowserRouter useTransitions={true} />\n",
        output:
          "import { BrowserRouter } from 'react-router'\nexport const app = <BrowserRouter useTransitions={false} />\n",
      },
      {
        name: 'a string literal',
        source:
          "import { BrowserRouter } from 'react-router'\nexport const app = <BrowserRouter useTransitions='yes' />\n",
        output:
          "import { BrowserRouter } from 'react-router'\nexport const app = <BrowserRouter useTransitions={false} />\n",
      },
      {
        name: 'a number literal',
        source:
          "import { BrowserRouter } from 'react-router'\nexport const app = <BrowserRouter useTransitions={1} />\n",
        output:
          "import { BrowserRouter } from 'react-router'\nexport const app = <BrowserRouter useTransitions={false} />\n",
      },
      {
        name: 'a missing prop after a spread',
        source:
          "import { BrowserRouter } from 'react-router'\nconst props = { useTransitions: true }\nexport const app = <BrowserRouter {...props} />\n",
        output:
          "import { BrowserRouter } from 'react-router'\nconst props = { useTransitions: true }\nexport const app = <BrowserRouter {...props} useTransitions={false} />\n",
      },
      {
        name: 'a literal before a harmless spread',
        source:
          "import { BrowserRouter } from 'react-router'\nexport const app = <BrowserRouter useTransitions={true} {...{ basename: '/app' }} />\n",
        output:
          "import { BrowserRouter } from 'react-router'\nexport const app = <BrowserRouter useTransitions={false} {...{ basename: '/app' }} />\n",
      },
      {
        name: 'the plain l539 BrowserRouter shape',
        source:
          "import { BrowserRouter, Route, Routes } from 'react-router'\nexport const app = <BrowserRouter><Routes><Route path='/' element={<div />} /></Routes></BrowserRouter>\n",
        output:
          "import { BrowserRouter, Route, Routes } from 'react-router'\nexport const app = <BrowserRouter useTransitions={false}><Routes><Route path='/' element={<div />} /></Routes></BrowserRouter>\n",
      },
    ])('autofixes $name and reparses the output', async ({ source, output }) => {
      await expectFixed(source, output)
    })

    it.each([
      {
        name: 'a bare prop',
        source:
          "import { BrowserRouter } from 'react-router'\nexport const app = <BrowserRouter useTransitions />\n",
      },
      {
        name: 'a non-literal value',
        source:
          "import { BrowserRouter } from 'react-router'\nconst props = { useTransitions: true }\nexport const app = <BrowserRouter useTransitions={props.useTransitions} />\n",
      },
      {
        name: 'a literal value followed by an overriding spread',
        source:
          "import { BrowserRouter } from 'react-router'\nconst props = { useTransitions: true }\nexport const app = <BrowserRouter useTransitions={true} {...props} />\n",
      },
      {
        name: 'false followed by an overriding spread',
        source:
          "import { BrowserRouter } from 'react-router'\nexport const app = <BrowserRouter useTransitions={false} {...{ useTransitions: true }} />\n",
      },
      {
        name: 'a non-const assertion',
        source:
          "import { BrowserRouter } from 'react-router'\nexport const app = <BrowserRouter useTransitions={false as boolean} />\n",
      },
    ])('reports $name without an autofix', async ({ source }) => {
      await expectReportedWithoutFix(source)
    })
  })
})
