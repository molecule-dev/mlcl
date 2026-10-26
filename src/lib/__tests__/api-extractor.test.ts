import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, describe, expect, it } from 'vitest'

import { extractPackageApi } from '../api-extractor.js'

// ---------------------------------------------------------------------------
// Temp directory management
// ---------------------------------------------------------------------------
const tempDirs: string[] = []

/** A fresh temp package directory with an empty `src/`, cleaned up after the suite. */
async function createTempDir(prefix: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), `api-extractor-test-${prefix}-`))
  tempDirs.push(dir)
  await mkdir(join(dir, 'src'), { recursive: true })
  return dir
}

async function createTempPackage(prefix: string, indexContent: string): Promise<string> {
  const dir = await createTempDir(prefix)
  await writeFile(join(dir, 'src', 'index.ts'), indexContent)
  return dir
}

afterAll(async () => {
  for (const dir of tempDirs) {
    await rm(dir, { recursive: true, force: true })
  }
})

// ============================================================================
// extractPackageApi
// ============================================================================
describe('extractPackageApi', () => {
  it.each([false, true])(
    'retains authored types with dependency declarations installed=%s',
    async (installed) => {
      const dir = await createTempPackage('authored-types', "export * from './public.js'\n")
      await writeFile(
        join(dir, 'src/public.ts'),
        `
import type { Box } from 'foreign-doc-types'
export function own(value: Box): Box { return value }
export const arrow = (value: Box): Box => value
export const typed: Box = {} as Box
export const inferred = (value = 1) => ({ value, label: 'ok' })
`,
      )
      if (installed) {
        const dependency = join(dir, 'node_modules/foreign-doc-types')
        await mkdir(dependency, { recursive: true })
        await writeFile(
          join(dependency, 'package.json'),
          JSON.stringify({ name: 'foreign-doc-types', types: 'index.d.ts' }),
        )
        await writeFile(
          join(dependency, 'index.d.ts'),
          'export interface Events { changed: true }\nexport interface Box<T = Events> { value: T }\nexport declare const foreignOnly: string\n',
        )
      }
      const result = extractPackageApi(dir)
      expect(result.exports.map((item) => item.name)).not.toContain('foreignOnly')
      for (const name of ['own', 'arrow']) {
        const item = result.exports.find((entry) => entry.name === name)!
        expect(item.signature).toBe('(value: Box) => Box')
        expect(item.declaration).toBe(`function ${name}(value: Box): Box`)
        expect(item.params?.[0].type).toBe('Box')
        expect(item.returnType).toBe('Box')
        expect(item.sourceFile).toBe('public.ts')
      }
      expect(result.exports.find((item) => item.name === 'typed')?.declaration).toBe(
        'const typed: Box',
      )
      const inferred = result.exports.find((item) => item.name === 'inferred')!
      expect(inferred.params?.[0].type).toBe('number')
      expect(inferred.returnType).toContain('value: number')
      expect(inferred.returnType).toContain('label: string')
    },
  )

  it('retains callable generic constraints and defaults for functions and arrows', async () => {
    const dir = await createTempPackage(
      'callable-generics',
      `
export function identity<T extends string = string>(value: T): T { return value }
export const arrow = <T extends string = string>(value: T): T => value
`,
    )
    const result = extractPackageApi(dir)
    for (const name of ['identity', 'arrow']) {
      const item = result.exports.find((entry) => entry.name === name)!
      expect(item.signature).toBe('<T extends string = string>(value: T) => T')
      expect(item.declaration).toBe(`function ${name}<T extends string = string>(value: T): T`)
    }
  })

  it('returns empty exports when index.ts does not exist', () => {
    const result = extractPackageApi('/nonexistent/path')
    expect(result.exports).toEqual([])
    expect(result.description).toBeUndefined()
  })

  it('extracts function declarations with params and return types', async () => {
    const dir = await createTempPackage(
      'fn',
      `/**
 * Add two numbers.
 * @param a - First number
 * @param b - Second number
 * @returns The sum
 */
export function add(a: number, b: number): number {
  return a + b
}
`,
    )

    const result = extractPackageApi(dir)
    const fn = result.exports.find((e) => e.name === 'add')
    expect(fn).toBeDefined()
    expect(fn!.kind).toBe('function')
    expect(fn!.description).toBe('Add two numbers.')
    expect(fn!.params).toHaveLength(2)
    expect(fn!.params![0].name).toBe('a')
    expect(fn!.params![1].name).toBe('b')
    expect(fn!.returnType).toBe('number')
    expect(fn!.returnDescription).toBe('The sum')
  })

  it('extracts interface declarations', async () => {
    const dir = await createTempPackage(
      'iface',
      `export interface Config<T> {
  key: string
  value: T
}
`,
    )

    const result = extractPackageApi(dir)
    const iface = result.exports.find((e) => e.name === 'Config')
    expect(iface).toBeDefined()
    expect(iface!.kind).toBe('interface')
    expect(iface!.signature).toContain('interface Config<T>')
  })

  it('extracts type alias declarations', async () => {
    const dir = await createTempPackage(
      'type',
      `export type Status = 'active' | 'inactive' | 'pending'
`,
    )

    const result = extractPackageApi(dir)
    const type = result.exports.find((e) => e.name === 'Status')
    expect(type).toBeDefined()
    expect(type!.kind).toBe('type')
  })

  it('extracts const exports', async () => {
    const dir = await createTempPackage(
      'const',
      `export const MAX_RETRIES = 3
`,
    )

    const result = extractPackageApi(dir)
    const c = result.exports.find((e) => e.name === 'MAX_RETRIES')
    expect(c).toBeDefined()
    expect(c!.kind).toBe('const')
  })

  it('resolves Node ambient globals (Buffer) instead of collapsing to any', async () => {
    // Regression guard: the ts-morph Project must load @types/node's ambient
    // globals (compilerOptions.types includes 'node'). Without it, any signature
    // referencing the global `Buffer` collapses to `any` in the generated
    // README.md, which strips type information the AI executor relies on.
    const dir = await createTempPackage(
      'node-globals',
      `/** @module */
export const SIGNING_KEY: string | Buffer = 'placeholder'
`,
    )

    const result = extractPackageApi(dir)
    const c = result.exports.find((e) => e.name === 'SIGNING_KEY')
    expect(c).toBeDefined()
    const text = `${c!.declaration ?? ''}${c!.signature ?? ''}`
    expect(text).toContain('Buffer')
    expect(text).not.toMatch(/:\s*any\b/)
  })

  it('recognizes arrow functions as function kind', async () => {
    const dir = await createTempPackage(
      'arrow',
      `/**
 * Greet someone.
 */
export const greet = (name: string): string => \`Hello \${name}\`
`,
    )

    const result = extractPackageApi(dir)
    const fn = result.exports.find((e) => e.name === 'greet')
    expect(fn).toBeDefined()
    expect(fn!.kind).toBe('function')
    expect(fn!.description).toBe('Greet someone.')
  })

  it('extracts enum declarations', async () => {
    const dir = await createTempPackage(
      'enum',
      `export enum Color {
  Red = 'red',
  Green = 'green',
  Blue = 'blue',
}
`,
    )

    const result = extractPackageApi(dir)
    const e = result.exports.find((ex) => ex.name === 'Color')
    expect(e).toBeDefined()
    expect(e!.kind).toBe('enum')
    expect(e!.signature).toContain('enum Color')
    expect(e!.signature).toContain('Red')
  })

  it('extracts module-level JSDoc with @module tag', async () => {
    const dir = await createTempPackage(
      'module-jsdoc',
      `/**
 * This is the module description.
 *
 * @module
 */

export const foo = 1
`,
    )

    const result = extractPackageApi(dir)
    expect(result.description).toBe('This is the module description.')
  })

  it('extracts @example blocks from module JSDoc', async () => {
    const dir = await createTempPackage(
      'example',
      `/**
 * A utility module.
 *
 * @example
 * import { foo } from './index'
 * console.log(foo)
 *
 * @module
 */

export const foo = 42
`,
    )

    const result = extractPackageApi(dir)
    expect(result.examples).toBeDefined()
    expect(result.examples!.length).toBeGreaterThanOrEqual(1)
    expect(result.examples![0]).toContain('import { foo }')
  })

  it('extracts @e2e block from module JSDoc', async () => {
    const dir = await createTempPackage(
      'e2e',
      `/**
 * A utility module.
 *
 * @e2e
 * When integrated, verify:
 * - a user can sign up and log back in
 * - the session survives a page reload
 *
 * @module
 */

export const foo = 42
`,
    )

    const result = extractPackageApi(dir)
    expect(result.e2e).toBeDefined()
    expect(result.e2e).toContain('sign up and log back in')
    expect(result.e2e).toContain('survives a page reload')
    expect(result.e2e).not.toContain('@module')
  })

  it('keeps @remarks and @e2e separate when both are present', async () => {
    const dir = await createTempPackage(
      'remarks-e2e',
      `/**
 * A utility module.
 *
 * @remarks
 * Requires PostgreSQL 14+.
 *
 * @e2e
 * Verify the upload flow:
 * - pick a file, see a progress bar, then the file in the list
 *
 * @module
 */

export const foo = 42
`,
    )

    const result = extractPackageApi(dir)
    expect(result.remarks).toBe('Requires PostgreSQL 14+.')
    expect(result.remarks).not.toContain('upload flow')
    expect(result.e2e).toContain('pick a file, see a progress bar')
    expect(result.e2e).not.toContain('PostgreSQL')
  })

  it('detects @deprecated tag', async () => {
    const dir = await createTempPackage(
      'deprecated',
      `/**
 * Old function.
 * @deprecated Use newFn instead.
 */
export function oldFn(): void {}
`,
    )

    const result = extractPackageApi(dir)
    const fn = result.exports.find((e) => e.name === 'oldFn')
    expect(fn).toBeDefined()
    expect(fn!.deprecated).toBe(true)
  })

  it('sorts exports by kind: interfaces, types, enums, functions, constants', async () => {
    const dir = await createTempPackage(
      'sort',
      `export const VALUE = 1
export function doSomething(): void {}
export type MyType = string
export interface MyInterface { x: number }
export enum MyEnum { A, B }
`,
    )

    const result = extractPackageApi(dir)
    const kinds = result.exports.map((e) => e.kind)
    const order = ['interface', 'type', 'enum', 'function', 'const']
    // Verify that earlier kinds come before later kinds
    for (let i = 0; i < kinds.length - 1; i++) {
      expect(order.indexOf(kinds[i])).toBeLessThanOrEqual(order.indexOf(kinds[i + 1]))
    }
  })

  it('handles re-exports from other files', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'api-extractor-test-reexport-'))
    tempDirs.push(dir)
    const srcDir = join(dir, 'src')
    await mkdir(srcDir, { recursive: true })

    await writeFile(
      join(srcDir, 'utils.ts'),
      `export function helper(): string { return 'help' }\n`,
    )
    await writeFile(
      join(srcDir, 'index.ts'),
      `export { helper } from './utils.js'\nexport const main = true\n`,
    )

    const result = extractPackageApi(dir)
    const helperExport = result.exports.find((e) => e.name === 'helper')
    const mainExport = result.exports.find((e) => e.name === 'main')
    expect(helperExport).toBeDefined()
    expect(mainExport).toBeDefined()
  })

  it('extracts @param descriptions from JSDoc tags', async () => {
    const dir = await createTempPackage(
      'params',
      `/**
 * Connect to a database.
 * @param url - Connection string
 * @param options - Connection options
 */
export function connect(url: string, options?: { timeout: number }): void {}
`,
    )

    const result = extractPackageApi(dir)
    const fn = result.exports.find((e) => e.name === 'connect')
    expect(fn).toBeDefined()
    expect(fn!.params).toBeDefined()
    const urlParam = fn!.params!.find((p) => p.name === 'url')
    expect(urlParam).toBeDefined()
    expect(urlParam!.description).toBe('Connection string')
  })

  it('normalizes eslint-generated destructured-param placeholders (root0 → props)', async () => {
    // `jsdoc/require-param` auto-names an inline-destructured param `({ a }: P)`
    // `root0` and its members `root0.a`; the generated docs must never leak that.
    const dir = await createTempPackage(
      'destructured',
      `/**
 * Toast provider.
 * @param root0 - The component props.
 * @param root0.children - The children to render.
 * @param root0.position - The default position.
 */
export function ToastProvider({
  children,
  position = 'top',
}: {
  children: unknown
  position?: string
}): void {}
`,
    )

    const result = extractPackageApi(dir)
    const fn = result.exports.find((e) => e.name === 'ToastProvider')
    expect(fn).toBeDefined()
    const names = fn!.params!.map((p) => p.name)
    // No `root0` survives — the umbrella becomes `props`, members `props.<field>`.
    expect(names).not.toContain('root0')
    expect(names).toContain('props')
    expect(names).toContain('props.children')
    expect(names).toContain('props.position')
    // The member description is clean — the leading `.children -` artifact that a
    // bare `\w+` name capture would strand is gone.
    const childrenParam = fn!.params!.find((p) => p.name === 'props.children')
    expect(childrenParam!.description).toBe('The children to render.')
  })

  it('normalizes a destructured param with no JSDoc (fallback path) to props', async () => {
    const dir = await createTempPackage(
      'destructured-nojsdoc',
      `export function Widget({ a, b }: { a: number; b: string }): void {}
`,
    )

    const result = extractPackageApi(dir)
    const fn = result.exports.find((e) => e.name === 'Widget')
    expect(fn).toBeDefined()
    expect(fn!.params!.map((p) => p.name)).not.toContain('__0')
    expect(fn!.params![0].name).toBe('props')
  })

  it('extracts full declaration text for code blocks', async () => {
    const dir = await createTempPackage(
      'declaration',
      `export interface Options {
  /** Timeout in ms */
  timeout: number
  retries?: number
}
`,
    )

    const result = extractPackageApi(dir)
    const iface = result.exports.find((e) => e.name === 'Options')
    expect(iface).toBeDefined()
    expect(iface!.declaration).toBeDefined()
    expect(iface!.declaration).toContain('timeout: number')
    expect(iface!.declaration).toContain('retries?: number')
  })

  it('extracts a class with its declaration and constructor params', async () => {
    const dir = await createTempPackage(
      'class',
      `/**
 * A pooled client.
 * @param url - Where to connect.
 * @returns A ready client.
 */
export class Client {
  constructor(url: string) {}
}
`,
    )

    const result = extractPackageApi(dir)
    const cls = result.exports.find((e) => e.name === 'Client')
    expect(cls).toBeDefined()
    expect(cls!.kind).toBe('class')
    expect(cls!.signature).toBe('class Client')
    // A class's methods ARE its API, so the raw declaration is carried.
    expect(cls!.declaration).toContain('constructor(url: string)')
    expect(cls!.params![0].description).toBe('Where to connect.')
    expect(cls!.returnDescription).toBe('A ready client.')
  })

  it('extracts namespace members with the same detail as top-level exports', async () => {
    const dir = await createTempDir('ns-members')
    await writeFile(
      join(dir, 'src', 'authorization.ts'),
      `/**
 * Evict one device from the exists-cache.
 * @param deviceId - The device id to drop.
 * @returns Nothing.
 */
export const invalidateDeviceExistsCache = (deviceId: string): void => {}

/** A session. */
export interface Session {
  userId: string
}
`,
    )
    await writeFile(
      join(dir, 'src', 'index.ts'),
      `export * as authorization from './authorization.js'
`,
    )

    const result = extractPackageApi(dir)
    const ns = result.exports.find((e) => e.name === 'authorization')
    expect(ns).toBeDefined()
    expect(ns!.kind).toBe('namespace')

    const evict = ns!.members!.find((m) => m.name === 'invalidateDeviceExistsCache')
    expect(evict).toBeDefined()
    expect(evict!.description).toBe('Evict one device from the exists-cache.')
    expect(evict!.declaration).toContain('invalidateDeviceExistsCache')
    expect(evict!.params![0].description).toBe('The device id to drop.')
    expect(evict!.returnDescription).toBe('Nothing.')
    expect(evict!.sourceFile).toBe('authorization.ts')

    const session = ns!.members!.find((m) => m.name === 'Session')
    expect(session!.kind).toBe('interface')
    expect(session!.description).toBe('A session.')
    expect(session!.declaration).toContain('userId: string')
  })

  it('names the module a namespace re-exports when its source is outside the package', async () => {
    const dir = await createTempPackage('external-ns', 'export * as zod from "fakelib"\n')
    // A minimal installed dependency for ts-morph to resolve the re-export to.
    const libDir = join(dir, 'node_modules', 'fakelib')
    await mkdir(libDir, { recursive: true })
    await writeFile(
      join(libDir, 'package.json'),
      JSON.stringify({ name: 'fakelib', version: '1.0.0', types: 'index.d.ts' }),
    )
    await writeFile(join(libDir, 'index.d.ts'), 'export declare const thing: string\n')

    const result = extractPackageApi(dir)
    const ns = result.exports.find((e) => e.name === 'zod')
    expect(ns).toBeDefined()
    expect(ns!.externalModule).toBe('fakelib')
    // Its members are the dependency's API — not expanded into this package's docs.
    expect(ns!.members).toBeUndefined()
  })

  it('orders exports of one kind by source position, not alphabetically', async () => {
    const dir = await createTempPackage(
      'source-order',
      `export function zebra(): void {}
export function alpha(): void {}
export function middle(): void {}
`,
    )

    const result = extractPackageApi(dir)
    const names = result.exports.filter((e) => e.kind === 'function').map((e) => e.name)
    expect(names).toEqual(['zebra', 'alpha', 'middle'])
  })
})
