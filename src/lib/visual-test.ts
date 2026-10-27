/**
 * Visual test infrastructure for cross-framework component showcases.
 *
 * Creates self-contained Vite dev server projects for each framework
 * (React, Vue, Svelte, Solid, Angular, React Native Web) by assembling
 * showcase templates and symlinking @molecule/* packages from the workspace.
 *
 * @module
 */

import { type ChildProcess, spawn } from 'node:child_process'
import { cp, mkdir, readdir, readFile, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { getRawRegistry, loadAppFrameworks, loadToolchain } from './registry.js'

/** Supported frameworks for visual testing */
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
 * 2. Writes package.json with framework deps
 * 3. Copies index.html to project root
 *
 * Note: @molecule/* symlinks are created AFTER npm install (in startShowcaseServer)
 * because npm install wipes node_modules.
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

  // 3. Write package.json
  await writeFile(
    join(dir, 'package.json'),
    JSON.stringify(
      {
        name: `molecule-showcase-${framework}`,
        version: '1.0.0',
        private: true,
        type: 'module',
        dependencies: {
          ...fwDeps.dependencies,
        },
        devDependencies: {
          vite: toolchain.app.vite,
          typescript: toolchain.shared.typescript,
          ...styling.devDependencies,
          ...fwDeps.devDependencies,
        },
      },
      null,
      2,
    ),
  )

  return dir
}

/**
 * Symlink all @molecule/* packages into a project's node_modules.
 * Must be called AFTER npm install to avoid being overwritten.
 */
async function symlinkMoleculePackages(dir: string): Promise<void> {
  const packages = await findMoleculePackages(MOLECULE_PACKAGES)
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
  // Install npm deps (framework runtime + Vite + Tailwind)
  const install = spawn('npm', ['install', '--ignore-scripts'], {
    cwd: dir,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'development' },
  })

  await new Promise<void>((resolve, reject) => {
    install.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`npm install failed in ${dir} with code ${code}`))
    })
    install.on('error', reject)
  })

  // Symlink @molecule/* packages AFTER npm install (which wipes node_modules)
  await symlinkMoleculePackages(dir)

  // Start Vite dev server
  const viteProcess = spawn('npx', ['vite', '--port', String(port), '--strictPort'], {
    cwd: dir,
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

/** Starting port for showcase dev servers (each framework gets port + index) */
export const BASE_PORT = 5200

/**
 * Create and start showcase projects for all frameworks.
 *
 * Creates a shared temp directory, generates a project per framework,
 * installs deps, and starts Vite dev servers on sequential ports.
 *
 * Returns all running projects. Caller must call `stopShowcaseServers()`
 * when done.
 */
export async function startAllShowcases(baseDir?: string): Promise<ShowcaseProject[]> {
  const dir = baseDir ?? join(tmpdir(), `molecule-showcase-${Date.now()}`)
  await mkdir(dir, { recursive: true })

  const projects: ShowcaseProject[] = []

  for (let i = 0; i < VISUAL_TEST_FRAMEWORKS.length; i++) {
    const framework = VISUAL_TEST_FRAMEWORKS[i]
    const port = BASE_PORT + i
    const projectDir = await createShowcaseProject(framework, dir)
    const project = await startShowcaseServer(projectDir, framework, port)
    projects.push(project)
  }

  return projects
}

/** Stop all running showcase dev servers and clean up. */
export function stopShowcaseServers(projects: ShowcaseProject[]): void {
  for (const project of projects) {
    if (project.process && !project.process.killed) {
      project.process.kill('SIGTERM')
    }
  }
}
