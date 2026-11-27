/**
 * Visual test infrastructure for cross-framework component showcases.
 *
 * Creates self-contained Vite dev server projects for each framework
 * (React, Vue, Svelte, Solid, Angular, React Native Web) by assembling
 * showcase templates. `MOLECULE_SHOWCASE_PACKAGES` decides where their
 * `@molecule/*` packages come from:
 *
 * - `workspace` (the default, for a checkout inside molecule-workspace): every package of the
 *   molecule checkout beside mlcl is symlinked into the showcase's `node_modules`, so a run sees
 *   uncommitted source and installs nothing from npm.
 * - `npm` (what CI sets, where mlcl is checked out alone): the showcase's `package.json` declares,
 *   at the pins registry.json writes, each `@molecule/*` package its own files use and the required
 *   peers beside them (the closure every scaffolded project gets), and installs them from npm
 *   under the scaffold's own `.npmrc`.
 *
 * `MOLECULE_SHOWCASE_FRAMEWORKS` narrows a run to named frameworks: global-setup.ts starts
 * React's showcase and theirs, and cross-framework.spec.ts compares only theirs.
 *
 * @module
 */

import { type ChildProcess, spawn } from 'node:child_process'
import { cp, mkdir, readdir, readFile, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { extname, join } from 'node:path'

import { ts } from 'ts-morph'

import { npmInstallArgs } from './npm-install.js'
import { closeMoleculePeers, type MoleculePeerManifest } from './peer-closure.js'
import { getMoleculeVersion, getRawRegistry, loadAppFrameworks, loadToolchain } from './registry.js'
import {
  DEFAULT_TAILWIND_CSS_IMPORTS,
  withSuppliedStylesheet,
} from './scaffold-supplied-stylesheet.js'

/**
 * Supported frameworks for visual testing.
 *
 * `react-native-web` renders the React Native components through React Native Web with the web
 * ClassMap and Tailwind CSS. Expo uses the NativeWind ClassMap, its Tailwind preset and the
 * NativeWind compiler on devices. A device screenshot needs an iOS or Android
 * simulator, which neither this machine (aarch64 Linux) nor CI (ubuntu) has. The device
 * styling is checked without pixels instead: the scaffold check's `classes` step
 * (scripts/check-framework-scaffolds.mjs) compiles every ClassMap class of an installed
 * react-native app with NativeWind's own compiler, and `@molecule/app-theme-nativewind`'s
 * tests render through NativeWind's native runtime.
 */
export const VISUAL_TEST_FRAMEWORKS = [
  'react',
  'vue',
  'svelte',
  'solid',
  'angular',
  'react-native-web',
] as const
export type VisualTestFramework = (typeof VISUAL_TEST_FRAMEWORKS)[number]

/** Paths relative to the mlcl package root */
const MLCL_ROOT = join(import.meta.dirname, '..', '..')
const TEMPLATES_DIR = join(MLCL_ROOT, 'templates', 'showcase')
const MOLECULE_PACKAGES = join(MLCL_ROOT, '..', 'molecule', 'packages')
/** The install rules of every scaffolded project (legacy peer resolution among them). */
const NPMRC_TEMPLATE = join(MLCL_ROOT, 'templates', 'shared', 'npmrc.tpl')

/** Where a showcase's `@molecule/*` packages come from. */
export type ShowcasePackageSource = 'workspace' | 'npm'

/**
 * The package source `MOLECULE_SHOWCASE_PACKAGES` names: `workspace` when it is unset or empty.
 *
 * @param value - The environment value.
 * @returns `workspace` or `npm`.
 * @throws {Error} When the value names neither.
 */
export function showcasePackageSource(value: string | undefined): ShowcasePackageSource {
  if (value === undefined || value === '') return 'workspace'
  if (value === 'workspace' || value === 'npm') return value
  throw new Error(`MOLECULE_SHOWCASE_PACKAGES must be "workspace" or "npm", got "${value}"`)
}

/** Files whose imports the TypeScript preprocessor reads: a `.svelte` or `.vue` script included. */
const SCRIPT_EXTENSION = new Set([
  '.ts',
  '.tsx',
  '.mts',
  '.cts',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.vue',
  '.svelte',
])

/** A package's directory under `node_modules/@molecule/`, as a stylesheet's `@source` line names it. */
const MOLECULE_DIRECTORY = /node_modules[/\\](@molecule[/\\][^'"`\s/\\]+)/g

/** A single-file component: its imports are in its script blocks, not in its markup. */
const SINGLE_FILE_COMPONENT = new Set(['.svelte', '.vue'])
const SCRIPT_BLOCK = /<script\b[^>]*>([\s\S]*?)<\/script>/g

/**
 * The text a file's module specifiers are read from: a single-file component's script blocks, or
 * the whole file for any other script.
 *
 * @param file - The file name.
 * @param text - The file's content.
 * @returns The script text.
 */
function scriptText(file: string, text: string): string {
  if (!SINGLE_FILE_COMPONENT.has(extname(file))) return text
  return [...text.matchAll(SCRIPT_BLOCK)].map((match) => match[1]).join('\n')
}

/**
 * The `@molecule/*` packages a showcase project's own files use: each one a file imports (a
 * subpath import counts as its package) and each one whose directory under `node_modules/@molecule/`
 * a file names. Read from the project as written, so a showcase that starts using a package needs
 * no list updated, and a package a file only mentions in a comment needs no install.
 *
 * @param dir - The showcase project.
 * @returns The package names, sorted.
 */
export async function usedMoleculePackages(dir: string): Promise<string[]> {
  const names = new Set<string>()
  const visit = async (path: string): Promise<void> => {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      if (entry.name === 'node_modules') continue
      const file = join(path, entry.name)
      if (entry.isDirectory()) {
        await visit(file)
        continue
      }
      if (!entry.isFile()) continue
      const text = await readFile(file, 'utf8')
      const extension = extname(entry.name)
      if (SCRIPT_EXTENSION.has(extension))
        for (const { fileName } of ts.preProcessFile(scriptText(entry.name, text)).importedFiles) {
          if (!fileName.startsWith('@molecule/')) continue
          // `@molecule/app-ui/sub` is the package `@molecule/app-ui`.
          names.add(fileName.split('/').slice(0, 2).join('/'))
        }
      for (const match of text.matchAll(MOLECULE_DIRECTORY))
        names.add(match[1].replaceAll('\\', '/'))
    }
  }
  await visit(dir)
  return [...names].sort()
}

/**
 * Recursively find all @molecule/* packages in a directory.
 * Returns a map of package name → absolute path.
 */
async function findMoleculePackages(dir: string, depth = 0): Promise<Map<string, string>> {
  const packages = new Map<string, string>()
  if (depth > 4) return packages

  try {
    const entries = await readdir(dir, { withFileTypes: true })
    const hasPackageJson = entries.some((e) => e.name === 'package.json')

    if (hasPackageJson) {
      const pkg = JSON.parse(await readFile(join(dir, 'package.json'), 'utf-8'))
      if (pkg.name?.startsWith('@molecule/')) {
        packages.set(pkg.name, dir)
      }
    }

    for (const entry of entries) {
      if (
        entry.isDirectory() &&
        !entry.name.startsWith('.') &&
        entry.name !== 'node_modules' &&
        entry.name !== 'dist'
      ) {
        const sub = await findMoleculePackages(join(dir, entry.name), depth + 1)
        for (const [name, path] of sub) packages.set(name, path)
      }
    }
  } catch (_error) {
    // safe to ignore: directory may be inaccessible or unreadable; skip it
  }

  return packages
}

/** A running showcase project with its Vite dev server */
export interface ShowcaseProject {
  framework: VisualTestFramework
  dir: string
  port: number
  url: string
  process: ChildProcess
}

/**
 * Create a showcase project for a single framework in a temp directory.
 *
 * 1. Copies shared + framework-specific template files into src/
 * 2. Writes package.json with framework deps, and in the `npm` package source the
 *    `@molecule/*` packages the showcase uses and their required peers at the registry pins
 * 3. Copies index.html to project root
 *
 * Note: in the `workspace` package source, @molecule/* symlinks are created AFTER npm install
 * (in startShowcaseServer) because npm install wipes node_modules.
 *
 * Returns the project directory path. Caller is responsible for cleanup.
 */
export async function createShowcaseProject(
  framework: VisualTestFramework,
  baseDir: string,
): Promise<string> {
  const fwDeps = loadAppFrameworks()[framework]
  if (!fwDeps) throw new Error(`No registered showcase framework: ${framework}`)
  const toolchain = loadToolchain()
  const styling = getRawRegistry().packages?.['@molecule/app-styling-tailwind']?.buildTooling
  if (!toolchain.app.vite || !toolchain.shared.typescript || !styling?.devDependencies) {
    throw new Error('Showcase build tooling is missing from the registry')
  }
  const dir = join(baseDir, `showcase-${framework}`)
  const srcDir = join(dir, 'src')
  await mkdir(srcDir, { recursive: true })

  // 1. Copy shared template files into src/
  const sharedDir = join(TEMPLATES_DIR, 'shared')
  const sharedFiles = await readdir(sharedDir)
  for (const file of sharedFiles) {
    if (file === 'index.html') {
      // index.html goes to project root, not src/
      await cp(join(sharedDir, file), join(dir, file))
    } else {
      await cp(join(sharedDir, file), join(srcDir, file))
    }
  }

  // 2. Copy framework-specific template files
  const fwDir = join(TEMPLATES_DIR, framework)
  const fwFiles = await readdir(fwDir)
  for (const file of fwFiles) {
    // Config files and index.html go to project root (framework index.html overwrites shared)
    if (
      file === 'vite.config.ts' ||
      file === 'tsconfig.json' ||
      file === 'svelte.config.js' ||
      file === 'index.html'
    ) {
      await cp(join(fwDir, file), join(dir, file))
    } else {
      await cp(join(fwDir, file), join(srcDir, file))
    }
  }

  // The plain-JS runtime modules a framework's scaffold ships beside its sources (React Native
  // Web's react-native-web.js), so the showcase runs on the module a scaffold does, not a copy.
  const appDir = join(MLCL_ROOT, 'templates', 'app', framework)
  for (const file of await readdir(appDir).catch(() => [])) {
    if (file.endsWith('.js.tpl')) await cp(join(appDir, file), join(srcDir, file.slice(0, -4)))
  }

  // The shared stylesheet stays valid CSS with the default imports; a framework that needs a
  // different cascade replaces that exact line.
  const indexCss = join(srcDir, 'index.css')
  let css = await readFile(indexCss, 'utf8')
  if (fwDeps.tailwindCssImports) {
    if (!css.includes(DEFAULT_TAILWIND_CSS_IMPORTS))
      throw new Error(
        `${indexCss} has no "${DEFAULT_TAILWIND_CSS_IMPORTS}" line for ${framework}'s tailwindCssImports to replace`,
      )
    css = css.replace(DEFAULT_TAILWIND_CSS_IMPORTS, () => fwDeps.tailwindCssImports ?? '')
  }
  await writeFile(indexCss, await withSuppliedStylesheet(srcDir, css))

  // 3. Write package.json
  const manifest: MoleculePeerManifest = {
    name: `molecule-showcase-${framework}`,
    version: '1.0.0',
    private: true,
    type: 'module',
    dependencies: { ...fwDeps.dependencies },
    devDependencies: {
      vite: toolchain.app.vite,
      typescript: toolchain.shared.typescript,
      ...styling.devDependencies,
      ...fwDeps.devDependencies,
    },
  }
  if (showcasePackageSource(process.env.MOLECULE_SHOWCASE_PACKAGES) === 'npm') {
    // The showcase's files say which packages it uses; the registry says which version a project
    // pins each one to and which required peers are declared beside them.
    const used = await usedMoleculePackages(dir)
    if (used.length === 0)
      throw new Error(
        `${framework}'s showcase files use no @molecule/* package to install from npm`,
      )
    manifest.dependencies = Object.fromEntries([
      ...Object.entries(manifest.dependencies ?? {}),
      ...used.map((name) => [name, getMoleculeVersion(name)]),
    ])
    closeMoleculePeers(manifest)
    await cp(NPMRC_TEMPLATE, join(dir, '.npmrc'))
  }
  await writeFile(join(dir, 'package.json'), JSON.stringify(manifest, null, 2))

  return dir
}

/**
 * Symlink all @molecule/* packages into a project's node_modules.
 * Must be called AFTER npm install to avoid being overwritten.
 *
 * @param dir - The showcase project.
 * @throws {Error} When the molecule checkout beside mlcl has no package: without it nothing is
 *   linked, and Vite would fail on the first `@molecule/*` import without saying why.
 */
async function symlinkMoleculePackages(dir: string): Promise<void> {
  const packages = await findMoleculePackages(MOLECULE_PACKAGES)
  if (packages.size === 0)
    throw new Error(
      `no @molecule/* package under ${MOLECULE_PACKAGES}: the workspace package source needs the molecule checkout beside mlcl, or set MOLECULE_SHOWCASE_PACKAGES=npm to install the showcases' packages from npm`,
    )
  const moleculeModulesDir = join(dir, 'node_modules', '@molecule')
  await mkdir(moleculeModulesDir, { recursive: true })

  for (const [name, pkgPath] of packages) {
    const shortName = name.replace('@molecule/', '')
    try {
      await symlink(pkgPath, join(moleculeModulesDir, shortName))
    } catch (_error) {
      // safe to ignore: symlink already exists (EEXIST) on repeated runs
    }
  }
}

/**
 * Start a Vite dev server for a showcase project.
 *
 * Uses npx to invoke vite from the project's node_modules.
 * Returns when the server is ready (listens for "ready in" output).
 */
export async function startShowcaseServer(
  dir: string,
  framework: VisualTestFramework,
  port: number,
): Promise<ShowcaseProject> {
  // Install npm deps (framework runtime + Vite + Tailwind, and in the `npm` package source the
  // @molecule/* packages)
  const install = spawn('npm', [...npmInstallArgs(), '--ignore-scripts'], {
    cwd: dir,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'development' },
  })
  // npm's output is kept for a failure: a pin npm does not serve, or a peer it cannot resolve, is
  // in it and nowhere else.
  let installOutput = ''
  install.stdout.on('data', (data: Buffer) => (installOutput += data.toString()))
  install.stderr.on('data', (data: Buffer) => (installOutput += data.toString()))

  await new Promise<void>((resolve, reject) => {
    install.on('close', (code) => {
      if (code === 0) resolve()
      else
        reject(
          new Error(
            `npm install failed in ${dir} with code ${code}:\n${installOutput.trim().slice(-2000)}`,
          ),
        )
    })
    install.on('error', reject)
  })

  // Symlink @molecule/* packages AFTER npm install (which wipes node_modules)
  if (showcasePackageSource(process.env.MOLECULE_SHOWCASE_PACKAGES) === 'workspace')
    await symlinkMoleculePackages(dir)

  // Start Vite dev server, as its own process group: `npx` runs Vite as a child, so stopping
  // only the npx process left Vite holding the port (2026-11-27: after one failed test the
  // restarted worker found all six ports taken).
  //
  // `--no` keeps npx from downloading a Vite the showcase does not have, and the `--` after it
  // leaves `--port` and `--strictPort` for Vite: a flag written right after the package name is
  // npm's own to read, so without the `--` npm 11.20 drops both (with an "Unknown cli config"
  // warning) and hands Vite only the number. Every showcase then listens on Vite's default port
  // while the comparisons go to the showcase ports, and each fails on a refused connection
  // (2026-11-27, the day `--no` was added; visual-test-server.test.ts runs this launch, and
  // npx-no-download.test.ts checks every such call).
  const viteProcess = spawn('npx', ['--no', '--', 'vite', '--port', String(port), '--strictPort'], {
    cwd: dir,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'development' },
  })

  const url = `http://localhost:${port}`

  // Wait for Vite to be ready
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Vite dev server for ${framework} did not start within 30s`))
    }, 30_000)

    let output = ''
    viteProcess.stdout?.on('data', (data: Buffer) => {
      output += data.toString()
      if (output.includes('ready in') || output.includes('Local:')) {
        clearTimeout(timeout)
        resolve()
      }
    })

    viteProcess.stderr?.on('data', (data: Buffer) => {
      output += data.toString()
    })

    viteProcess.on('error', (err) => {
      clearTimeout(timeout)
      reject(err)
    })

    viteProcess.on('close', (code) => {
      if (code !== null && code !== 0) {
        clearTimeout(timeout)
        reject(new Error(`Vite exited with code ${code}. Output:\n${output}`))
      }
    })
  })

  return {
    framework,
    dir,
    port,
    url,
    process: viteProcess,
  }
}

/**
 * Starting port for showcase dev servers (each framework gets port + index).
 * `MOLECULE_SHOWCASE_BASE_PORT` moves the range, so two runs on one machine do not collide.
 */
export const BASE_PORT = showcaseBasePort(process.env.MOLECULE_SHOWCASE_BASE_PORT)

/**
 * Read the showcase base port from its environment value.
 *
 * @param value - `MOLECULE_SHOWCASE_BASE_PORT`, if set.
 * @returns The port, 5200 when unset.
 */
export function showcaseBasePort(value: string | undefined): number {
  if (value === undefined || value === '') return 5200
  const port = Number(value)
  if (!Number.isInteger(port) || port < 1024 || port > 65_000)
    throw new Error(`MOLECULE_SHOWCASE_BASE_PORT must be a port from 1024 to 65000, got "${value}"`)
  return port
}

/**
 * The frameworks this run starts showcases for: every one, or React's and the ones
 * `MOLECULE_SHOWCASE_FRAMEWORKS` names (comma-separated). global-setup.ts starts these, and
 * cross-framework.spec.ts compares the ones besides React, so one framework's run installs two
 * showcases instead of six. React is always among them: every comparison needs its showcase.
 *
 * @param value - The environment value.
 * @returns The frameworks, in the order of {@link VISUAL_TEST_FRAMEWORKS}.
 * @throws {Error} When a name is not a showcase framework.
 */
export function showcaseFrameworks(value: string | undefined): VisualTestFramework[] {
  const named = (value ?? '')
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name !== '')
  if (named.length === 0) return [...VISUAL_TEST_FRAMEWORKS]
  const unknown = named.filter(
    (name) => !(VISUAL_TEST_FRAMEWORKS as readonly string[]).includes(name),
  )
  if (unknown.length > 0)
    throw new Error(
      `MOLECULE_SHOWCASE_FRAMEWORKS names ${unknown.join(', ')}; expected a comma-separated list of ${VISUAL_TEST_FRAMEWORKS.join(', ')}`,
    )
  return VISUAL_TEST_FRAMEWORKS.filter(
    (framework) => framework === 'react' || named.includes(framework),
  )
}

/**
 * The frameworks {@link showcaseFrameworks} gives this run, besides React: what
 * cross-framework.spec.ts compares with React.
 *
 * @returns The frameworks, in the order of {@link VISUAL_TEST_FRAMEWORKS}.
 */
export function comparedFrameworks(): VisualTestFramework[] {
  return showcaseFrameworks(process.env.MOLECULE_SHOWCASE_FRAMEWORKS).filter(
    (framework) => framework !== 'react',
  )
}

/**
 * A framework's showcase port: the base port plus its place in {@link VISUAL_TEST_FRAMEWORKS}, so
 * a framework keeps its port in a run that starts only some of the showcases.
 *
 * @param framework - The framework.
 * @returns The port.
 */
export function showcasePort(framework: VisualTestFramework): number {
  return BASE_PORT + VISUAL_TEST_FRAMEWORKS.indexOf(framework)
}

/**
 * Create and start showcase projects for the frameworks of this run
 * ({@link showcaseFrameworks}; every one by default).
 *
 * Creates a shared temp directory, generates a project per framework,
 * installs deps, and starts a Vite dev server on each one's port ({@link showcasePort}).
 *
 * Returns all running projects. Caller must call `stopShowcaseServers()`
 * when done.
 */
export async function startAllShowcases(baseDir?: string): Promise<ShowcaseProject[]> {
  const dir = baseDir ?? join(tmpdir(), `molecule-showcase-${Date.now()}`)
  await mkdir(dir, { recursive: true })

  const projects: ShowcaseProject[] = []

  for (const framework of showcaseFrameworks(process.env.MOLECULE_SHOWCASE_FRAMEWORKS)) {
    const projectDir = await createShowcaseProject(framework, dir)
    const project = await startShowcaseServer(projectDir, framework, showcasePort(framework))
    projects.push(project)
  }

  return projects
}

/** Stop all running showcase dev servers: each server's whole process group, Vite included. */
export function stopShowcaseServers(projects: ShowcaseProject[]): void {
  for (const project of projects) {
    const pid = project.process?.pid
    if (pid === undefined || project.process?.exitCode !== null) continue
    try {
      process.kill(-pid, 'SIGTERM')
    } catch (error) {
      // The group is already gone.
      if (!(error instanceof Error && 'code' in error && error.code === 'ESRCH')) throw error
    }
  }
}
