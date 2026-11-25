/**
 * `mlcl inject` in a project Molecule did not create.
 *
 * A project whose package.json has no `molecule.projectType` already has its own entry point,
 * router, tests and CI. There, inject adds only what the packages need: their bond files, the
 * setup function that wires them (`setupBonds()` for an API, `setupProviders()` for an app), a
 * router only when a package brings routes, and the migration runner when one brings tables.
 * The files are written in the project's own language (TypeScript, or JavaScript as ES modules;
 * a CommonJS package gets `.mjs` files), and the command prints the lines that call the setup
 * function from the project's entry file.
 *
 * @module
 */
import { existsSync, readFileSync } from 'node:fs'
import { basename, dirname, join, relative, sep } from 'node:path'

import { ts } from 'ts-morph'

import { mountsRoutes } from './extend-api-wiring.js'
import type { FileOperation } from './injector.js'

/** The language inject writes a project's files in. */
export type ProjectLanguage = 'typescript' | 'esm' | 'commonjs'

/** The package.json fields this module reads. */
export interface ProjectManifest {
  type?: string
  main?: string
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

/**
 * TypeScript when the project has a tsconfig.json or depends on typescript; otherwise
 * JavaScript, as ES modules when package.json says `"type": "module"`.
 *
 * @param projectPath - The project directory.
 * @param manifest - Its package.json.
 * @returns The language its source files are written in.
 */
export function projectLanguage(projectPath: string, manifest: ProjectManifest): ProjectLanguage {
  const deps = { ...manifest.dependencies, ...manifest.devDependencies }
  if (existsSync(join(projectPath, 'tsconfig.json')) || 'typescript' in deps) return 'typescript'
  return manifest.type === 'module' ? 'esm' : 'commonjs'
}

/** Relative `.js` specifiers in import/export statements and dynamic imports. */
const RELATIVE_JS = /((?:from|import)\s*\(?\s*)(['"])(\.{1,2}\/[^'"]+)\.js\2/g

/**
 * A generated file as the project's language needs it: TypeScript as generated, otherwise
 * compiled to JavaScript (types removed, ES module syntax kept) at the matching path. In a
 * CommonJS package the files become `.mjs`, and their relative imports follow.
 *
 * @param file - The generated file.
 * @param language - The project's language.
 * @returns The file to write.
 */
export function inLanguage(file: FileOperation, language: ProjectLanguage): FileOperation {
  if (language === 'typescript' || !/\.tsx?$/.test(file.targetPath)) return file
  const jsx = file.targetPath.endsWith('.tsx')
  const extension = jsx ? '.jsx' : language === 'commonjs' ? '.mjs' : '.js'
  const targetPath = file.targetPath.replace(/\.tsx?$/, extension)
  if (file.content === undefined) return { ...file, targetPath }
  let content = ts.transpileModule(file.content, {
    fileName: basename(file.targetPath),
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.Preserve,
      removeComments: false,
    },
  }).outputText
  if (language === 'commonjs') content = content.replace(RELATIVE_JS, '$1$2$3.mjs$2')
  return { ...file, targetPath, content }
}

/**
 * The generated files that belong in a project Molecule did not create, in its language: no
 * server entry point, no generated tests, no CI workflow, and a router only when it mounts a
 * package's routes.
 *
 * @param files - The files the injector generated.
 * @param projectPath - The project directory.
 * @param language - The project's language.
 * @returns The files to write.
 */
export function existingProjectFiles(
  files: FileOperation[],
  projectPath: string,
  language: ProjectLanguage,
): FileOperation[] {
  const skipped = (file: FileOperation): boolean => {
    const path = relative(projectPath, file.targetPath).split(sep).join('/')
    if (path === 'src/server.ts') return true
    if (path.includes('__tests__/')) return true
    if (/(^|\/)\.github\/workflows\//.test(path)) return true
    if (path === 'src/App/router.ts') return !mountsRoutes(file.content ?? '')
    return false
  }
  return files.filter((file) => !skipped(file)).map((file) => inLanguage(file, language))
}

/** The file a script command runs, when it names one that exists. */
function scriptEntry(projectPath: string, command: string | undefined): string | undefined {
  for (const word of command?.split(/\s+/) ?? []) {
    const candidate = word.replace(/^\.\//, '')
    if (/\.(?:[cm]?[jt]s|[jt]sx)$/.test(candidate) && existsSync(join(projectPath, candidate)))
      return candidate
  }
  return undefined
}

/**
 * The project's entry file: the file its start (or dev) script runs, else `main`, else the
 * usual entry paths.
 *
 * @param projectPath - The project directory.
 * @param manifest - Its package.json.
 * @param app - Whether it is a frontend app (entry `src/main.*` / `src/index.*`).
 * @returns The entry path relative to the project, or undefined when none is found.
 */
export function projectEntry(
  projectPath: string,
  manifest: ProjectManifest,
  app: boolean,
): string | undefined {
  const fromScripts =
    scriptEntry(projectPath, manifest.scripts?.start) ??
    scriptEntry(projectPath, manifest.scripts?.dev)
  if (fromScripts) return fromScripts
  if (manifest.main && existsSync(join(projectPath, manifest.main))) return manifest.main
  const names = app
    ? ['src/main', 'src/index']
    : ['src/server', 'src/index', 'server', 'index', 'app', 'src/app']
  const extensions = app ? ['.tsx', '.ts', '.jsx', '.js'] : ['.ts', '.js', '.mjs', '.cjs']
  for (const name of names)
    for (const extension of extensions)
      if (existsSync(join(projectPath, name + extension))) return name + extension
  return undefined
}

/** What {@link wiringSteps} needs to know about the injection. */
export interface WiringInput {
  projectPath: string
  manifest: ProjectManifest
  language: ProjectLanguage
  app: boolean
  /** The setup module, e.g. `<project>/src/bonds/index.js`. */
  bondsIndex: string
  /** The router module, when the project has one. */
  router?: string
  /** The migration runner, when the project has one. */
  migrateRunner?: string
}

/** The specifier an import in `from` uses for `target`. TypeScript imports name the `.js` file. */
function specifier(from: string, target: string, language: ProjectLanguage): string {
  let path = relative(dirname(from), target).split(sep).join('/')
  if (!path.startsWith('.')) path = `./${path}`
  return language === 'typescript' ? path.replace(/\.tsx?$/, '.js') : path
}

/**
 * The lines that connect the injected packages to a project Molecule did not create: call the
 * setup function from its entry file before it serves (or renders), mount the router, run the
 * migrations. A step the entry file already carries is left out.
 *
 * @param input - The project and the files the injection left in it.
 * @returns The steps, each a list of lines; empty when nothing is left to connect.
 */
export function wiringSteps(input: WiringInput): string[][] {
  const { projectPath, manifest, language, app } = input
  const entry = projectEntry(projectPath, manifest, app)
  const entryPath = join(projectPath, entry ?? 'src/index.js')
  const entryText = entry ? readFileSync(entryPath, 'utf8') : ''
  const where = entry ?? (app ? 'the file that renders your app' : 'your server entry file')
  const commonjs = Boolean(entry && /\.c?js$/.test(entry) && language === 'commonjs')
  const load = (names: string, target: string): string =>
    commonjs
      ? `const { ${names} } = await import('${specifier(entryPath, target, language)}')`
      : `import { ${names} } from '${specifier(entryPath, target, language)}'`
  const steps: string[][] = []
  const setup = app ? 'setupProviders' : 'setupBonds'
  if (!entryText.includes(setup))
    steps.push([
      `In ${where}, ${app ? 'before the app renders' : 'before the server starts listening'}:`,
      load(setup, input.bondsIndex),
      app ? `${setup}()` : `await ${setup}()`,
      ...(commonjs ? ['(inside your async startup: the generated files are ES modules)'] : []),
    ])
  if (input.router && existsSync(input.router) && !entryText.includes('App/router'))
    steps.push([
      `Mount the package routes in ${where}:`,
      load('router', input.router),
      `app.use('/api', router)`,
    ])
  if (input.migrateRunner && existsSync(input.migrateRunner)) {
    const runner = relative(projectPath, input.migrateRunner).split(sep).join('/')
    steps.push([
      'Create the tables:',
      language === 'typescript' ? `npx tsx ${runner}` : `node ${runner}`,
    ])
  }
  return steps
}
