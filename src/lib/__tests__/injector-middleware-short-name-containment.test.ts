/**
 * `molecule.shortName` is DATA, and the middleware plan uses it VERBATIM as a
 * path segment (`src/middleware/<name>.ts`) and as the identifier inside the
 * generated setup file. {@link scanPackage} reads it from the INSTALLED
 * package's own `package.json` for every package the registry does not list, so
 * a third-party package declares it — and a `"shortName": "../../../evil"`
 * walked the write out of the project entirely. The package NAME is guarded
 * (`isPackageNameShaped`, see injector-name-path-containment.test.ts); the
 * shortName is the same class of metadata by another door, which is what this
 * file pins.
 *
 * Driven through the real `planInjection` → `executeInjection` against a
 * project on disk; nothing is mocked.
 *
 * @module
 */
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  executeInjection,
  isSafeShortName,
  middlewareIdentifier,
  planInjection,
} from '../injector.js'

/** A short name that reaches above the project: three `..` segments from `src/middleware`. */
const ESCAPING_SHORT_NAME = '../../../evil'

/**
 * The middleware metadata a payload package declares for itself. `exports` is
 * pre-declared so the generator never has to scan the payload's source.
 */
const payloadMolecule = (shortName: string): Record<string, unknown> => ({
  type: 'middleware',
  category: 'test',
  label: 'Evil',
  shortName,
  exports: ['evilMiddleware'],
})

let root: string
let project: string

/**
 * Every temp root this file created. Two tests below call `makeProject` inside
 * their body to re-fixture the project; each call reassigns `root`, so an
 * `afterEach` that removed only the latest root leaked the directory
 * `beforeEach` had just made — one per such test, every run.
 */
const createdRoots: string[] = []

/** A project depending on a `file:payload` package that declares `shortName` about itself. */
function makeProject(shortName: string): void {
  root = mkdtempSync(join(tmpdir(), 'mlcl-short-name-containment-'))
  createdRoots.push(root)
  project = join(root, 'app')
  mkdirSync(project, { recursive: true })
  writeFileSync(
    join(project, 'package.json'),
    JSON.stringify(
      {
        name: 'app',
        version: '0.0.1',
        dependencies: { '@molecule/api-middleware-evil': 'file:payload' },
      },
      null,
      2,
    ),
  )
  mkdirSync(join(project, 'payload', 'src'), { recursive: true })
  writeFileSync(
    join(project, 'payload', 'package.json'),
    JSON.stringify({
      name: '@molecule/api-middleware-evil',
      version: '1.0.0',
      molecule: payloadMolecule(shortName),
    }),
  )
  writeFileSync(
    join(project, 'payload', 'src', 'index.ts'),
    'export const evilMiddleware = () => {}\n',
  )
}

afterEach(() => {
  // EVERY root, not just the latest — see `createdRoots`.
  for (const dir of createdRoots.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('isSafeShortName — one path segment, one identifier', () => {
  it('accepts the names the fleet actually declares', () => {
    for (const name of ['body-parser', 'cookie-parser', 'cors', 'validation', 'a_b', 'x1']) {
      expect(isSafeShortName(name), name).toBe(true)
    }
  })

  it('refuses separators, `..`, dots and empties', () => {
    for (const name of ['../evil', 'a/b', '..', '.', '', '/', '..\\evil', 'a.b', 42, undefined]) {
      expect(isSafeShortName(name), JSON.stringify(name)).toBe(false)
    }
  })

  it('refuses a name whose camelCase is not a JavaScript identifier', () => {
    // Every one of these passes the "one `[A-Za-z0-9_-]` run" shape above, and
    // the generated setup file declares `export const <camelCase>Middleware` —
    // so accepting them produced a file the project cannot compile:
    // `x-` → `export const x-Middleware`, `9-lives` → `export const 9Lives…`.
    for (const name of ['x-', '9-lives', '--x']) {
      expect(isSafeShortName(name), name).toBe(false)
    }
  })

  it('derives a VALID identifier from any name — the derived form is what generated code embeds', () => {
    // The total derivation the guard's doc points at: whatever the metadata
    // says, the fragment that reaches `const <name>Middleware` is a legal
    // identifier, and every generator site derives it the same way.
    expect(middlewareIdentifier('body-parser')).toBe('bodyParser')
    expect(middlewareIdentifier('my-2fa')).toBe('my2fa')
    expect(middlewareIdentifier('9-lives')).toBe('_9Lives')
    expect(middlewareIdentifier('x-')).toBe('x_')
    const identifier = /^[A-Za-z_$][A-Za-z0-9_$]*$/
    for (const name of ['body-parser', 'my-2fa', '9-lives', 'x-', '../evil', 'a.b']) {
      expect(middlewareIdentifier(name), name).toMatch(identifier)
    }
  })
})

describe('the injector keeps a declared shortName inside the project', () => {
  beforeEach(() => {
    makeProject(ESCAPING_SHORT_NAME)
  })

  it('plans the middleware file inside src/middleware, not above the project', async () => {
    const plan = await planInjection('@molecule/api-middleware-evil', project)

    const escaped = plan.files
      .map((file) => file.targetPath)
      .filter((target) => !target.startsWith(`${project}/`))
    expect(escaped, 'no planned file may land outside the project').toEqual([])

    // The declared value is not a name, so the package's (validated) name
    // derives the fallback: `api-middleware-evil` → `evil`.
    expect(plan.files.map((file) => file.targetPath)).toContain(
      join(project, 'src', 'middleware', 'evil.ts'),
    )
  })

  it('writes nothing above the project when the plan is executed', async () => {
    const plan = await planInjection('@molecule/api-middleware-evil', project)
    await executeInjection(plan, project, { autoInstall: false })

    expect(existsSync(join(root, 'evil.ts')), 'nothing may be written above the project').toBe(
      false,
    )
    expect(existsSync(join(project, 'src', 'middleware', 'evil.ts'))).toBe(true)
  })

  it('still honours a well-formed declared shortName', async () => {
    makeProject('custom-name')

    const plan = await planInjection('@molecule/api-middleware-evil', project)

    expect(plan.files.map((file) => file.targetPath)).toContain(
      join(project, 'src', 'middleware', 'custom-name.ts'),
    )
  })

  it('never writes an identifier the project cannot compile', async () => {
    // `x-` is a single path segment, so the segment guard alone let it through —
    // and the setup file it produced declared `export const x-Middleware`,
    // which is a syntax error, not a middleware. It is refused now, so the
    // package's own (validated) name derives `evil` — the same name a
    // non-name shortName already gets.
    makeProject('x-')

    const plan = await planInjection('@molecule/api-middleware-evil', project)
    const setup = plan.files.find(
      (file) => file.targetPath === join(project, 'src', 'middleware', 'evil.ts'),
    )

    expect(plan.files.map((file) => file.targetPath)).not.toContain(
      join(project, 'src', 'middleware', 'x-.ts'),
    )
    expect(setup?.content, 'the middleware setup must be planned under the derived name').toMatch(
      /^export const evilMiddleware:/m,
    )
    // The exact shape the syntax error took: a `-` surviving into the identifier.
    expect(setup?.content).not.toContain('x-Middleware')
  })
})
