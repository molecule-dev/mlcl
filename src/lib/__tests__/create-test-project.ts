/**
 * Shared test helper that creates a self-contained test project with
 * symlinks to molecule packages. Each test file gets its own temp
 * directory — no pre-existing state required.
 *
 * @module
 */

import { mkdir, mkdtemp, readdir, readFile, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/** Path to the public molecule repo's packages directory */
export const MOLECULE_PACKAGES = join(
  import.meta.dirname,
  '..',
  '..',
  '..',
  '..',
  'molecule',
  'packages',
)

/** All molecules used in test projects */
export const TEST_MOLECULES = [
  '@molecule/api-bond',
  '@molecule/api-database',
  '@molecule/api-database-postgresql',
  '@molecule/api-emails',
  '@molecule/api-emails-mailgun',
  '@molecule/api-logger',
  '@molecule/api-middleware-body-parser',
  '@molecule/api-middleware-cookie-parser',
  '@molecule/api-middleware-cors',
  '@molecule/api-oauth',
  '@molecule/api-oauth-github',
  '@molecule/api-oauth-gitlab',
  '@molecule/api-oauth-google',
  '@molecule/api-oauth-twitter',
  '@molecule/api-payments',
  '@molecule/api-payments-apple',
  '@molecule/api-payments-google',
  '@molecule/api-payments-stripe',
  '@molecule/api-push-notifications',
  '@molecule/api-resource',
  '@molecule/api-resource-device',
  '@molecule/api-resource-payment',
  '@molecule/api-resource-user',
  '@molecule/api-uploads',
  '@molecule/api-jwt',
  '@molecule/api-jwt-jsonwebtoken',
  '@molecule/api-password',
  '@molecule/api-password-bcrypt',
  '@molecule/api-two-factor',
  '@molecule/api-two-factor-otplib',
  '@molecule/api-utilities-validation',
]

/**
 * Recursively find all @molecule/* packages in a directory.
 * Returns a map of package name → absolute path.
 */
async function findPackages(dir: string, depth = 0): Promise<Map<string, string>> {
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
        const sub = await findPackages(join(dir, entry.name), depth + 1)
        for (const [name, path] of sub) packages.set(name, path)
      }
    }
  } catch (_error) {
    // best-effort traversal: skip directories that are unreadable, missing, or
    // contain unparseable package.json — the caller falls back to an empty map
  }

  return packages
}

/**
 * Create a temporary test project with package.json, tsconfig.json,
 * and symlinks to all @molecule packages in node_modules.
 *
 * Returns the absolute path to the temp project directory.
 * Caller is responsible for cleanup via `rm(path, { recursive: true, force: true })`.
 */
export async function createTestProject(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'mlcl-test-project-'))

  // Write package.json
  await writeFile(
    join(dir, 'package.json'),
    JSON.stringify(
      {
        name: 'test-project',
        version: '1.0.0',
        private: true,
        type: 'module',
        dependencies: Object.fromEntries(TEST_MOLECULES.map((m) => [m, '^1.0.0'])),
      },
      null,
      2,
    ),
  )

  // Write tsconfig.json
  await writeFile(
    join(dir, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'Node16',
          moduleResolution: 'Node16',
          outDir: 'dist',
          rootDir: 'src',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
        },
        include: ['src'],
        exclude: ['node_modules', 'dist'],
      },
      null,
      2,
    ),
  )

  // Find all packages and create symlinks
  const packages = await findPackages(MOLECULE_PACKAGES)
  const moleculeDir = join(dir, 'node_modules', '@molecule')
  await mkdir(moleculeDir, { recursive: true })

  for (const mol of TEST_MOLECULES) {
    const pkgPath = packages.get(mol)
    if (pkgPath) {
      await symlink(pkgPath, join(moleculeDir, mol.replace('@molecule/', '')))
    }
  }

  return dir
}
