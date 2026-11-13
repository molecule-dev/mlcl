import { execFileSync } from 'node:child_process'
import { mkdtemp, readdir, readFile, rm, symlink } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, relative } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const ROOT = join(import.meta.dirname, '..', '..', '..')
const SOURCE = /\.(?:[cm]?[jt]sx?|vue|svelte)$/

/** Every `@molecule/*` package a source file imports, re-exports or loads dynamically. */
const moleculeImports = (source: string): string[] => {
  const names = new Set<string>()
  const pattern = /(?:\bfrom\s*|\bimport\s*\(?\s*)['"](@molecule\/[a-z0-9-]+)(?:\/[^'"]*)?['"]/g
  for (const match of source.matchAll(pattern)) names.add(match[1])
  return [...names]
}

/** Every source file under `dir`. */
const sourceFiles = async (dir: string): Promise<string[]> => {
  const files: string[] = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...(await sourceFiles(path)))
    else if (SOURCE.test(entry.name)) files.push(path)
  }
  return files
}

/**
 * The generated app's own code: `src/` and the root config files (vite.config.ts and the
 * like). Lint-rule sources are left out: their messages quote import statements as text.
 */
const appFiles = async (project: string): Promise<string[]> => {
  const root = (await readdir(project, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && SOURCE.test(entry.name))
    .map((entry) => join(project, entry.name))
  return [...root, ...(await sourceFiles(join(project, 'src')))]
}

// The node_modules mlcl resolves prettier (and prettier-plugin-svelte) from.
const PRETTIER_MODULES = dirname(
  dirname(createRequire(import.meta.url).resolve('prettier/package.json')),
)

// Each framework renders its own templates (templates/app/<framework>/), and the packages
// its scaffold installs come from that binding's registry `templateRequires` plus the
// default providers. A template that imports a package missing from that set, or that its
// own formatter rejects, compiles nowhere here but fails the user's first build or
// `format:check` (2026-11-13: the Vue, Solid, Svelte and Angular entry points wired their
// routing bond, which only React listed, and two Svelte imports exceeded the print width).
describe.each(['react', 'vue', 'solid', 'svelte', 'angular', 'react-native-web'])(
  'a fresh %s scaffold',
  (framework) => {
    let scratch: string
    let project: string

    beforeAll(async () => {
      scratch = await mkdtemp(join(tmpdir(), 'mlcl-template-imports-'))
      project = join(scratch, 'project')
      execFileSync(
        process.execPath,
        [
          join(ROOT, 'bin', 'run.js'),
          'create',
          project,
          '--type',
          'app',
          '--framework',
          framework,
          '--no-interactive',
          '--skip-install',
        ],
        { cwd: ROOT, encoding: 'utf8', timeout: 120_000, stdio: 'pipe' },
      )
    }, 180_000)

    afterAll(async () => {
      // fs.rm removes the node_modules symlink below without following it.
      await rm(scratch, { recursive: true, force: true })
    })

    it('installs every @molecule package its source imports', async () => {
      const pkg = JSON.parse(await readFile(join(project, 'package.json'), 'utf8')) as {
        dependencies?: Record<string, string>
        devDependencies?: Record<string, string>
      }
      const installed = new Set([
        ...Object.keys(pkg.dependencies ?? {}),
        ...Object.keys(pkg.devDependencies ?? {}),
      ])
      const missing: string[] = []
      for (const file of await appFiles(project)) {
        for (const name of moleculeImports(await readFile(file, 'utf8'))) {
          if (!installed.has(name)) missing.push(`${relative(project, file)} imports ${name}`)
        }
      }
      expect(missing).toEqual([])
    })

    it('passes its own format:check', async () => {
      const pkg = JSON.parse(await readFile(join(project, 'package.json'), 'utf8')) as {
        scripts?: Record<string, string>
      }
      expect(pkg.scripts?.['format:check']).toMatch(/^prettier --check /)
      await symlink(PRETTIER_MODULES, join(project, 'node_modules'), 'dir')
      let output = ''
      try {
        execFileSync('npm', ['run', '--silent', 'format:check'], {
          cwd: project,
          encoding: 'utf8',
          timeout: 120_000,
          stdio: 'pipe',
        })
      } catch (error) {
        const failed = error as { stdout?: string; stderr?: string }
        output = `${failed.stdout ?? ''}${failed.stderr ?? ''}`
      }
      expect(output).toBe('')
    }, 180_000)
  },
)
