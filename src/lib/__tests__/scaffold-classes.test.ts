/**
 * The scaffold check's `classes` step (scripts/scaffold-classes.mjs): every class an app's bonded
 * ClassMap returns must have a style in the app's own build. These cover how it reads the three
 * inputs (the CSS, the bond files, the ClassMap) and its verdict on a built web app.
 */
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  bondedClassMapPackage,
  checkScaffoldClasses,
  classMapClasses,
  classNamesInCss,
  nativeStyledClasses,
} from '../../../scripts/scaffold-classes.mjs'

const dirs: string[] = []

/**
 * A directory of files, removed after the test.
 *
 * @param files - Relative path → contents.
 * @returns The directory.
 */
function fixture(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'mlcl-scaffold-classes-'))
  dirs.push(dir)
  for (const [path, contents] of Object.entries(files)) {
    mkdirSync(join(dir, path, '..'), { recursive: true })
    writeFileSync(join(dir, path), contents)
  }
  return dir
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('classNamesInCss', () => {
  it('unescapes the class names that rules select, nested, minified or in at-rules', () => {
    const css = [
      '/* .not-a-class { } */',
      '.hover\\:bg-surface:hover{background-color:var(--color-surface)}',
      '@media (min-width:40rem){.sm\\:flex-row{flex-direction:row}}',
      '.bg-success\\/25 { background-color: rgb(var(--color-success-rgb) / 0.25); }',
      '.data-\\[state\\=open\\]\\:animate-in[data-state=open] { animation: mol-enter 150ms }',
      '.\\32 xl\\:p-4 { padding: 1rem }',
      '.card { &:hover { opacity: 0.5 } .title { margin: 0.5rem } }',
      '.icon::before { content: ".fake{" }',
      ':where(.dark, .dark *) { color-scheme: dark }',
    ].join('\n')
    expect([...classNamesInCss(css)].sort()).toEqual(
      [
        'bg-success/25',
        'card',
        'dark',
        'data-[state=open]:animate-in',
        'hover:bg-surface',
        'icon',
        'sm:flex-row',
        'title',
        '2xl:p-4',
      ].sort(),
    )
  })
})

describe('bondedClassMapPackage', () => {
  it('names the package the bond file passes to setClassMap', () => {
    const app = fixture({
      'src/bonds/app-theme-css-variables.ts': "import { setProvider } from '@molecule/app-theme'\n",
      'src/bonds/app-ui-nativewind.ts':
        "import { setClassMap } from '@molecule/app-ui'\nimport { classMap } from '@molecule/app-ui-nativewind'\n\nexport function setupAppUiNativewind(): void {\n  setClassMap(classMap)\n}\n",
    })
    expect(bondedClassMapPackage(app)).toBe('@molecule/app-ui-nativewind')
    expect(bondedClassMapPackage(fixture({ 'src/main.ts': '' }))).toBeUndefined()
  })
})

describe('classMapClasses', () => {
  it('takes string entries and option-free function calls, each class once', () => {
    const classMap = {
      cn: (...classes: string[]) => classes.join(' '),
      card: 'rounded-xl border border-border bg-surface',
      button: (opts?: { variant?: string }) => `inline-flex bg-${opts?.variant ?? 'primary'}`,
      gap: (scale?: number) => `gap-${scale}`,
      needsArgument: (opts: { size: string }) => `text-${opts.size}`,
      surface: 'bg-surface',
    }
    expect(classMapClasses(classMap)).toEqual([
      'rounded-xl',
      'border',
      'border-border',
      'bg-surface',
      'inline-flex',
      'bg-primary',
    ])
  })
})

describe('nativeStyledClasses', () => {
  it("reads NativeWind's rules as an object (0.2.x) or a Map", () => {
    const rules = { 'bg-surface': [{}], 'gap-y-2': [{}] }
    expect([...nativeStyledClasses({ rules })]).toEqual(['bg-surface', 'gap-y-2'])
    expect([...nativeStyledClasses({ rules: new Map(Object.entries(rules)) })]).toEqual([
      'bg-surface',
      'gap-y-2',
    ])
    expect(nativeStyledClasses({}).size).toBe(0)
  })
})

describe('checkScaffoldClasses on a built web app', () => {
  /**
   * A built web app whose ClassMap returns two classes.
   *
   * @param css - What the build wrote.
   * @returns The app directory.
   */
  const webApp = (css: string): string =>
    fixture({
      'src/bonds/app-ui-tailwind.ts':
        "import { setClassMap } from '@molecule/app-ui'\nimport { classMap } from '@molecule/app-ui-tailwind'\n",
      'node_modules/@molecule/app-ui-tailwind/dist/index.js':
        "export const classMap = { card: 'bg-surface-container text-on-surface' }\n",
      'dist/assets/index-abc.css': css,
    })

  it('fails naming each class the built CSS has no rule for', async () => {
    const result = await checkScaffoldClasses(
      webApp('.bg-surface-container{background-color:var(--color-surface-container)}'),
    )
    expect(result.ok).toBe(false)
    expect(result.output).toContain('dist/ CSS: 1 of 2 classes of @molecule/app-ui-tailwind')
    expect(result.output).toContain('text-on-surface')
    expect(result.output).toContain("imports '@molecule/app-ui-tailwind/base.css'")
  })

  it('passes when every class has a rule', async () => {
    const result = await checkScaffoldClasses(
      webApp('.bg-surface-container{background:red}.text-on-surface{color:blue}'),
    )
    expect(result).toEqual({
      ok: true,
      output: 'all 2 classes of @molecule/app-ui-tailwind have a style',
    })
  })
})

describe('checkScaffoldClasses on a NativeWind app', () => {
  /**
   * A NativeWind app whose ClassMap returns one class and whose `tailwindcss` writes it a rule.
   *
   * @param compiler - The source of its `react-native-css-interop/css-to-rn`, when installed.
   * @returns The app directory.
   */
  const nativeApp = (compiler?: string, descendant = false): string => {
    const css = descendant
      ? '.bg-surface{color:red} .\\[\\&_p\\]\\:leading-relaxed p{line-height:1.5}'
      : '.bg-surface{color:red}'
    const dir = fixture({
      'package.json': JSON.stringify({ dependencies: { nativewind: '4.2.7' } }),
      'tailwind.config.js': 'module.exports = {}\n',
      'src/bonds/app-ui-nativewind.ts':
        "import { setClassMap } from '@molecule/app-ui'\nimport { classMap } from '@molecule/app-ui-nativewind'\n",
      'node_modules/@molecule/app-ui-nativewind/dist/index.js': descendant
        ? "export const classMap = { card: 'bg-surface [&_p]:leading-relaxed', splitForNative: (cls) => cls === '[&_p]:leading-relaxed' ? { descendants: { p: 'leading-relaxed' } } : {} }\n"
        : "export const classMap = { card: 'bg-surface' }\n",
      'node_modules/.bin/tailwindcss': `#!/usr/bin/env node\nconst out = process.argv[process.argv.indexOf('-o') + 1]\nrequire('node:fs').writeFileSync(out, ${JSON.stringify(css)})\n`,
      ...(compiler
        ? {
            'node_modules/react-native-css-interop/package.json': JSON.stringify({
              name: 'react-native-css-interop',
              exports: { './css-to-rn': './css-to-rn.js' },
            }),
            'node_modules/react-native-css-interop/css-to-rn.js': compiler,
          }
        : {}),
    })
    chmodSync(join(dir, 'node_modules', '.bin', 'tailwindcss'), 0o755)
    return dir
  }

  it('requires the compiled styles the ClassMap forwards to child elements', async () => {
    const result = await checkScaffoldClasses(
      nativeApp(
        "exports.cssToReactNativeRuntime = () => ({ rules: { 'bg-surface': [], 'leading-relaxed': [] } })",
        true,
      ),
    )
    expect(result.ok).toBe(true)

    const missing = await checkScaffoldClasses(
      nativeApp("exports.cssToReactNativeRuntime = () => ({ rules: { 'bg-surface': [] } })", true),
    )
    expect(missing.ok).toBe(false)
    expect(missing.output).toContain('leading-relaxed')
  })

  it("asks the app's own NativeWind compiler whether a device styles each class", async () => {
    const styled = await checkScaffoldClasses(
      nativeApp("exports.cssToReactNativeRuntime = () => ({ rules: { 'bg-surface': [{}] } })\n"),
    )
    expect(styled).toEqual({
      ok: true,
      output: 'all 1 classes of @molecule/app-ui-nativewind have a style',
    })
    const unstyled = await checkScaffoldClasses(
      nativeApp('exports.cssToReactNativeRuntime = () => ({ rules: {} })\n'),
    )
    expect(unstyled.ok).toBe(false)
    expect(unstyled.output).toContain('NativeWind on a device: 1 of 1 classes')
  })

  it('fails a NativeWind app whose device compiler does not resolve, instead of skipping it', async () => {
    const result = await checkScaffoldClasses(nativeApp())
    expect(result.ok).toBe(false)
    expect(result.output).toContain(
      'the app depends on nativewind but react-native-css-interop/css-to-rn',
    )
  })
})
